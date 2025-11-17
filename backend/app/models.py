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
