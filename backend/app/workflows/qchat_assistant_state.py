"""
QCHAT Assistant State - State definition for per-question AI assistant workflow.

This module defines a simplified state structure for the QCHAT assistant that helps
users answer a single question through conversational interaction.
"""
from typing import TypedDict, List, Optional, Literal


class QChatAssistantState(TypedDict, total=False):
    """
    State structure for QCHAT assistant workflow.

    This state tracks conversation for a SINGLE question only.
    The assistant helps clarify the question and extract the answer (A-E option).

    State is reset when moving to a new question (no cross-question memory).
    """
    # Session context
    session_token: str  # Session identifier for JSON storage
    current_question_number: int  # Which question we're assisting with (1-10)
    language: Literal["en", "ar"]  # User's language preference

    # Question context
    question_text: str  # The actual question text
    options: List[dict]  # List of options (A-E) with labels and examples

    # Conversation tracking (per-question only)
    conversation_history: List[dict]  # Message history for CURRENT question only
    current_message: str  # Latest user input
    bot_response: str  # Latest bot response

    # Intent and emotion
    last_intent: Optional[str]  # Last detected intent (answering, clarification, asking_question, off_topic)
    last_emotion: Optional[str]  # Last detected emotion (neutral, confused, stressed, etc.)

    # Answer extraction (A-E options)
    extracted_option: Optional[Literal["A", "B", "C", "D", "E", "unclear"]]  # Extracted option from conversation
    extraction_confidence: float  # Confidence level (0.0-1.0)
    extraction_reasoning: Optional[str]  # Why this option was selected

    # Workflow control
    is_answer_complete: bool  # Whether we've successfully extracted an answer
    chat_id: Optional[str]  # Unique chat session ID for this question
    next_question_number: Optional[int]  # Next question to move to (if answer complete)

    # Metadata
    parent_name: Optional[str]  # Parent's name (for personalization)
    child_name: Optional[str]  # Child's name (for personalization)
