"""Pydantic models for Q-CHAT API."""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AnswerOption(str, Enum):
    """Answer options for Q-CHAT questions."""

    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"


class SessionStatus(str, Enum):
    """Session status."""

    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Language(str, Enum):
    """Supported languages."""

    EN = "en"
    AR = "ar"


# Request Models


class CreateSessionRequest(BaseModel):
    """Request to create a new Q-CHAT session."""

    child_name: str = Field(..., min_length=1, max_length=255)
    child_age_months: int = Field(..., ge=18, le=24)
    parent_name: Optional[str] = Field(None, max_length=255)
    language: Language = Language.EN


class SubmitAnswerRequest(BaseModel):
    """Request to submit an answer to a question."""

    question_number: int = Field(..., ge=1, le=10)
    selected_option: AnswerOption
    source: str = "ui"  # 'ui' or 'chat' - where the answer came from
    confidence: Optional[float] = None  # Confidence if from chat extraction


# Response Models


class CreateSessionResponse(BaseModel):
    """Response after creating a session."""

    session_token: str
    child_name: str
    child_age_months: int
    created_at: datetime


class QuestionOption(BaseModel):
    """An option for a question."""

    value: str  # A, B, C, D, E
    label_en: str
    label_ar: str


class QuestionResponse(BaseModel):
    """Response with question details."""

    question_number: int
    text_en: str
    text_ar: str
    options: list[QuestionOption]
    video_positive: Optional[str] = None
    video_negative: Optional[str] = None


class Answer(BaseModel):
    """An answer to a question."""

    question_number: int
    selected_option: str  # A, B, C, D, E
    option_label: str
    scored_point: bool
    answered_at: datetime
    question_text_en: str
    question_text_ar: str


class SessionResponse(BaseModel):
    """Response with session details."""

    session_token: str
    child_name: str
    child_age_months: int
    parent_name: Optional[str]
    language: str
    status: SessionStatus
    current_question: int
    total_questions: int = 10
    answers: list[Answer]
    created_at: datetime
    completed_at: Optional[datetime] = None


class ReportResponse(BaseModel):
    """Response with screening report."""

    session_token: str
    child_name: str
    child_age_months: int
    parent_name: Optional[str]
    total_score: int
    max_score: int = 10
    recommend_referral: bool
    risk_level: str  # "low" or "high"
    answers: list[Answer]
    recommendations: list[str]
    completed_at: datetime


class SubmitAnswerResponse(BaseModel):
    """Response after submitting an answer."""

    accepted: bool
    next_question_number: Optional[int]
    is_complete: bool
    current_score: int


# ============================================================================
# CHAT ASSISTANT MODELS
# ============================================================================


class ChatStartRequest(BaseModel):
    """Request to start a chat session for a question."""

    question_number: int = Field(..., ge=1, le=10)
    language: Language = Language.EN


class ChatMessageRequest(BaseModel):
    """Request to send a message in the chat."""

    message: str = Field(..., min_length=1)
    chat_id: str


class ChatMessage(BaseModel):
    """A chat message."""

    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str  # ISO format datetime


class ChatStartResponse(BaseModel):
    """Response after starting a chat session."""

    message: str  # Welcome message from assistant
    chat_id: str
    existing_messages: list[ChatMessage] = []  # Previous messages if chat was reopened


class ChatMessageResponse(BaseModel):
    """Response after sending a chat message."""

    message: str  # Bot's response
    extracted_option: Optional[AnswerOption] = None  # If answer was extracted
    is_complete: bool = False  # True if answer successfully extracted
    next_question_number: Optional[int] = None  # Next question to move to
    confidence: Optional[float] = None  # Confidence of extraction (0.0-1.0)


# ============================================================================
# SPEECH MODELS
# ============================================================================


class SynthesizeSpeechRequest(BaseModel):
    """Request to synthesize speech from text."""

    text: str = Field(..., min_length=1, max_length=5000)
    language: Language = Language.EN
