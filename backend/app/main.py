"""Q-CHAT-10 FastAPI backend."""
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .config import settings
from .models import (
    Answer,
    AnswerOption,
    ChatMessage,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatStartRequest,
    ChatStartResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    QuestionOption,
    QuestionResponse,
    ReportResponse,
    SessionResponse,
    SessionStatus,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SynthesizeSpeechRequest,
)
from .data.qchat_questions import QCHAT_QUESTIONS, get_question
from .scoring import assess_risk, calculate_point, calculate_total_score, get_recommendations_bilingual
from .services.speech_service import speech_service
from .utils import (
    clear_chat_state,
    generate_session_token,
    get_chat_messages,
    initialize_chat_state,
    load_chat_state,
    load_session,
    save_chat_answer,
    save_chat_message,
    save_session,
    session_exists,
)

app = FastAPI(
    title="Q-CHAT-10 API",
    description="Quantitative Checklist for Autism in Toddlers API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Root endpoint."""
    return {
        "message": "Q-CHAT-10 API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/sessions/create", response_model=CreateSessionResponse)
def create_session(request: CreateSessionRequest):
    """Create a new Q-CHAT session."""
    session_token = generate_session_token()

    session_data = {
        "session_token": session_token,
        "child_name": request.child_name,
        "child_age_months": request.child_age_months,
        "parent_name": request.parent_name,
        "language": request.language.value,
        "status": SessionStatus.CREATED.value,
        "current_question": 1,
        "total_questions": 10,
        "answers": [],
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }

    save_session(session_token, session_data)

    return CreateSessionResponse(
        session_token=session_token,
        child_name=request.child_name,
        child_age_months=request.child_age_months,
        created_at=session_data["created_at"],
    )


@app.get("/api/sessions/{session_token}", response_model=SessionResponse)
def get_session(session_token: str):
    """Get session details."""
    session_data = load_session(session_token)

    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Convert answers to Answer models
    answers = [
        Answer(
            question_number=ans["question_number"],
            selected_option=ans["selected_option"],
            option_label=ans["option_label"],
            scored_point=ans["scored_point"],
            answered_at=ans["answered_at"],
        )
        for ans in session_data.get("answers", [])
    ]

    return SessionResponse(
        session_token=session_data["session_token"],
        child_name=session_data["child_name"],
        child_age_months=session_data["child_age_months"],
        parent_name=session_data.get("parent_name"),
        language=session_data["language"],
        status=SessionStatus(session_data["status"]),
        current_question=session_data["current_question"],
        total_questions=session_data.get("total_questions", 10),
        answers=answers,
        created_at=session_data["created_at"],
        completed_at=session_data.get("completed_at"),
    )


@app.get("/api/sessions/{session_token}/question/{question_number}", response_model=QuestionResponse)
def get_question_endpoint(session_token: str, question_number: int):
    """Get a specific question."""
    # Validate session exists
    session_data = load_session(session_token)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate question number
    if question_number < 1 or question_number > 10:
        raise HTTPException(status_code=400, detail="Question number must be between 1 and 10")

    # Get question data
    question_data = get_question(question_number)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")

    # Get session language
    language = session_data.get("language", "en")

    # Convert to response model
    options = [
        QuestionOption(
            value=opt["value"],
            label_en=opt["label_en"],
            label_ar=opt["label_ar"],
        )
        for opt in question_data["options"]
    ]

    # Get base video URLs
    video_positive = question_data.get("video_positive")
    video_negative = question_data.get("video_negative")

    # Modify video URLs based on language
    # For Arabic: use positive_ar.mp4, for English: use positive.mp4
    if video_positive:
        if language == "ar":
            # Replace positive.mp4 with positive_ar.mp4
            if video_positive.endswith("positive.mp4"):
                video_positive = video_positive.replace("positive.mp4", "positive_ar.mp4")
        else:
            # For English, ensure we use positive.mp4 (not positive_ar.mp4)
            if video_positive.endswith("positive_ar.mp4"):
                video_positive = video_positive.replace("positive_ar.mp4", "positive.mp4")

    if video_negative:
        if language == "ar":
            # Replace negative.mp4 with negative_ar.mp4 (if you have negative_ar videos)
            if video_negative.endswith("negative.mp4"):
                video_negative = video_negative.replace("negative.mp4", "negative_ar.mp4")
        else:
            # For English, ensure we use negative.mp4
            if video_negative.endswith("negative_ar.mp4"):
                video_negative = video_negative.replace("negative_ar.mp4", "negative.mp4")

    return QuestionResponse(
        question_number=question_data["question_number"],
        text_en=question_data["text_en"],
        text_ar=question_data["text_ar"],
        options=options,
        video_positive=video_positive,
        video_negative=video_negative,
    )


@app.post("/api/sessions/{session_token}/answer", response_model=SubmitAnswerResponse)
def submit_answer(session_token: str, request: SubmitAnswerRequest):
    """Submit an answer to a question."""
    session_data = load_session(session_token)

    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if session is already completed
    if session_data["status"] == SessionStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Session already completed")

    # Validate question number
    if request.question_number < 1 or request.question_number > 10:
        raise HTTPException(status_code=400, detail="Question number must be between 1 and 10")

    # Get question data to get the option label
    question_data = get_question(request.question_number)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")

    # Find the option label
    option_label = None
    language = session_data.get("language", "en")
    for opt in question_data["options"]:
        if opt["value"] == request.selected_option.value:
            option_label = opt[f"label_{language}"]
            break

    if not option_label:
        raise HTTPException(status_code=400, detail="Invalid option")

    # Calculate if this answer scores a point
    scored_point = calculate_point(request.question_number, request.selected_option.value)

    # Create answer record
    answer = {
        "question_number": request.question_number,
        "selected_option": request.selected_option.value,
        "option_label": option_label,
        "scored_point": scored_point,
        "answered_at": datetime.utcnow(),
    }

    # Check if question already answered - if so, update it; otherwise append
    existing_answers = session_data.get("answers", [])
    answer_index = next(
        (i for i, ans in enumerate(existing_answers) if ans["question_number"] == request.question_number),
        None
    )

    if answer_index is not None:
        # Update existing answer
        session_data["answers"][answer_index] = answer
    else:
        # Add new answer
        session_data["answers"].append(answer)

    # Update current question
    next_question = request.question_number + 1
    
    # Check if all questions have been attempted (answered or unanswered)
    answered_questions = set(ans.get("question_number") for ans in session_data.get("answers", []))
    unanswered_questions = set(session_data.get("unanswered_questions", []))
    all_attempted = answered_questions.union(unanswered_questions)
    
    # Add current question to answered set
    all_attempted.add(request.question_number)
    
    if next_question <= 10:
        session_data["current_question"] = next_question
        session_data["status"] = SessionStatus.IN_PROGRESS.value
    else:
        # Last question answered
        session_data["current_question"] = 10
        # Check if all 10 questions have been attempted
        if len(all_attempted) >= 10:
            session_data["status"] = SessionStatus.COMPLETED.value
            session_data["completed_at"] = datetime.utcnow()
        else:
            session_data["status"] = SessionStatus.IN_PROGRESS.value

    # Calculate current score (unanswered questions are excluded automatically)
    current_score = calculate_total_score(session_data["answers"])

    # Save session
    save_session(session_token, session_data)

    # Prepare response - check if all questions attempted
    is_complete = len(all_attempted) >= 10
    next_question_number = None if is_complete else next_question

    return SubmitAnswerResponse(
        accepted=True,
        next_question_number=next_question_number,
        is_complete=is_complete,
        current_score=current_score,
    )


@app.get("/api/sessions/{session_token}/report", response_model=ReportResponse)
def get_report(session_token: str):
    """Get the screening report for a completed session."""
    session_data = load_session(session_token)

    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if session is completed
    if session_data["status"] != SessionStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Session not completed yet")

    # Calculate total score
    total_score = calculate_total_score(session_data["answers"])

    # Get risk assessment
    risk_assessment = assess_risk(total_score)

    # Get recommendations in the session language
    language = session_data.get("language", "en")
    bilingual_recs = get_recommendations_bilingual()
    risk_level = risk_assessment["risk_level"]
    recommendations = bilingual_recs.get(language, bilingual_recs["en"])[risk_level]

    # Convert answers to Answer models
    answers = []
    for ans in session_data["answers"]:
        # Get question text for this answer
        question_data = get_question(ans["question_number"])
        question_text_en = question_data["text_en"] if question_data else ""
        question_text_ar = question_data["text_ar"] if question_data else ""
        
        answers.append(
            Answer(
                question_number=ans["question_number"],
                selected_option=ans["selected_option"],
                option_label=ans["option_label"],
                scored_point=ans["scored_point"],
                answered_at=ans["answered_at"],
                question_text_en=question_text_en,
                question_text_ar=question_text_ar,
            )
        )

    return ReportResponse(
        session_token=session_data["session_token"],
        child_name=session_data["child_name"],
        child_age_months=session_data["child_age_months"],
        parent_name=session_data.get("parent_name"),
        total_score=total_score,
        max_score=10,
        recommend_referral=risk_assessment["recommend_referral"],
        risk_level=risk_assessment["risk_level"],
        answers=answers,
        recommendations=recommendations,
        completed_at=session_data["completed_at"],
    )


@app.get("/api/questions", response_model=list[QuestionResponse])
def get_all_questions():
    """Get all Q-CHAT questions."""
    questions = []
    for q_data in QCHAT_QUESTIONS:
        options = [
            QuestionOption(
                value=opt["value"],
                label_en=opt["label_en"],
                label_ar=opt["label_ar"],
            )
            for opt in q_data["options"]
        ]

        questions.append(
            QuestionResponse(
                question_number=q_data["question_number"],
                text_en=q_data["text_en"],
                text_ar=q_data["text_ar"],
                options=options,
                video_positive=q_data.get("video_positive"),
                video_negative=q_data.get("video_negative"),
            )
        )

    return questions


# ============================================================================
# CHAT ASSISTANT ENDPOINTS
# ============================================================================

@app.post("/api/qchat/sessions/{session_token}/chat/start", response_model=ChatStartResponse)
def start_chat(session_token: str, request: ChatStartRequest):
    """
    Start a chat session for a specific question.

    If chat already exists for this question, returns existing messages.
    Otherwise, initializes new chat and returns welcome message.
    """
    # Validate session exists
    session_data = load_session(session_token)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate question number
    if request.question_number < 1 or request.question_number > 10:
        raise HTTPException(status_code=400, detail="Question number must be between 1 and 10")

    # Get question data
    question_data = get_question(request.question_number)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if chat already exists for this question
    existing_chat = load_chat_state(session_token, request.question_number)

    if existing_chat and existing_chat.get("active_question") == request.question_number:
        # Chat exists - return existing messages
        messages = existing_chat.get("messages", [])
        chat_messages = [
            ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
            )
            for msg in messages
        ]

        # Get last message as welcome (should be assistant message)
        welcome_msg = messages[-1]["content"] if messages else "Welcome back!"

        return ChatStartResponse(
            message=welcome_msg,
            chat_id=existing_chat.get("chat_id", ""),
            existing_messages=chat_messages
        )

    # Initialize new chat
    import uuid
    chat_id = str(uuid.uuid4())

    initialize_chat_state(session_token, request.question_number, chat_id)

    # Generate welcome message using the workflow
    from .workflows.qchat_assistant_graph import create_qchat_assistant_graph
    from .data.qchat_questions import QChatDatabase

    # Get question text in appropriate language
    lang_key = "arabic" if request.language.value == "ar" else "english"
    qchat_db = QChatDatabase()
    q_data = qchat_db.get_question(request.question_number, lang_key)

    question_text = ""
    options_list = []
    if q_data:
        question_text = q_data.get("conversational", q_data.get("formal", ""))
        # Format options for state
        q_options = q_data.get("options", [])
        for opt in q_options:
            options_list.append({
                "value": opt["value"],
                "label": opt["label"],
                "example": q_data.get("examples", {}).get(opt["value"], [""])[0] if q_data.get("examples") else ""
            })

    # Initialize workflow
    graph = create_qchat_assistant_graph()

    # Initial state
    initial_state = {
        "session_token": session_token,
        "current_question_number": request.question_number,
        "language": request.language.value,
        "question_text": question_text,
        "options": options_list,
        "parent_name": session_data.get("parent_name", ""),
        "child_name": session_data.get("child_name", ""),
        "chat_id": chat_id
    }

    # Invoke workflow to get welcome message (just first node)
    config = {"configurable": {"thread_id": chat_id}}
    result = graph.invoke(initial_state, config)

    welcome_message = result.get("bot_response", "Hello! How can I help you with this question?")

    # Save welcome message to session
    save_chat_message(session_token, "assistant", welcome_message)

    return ChatStartResponse(
        message=welcome_message,
        chat_id=chat_id,
        existing_messages=[
            ChatMessage(
                role="assistant",
                content=welcome_message,
                timestamp=datetime.utcnow().isoformat()
            )
        ]
    )


@app.post("/api/qchat/sessions/{session_token}/chat/message", response_model=ChatMessageResponse)
def send_chat_message(session_token: str, request: ChatMessageRequest):
    """
    Send a message to the chat assistant and get a response.

    If the assistant extracts an answer (A-E option), it returns that in the response.
    """
    # Validate session exists
    session_data = load_session(session_token)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load chat state
    chat_state = session_data.get("chat_state")
    if not chat_state or chat_state.get("chat_id") != request.chat_id:
        raise HTTPException(status_code=404, detail="Chat session not found")

    question_number = chat_state.get("active_question")
    if not question_number:
        raise HTTPException(status_code=400, detail="No active question in chat")

    # Save user message
    save_chat_message(session_token, "user", request.message)

    # Use the graph workflow to process the message
    from .workflows.qchat_assistant_graph import create_qchat_assistant_graph
    from .data.qchat_questions import QChatDatabase

    # Get question data
    language = session_data.get("language", "en")
    lang_key = "arabic" if language == "ar" else "english"
    qchat_db = QChatDatabase()
    q_data = qchat_db.get_question(question_number, lang_key)

    question_text = ""
    options_list = []
    if q_data:
        question_text = q_data.get("conversational", q_data.get("formal", ""))
        q_options = q_data.get("options", [])
        for opt in q_options:
            options_list.append({
                "value": opt["value"],
                "label": opt["label"],
                "example": q_data.get("examples", {}).get(opt["value"], [""])[0] if q_data.get("examples") else ""
            })

    # Get conversation history from session
    messages = get_chat_messages(session_token, question_number)
    # Convert messages to conversation history format
    conversation_history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in messages
    ]

    # Initialize workflow
    graph = create_qchat_assistant_graph()

    # Get attempt_count from chat_state if it exists
    attempt_count = chat_state.get("attempt_count", 0)
    print(f"📊 [MAIN] Loading attempt_count from chat_state: {attempt_count}")
    
    # Prepare state with current message and conversation history
    current_state = {
        "session_token": session_token,
        "current_question_number": question_number,
        "language": language,
        "question_text": question_text,
        "options": options_list,
        "parent_name": session_data.get("parent_name", ""),
        "child_name": session_data.get("child_name", ""),
        "chat_id": request.chat_id,
        "current_message": request.message,  # Set the user's message
        "conversation_history": conversation_history,  # Include existing conversation
        "attempt_count": attempt_count  # Preserve attempt count
    }

    # Invoke workflow to process the message
    config = {
        "configurable": {
            "thread_id": request.chat_id
        },
        "recursion_limit": 15
    }
    
    result = graph.invoke(current_state, config)

    # Get bot response from result
    bot_response = result.get("bot_response", "")
    extracted_option = result.get("extracted_option")
    is_complete = result.get("is_answer_complete", False)
    confidence = result.get("extraction_confidence", 0.0)
    result_attempt_count = result.get("attempt_count", 0)
    result_next_q = result.get("next_question_number")

    # Update attempt_count in chat_state
    session_data = load_session(session_token)
    if session_data and session_data.get("chat_state"):
        session_data["chat_state"]["attempt_count"] = result_attempt_count
        print(f"📊 [MAIN] Saving attempt_count to chat_state: {result_attempt_count}")
        save_session(session_token, session_data)

    # Save bot response to session
    if bot_response:
        save_chat_message(session_token, "assistant", bot_response)

    # If answer extracted (valid A-E), return it but DON'T save yet - wait for user to confirm on Q page
    # The answer will be saved when user explicitly submits it via submit_answer endpoint
    if is_complete and extracted_option and extracted_option in ["A", "B", "C", "D", "E"]:
        # Don't save answer automatically - just return it for user to review and confirm on Q page
        # next_q will be calculated when user submits the answer
        next_q = None
    elif is_complete and extracted_option == "unanswered":
        # Question is unanswered after max attempts - don't save answer, but track it and move to next question
        # Use next_question_number from result if available, but ensure it's valid (1-10 or None)
        if result_next_q and 1 <= result_next_q <= 10:
            next_q = result_next_q
        elif question_number < 10:
            next_q = question_number + 1
        else:
            next_q = None
        
        # Track unanswered question in session (for completion tracking, but don't include in scoring)
        session_data = load_session(session_token)
        if session_data:
            # Initialize unanswered_questions list if it doesn't exist
            if "unanswered_questions" not in session_data:
                session_data["unanswered_questions"] = []
            
            # Add this question to unanswered list if not already there
            if question_number not in session_data["unanswered_questions"]:
                session_data["unanswered_questions"].append(question_number)
            
            # Check if all 10 questions have been attempted (answered or unanswered)
            answered_questions = set(ans.get("question_number") for ans in session_data.get("answers", []))
            unanswered_questions = set(session_data.get("unanswered_questions", []))
            all_attempted = answered_questions.union(unanswered_questions)
            
            # If all 10 questions have been attempted, mark session as completed
            if len(all_attempted) >= 10 or question_number >= 10:
                session_data["status"] = SessionStatus.COMPLETED.value
                session_data["completed_at"] = datetime.utcnow()
                next_q = None  # Ensure next_q is None when session is completed
            else:
                # Update current_question to next question
                if next_q:
                    session_data["current_question"] = next_q
            
            save_session(session_token, session_data)
    else:
        next_q = None

    # Convert extracted_option to AnswerOption enum if it's a valid value
    extracted_option_enum = None
    if is_complete and extracted_option:
        if extracted_option in ["A", "B", "C", "D", "E", "unanswered"]:
            try:
                extracted_option_enum = AnswerOption(extracted_option)
            except ValueError:
                # If it's not a valid enum value, set to None
                extracted_option_enum = None
    
    # Final validation: ensure next_question_number is never > 10
    if next_q and next_q > 10:
        print(f"⚠️ [MAIN] Warning: next_question_number was {next_q}, setting to None")
        next_q = None
        # Mark session as completed if we somehow got an invalid next question
        session_data = load_session(session_token)
        if session_data:
            session_data["status"] = SessionStatus.COMPLETED.value
            session_data["completed_at"] = datetime.utcnow()
            save_session(session_token, session_data)
    
    return ChatMessageResponse(
        message=bot_response,
        extracted_option=extracted_option_enum,
        is_complete=is_complete,
        next_question_number=next_q,
        confidence=confidence if is_complete else None
    )


@app.delete("/api/qchat/sessions/{session_token}/chat")
def close_chat(session_token: str):
    """Close/clear the current chat session."""
    # Validate session exists
    if not session_exists(session_token):
        raise HTTPException(status_code=404, detail="Session not found")

    # Clear chat state
    clear_chat_state(session_token)

    return {"message": "Chat session closed successfully"}


# ============================================================================
# SPEECH ENDPOINTS (TTS & ASR)
# ============================================================================

@app.post("/api/speech/synthesize")
async def synthesize_speech(request: SynthesizeSpeechRequest):
    """
    Synthesize speech from text using ElevenLabs TTS.
    
    Args:
        request: SynthesizeSpeechRequest with text and language
    
    Returns:
        Audio file in MP3 format
    """
    try:
        audio_bytes = await speech_service.synthesize_speech(request.text, request.language.value)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'attachment; filename="speech.mp3"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@app.post("/api/speech/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Query("en", description="Language code ('en' for English, 'ar' for Arabic)")
):
    """
    Transcribe audio to text using ElevenLabs ASR.
    
    Args:
        audio: Audio file (WAV, MP3, M4A, WEBM, OGG, FLAC, AAC, etc.)
        language: Language code ('en' for English, 'ar' for Arabic, or None for auto-detect)
    
    Returns:
        {
            "text": "transcribed text",
            "confidence": 0.95,
            "language": "ar",
            "success": True,
            "error": None
        }
    """
    if language not in ["en", "ar"]:
        language = "en"  # Default to English if invalid
    
    try:
        # Read audio file
        audio_data = await audio.read()
        
        if not audio_data:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        
        # Transcribe using speech service
        result = await speech_service.transcribe_audio(audio_data, language)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        return {
            "text": "",
            "confidence": 0.0,
            "language": language,
            "success": False,
            "error": f"Transcription error: {str(e)}"
        }


@app.get("/api/speech/status")
def get_speech_status():
    """Get status of speech services (TTS and ASR)."""
    return speech_service.get_service_status()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.port)
