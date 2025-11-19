"""Q-CHAT-10 FastAPI backend."""
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import (
    Answer,
    CreateSessionRequest,
    CreateSessionResponse,
    QuestionOption,
    QuestionResponse,
    ReportResponse,
    SessionResponse,
    SessionStatus,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from .data.qchat_questions import QCHAT_QUESTIONS, get_question
from .scoring import assess_risk, calculate_point, calculate_total_score, get_recommendations_bilingual
from .utils import (
    generate_session_token,
    load_session,
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
    if not session_exists(session_token):
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate question number
    if question_number < 1 or question_number > 10:
        raise HTTPException(status_code=400, detail="Question number must be between 1 and 10")

    # Get question data
    question_data = get_question(question_number)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")

    # Convert to response model
    options = [
        QuestionOption(
            value=opt["value"],
            label_en=opt["label_en"],
            label_ar=opt["label_ar"],
        )
        for opt in question_data["options"]
    ]

    return QuestionResponse(
        question_number=question_data["question_number"],
        text_en=question_data["text_en"],
        text_ar=question_data["text_ar"],
        options=options,
        video_positive=question_data.get("video_positive"),
        video_negative=question_data.get("video_negative"),
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
    if next_question <= 10:
        session_data["current_question"] = next_question
        session_data["status"] = SessionStatus.IN_PROGRESS.value
    else:
        session_data["current_question"] = 10
        session_data["status"] = SessionStatus.COMPLETED.value
        session_data["completed_at"] = datetime.utcnow()

    # Calculate current score
    current_score = calculate_total_score(session_data["answers"])

    # Save session
    save_session(session_token, session_data)

    # Prepare response
    is_complete = len(session_data["answers"]) >= 10
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.port)
