"""Utility functions for Q-CHAT backend."""
import json
import os
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

from ..config import settings


def generate_session_token() -> str:
    """Generate a unique session token."""
    return secrets.token_urlsafe(32)


def get_session_file_path(session_token: str) -> Path:
    """Get the file path for a session JSON file."""
    storage_path = Path(settings.data_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)
    return storage_path / f"{session_token}.json"


def save_session(session_token: str, session_data: dict) -> None:
    """
    Save session data to JSON file.

    Args:
        session_token: Unique session token
        session_data: Session data dictionary
    """
    file_path = get_session_file_path(session_token)

    # Convert datetime objects to ISO format strings
    data_to_save = _prepare_for_json(session_data)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data_to_save, f, ensure_ascii=False, indent=2)


def load_session(session_token: str) -> dict | None:
    """
    Load session data from JSON file.

    Args:
        session_token: Unique session token

    Returns:
        dict | None: Session data or None if not found
    """
    file_path = get_session_file_path(session_token)

    if not file_path.exists():
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Convert ISO format strings back to datetime objects
    return _parse_from_json(data)


def session_exists(session_token: str) -> bool:
    """Check if a session exists."""
    file_path = get_session_file_path(session_token)
    return file_path.exists()


def _prepare_for_json(data: Any) -> Any:
    """Recursively convert datetime objects to ISO format strings."""
    if isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {key: _prepare_for_json(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_prepare_for_json(item) for item in data]
    else:
        return data


def _parse_from_json(data: Any) -> Any:
    """Recursively convert ISO format strings to datetime objects."""
    if isinstance(data, str):
        # Try to parse as datetime
        try:
            return datetime.fromisoformat(data)
        except (ValueError, AttributeError):
            return data
    elif isinstance(data, dict):
        # Special handling for known datetime fields
        result = {}
        for key, value in data.items():
            if key in ["created_at", "completed_at", "answered_at"]:
                try:
                    result[key] = datetime.fromisoformat(value) if value else None
                except (ValueError, AttributeError, TypeError):
                    result[key] = value
            else:
                result[key] = _parse_from_json(value)
        return result
    elif isinstance(data, list):
        return [_parse_from_json(item) for item in data]
    else:
        return data


def list_all_sessions() -> list[str]:
    """List all session tokens."""
    storage_path = Path(settings.data_storage_path)
    if not storage_path.exists():
        return []

    return [
        f.stem for f in storage_path.glob("*.json")
    ]


# ============================================================================
# CHAT ASSISTANT HELPER FUNCTIONS
# ============================================================================

def save_chat_message(session_token: str, role: str, content: str) -> None:
    """
    Append a message to the chat state in the session JSON.

    Args:
        session_token: Session identifier
        role: Message role ('user' or 'assistant')
        content: Message content text
    """
    session_data = load_session(session_token)
    if not session_data:
        raise ValueError(f"Session {session_token} not found")

    # Initialize chat_state if not exists
    if "chat_state" not in session_data:
        session_data["chat_state"] = {
            "active_question": None,
            "chat_id": None,
            "messages": [],
            "extracted_option": None,
            "last_updated": datetime.now().isoformat()
        }

    # Append message
    session_data["chat_state"]["messages"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })

    # Update last_updated
    session_data["chat_state"]["last_updated"] = datetime.now().isoformat()

    # Save back to file
    save_session(session_token, session_data)


def load_chat_state(session_token: str, question_number: int) -> dict | None:
    """
    Load chat state for a specific question.

    Args:
        session_token: Session identifier
        question_number: Question number (1-10)

    Returns:
        dict | None: Chat state or None if not found
    """
    session_data = load_session(session_token)
    if not session_data:
        return None

    chat_state = session_data.get("chat_state")
    if not chat_state:
        return None

    # Check if chat is for the same question
    if chat_state.get("active_question") == question_number:
        return chat_state

    return None


def initialize_chat_state(session_token: str, question_number: int, chat_id: str) -> dict:
    """
    Initialize or reset chat state for a question.

    Args:
        session_token: Session identifier
        question_number: Question number (1-10)
        chat_id: Unique chat session ID

    Returns:
        dict: Initialized chat state
    """
    session_data = load_session(session_token)
    if not session_data:
        raise ValueError(f"Session {session_token} not found")

    # Create fresh chat state
    chat_state = {
        "active_question": question_number,
        "chat_id": chat_id,
        "messages": [],
        "extracted_option": None,
        "extraction_confidence": None,
        "extraction_reasoning": None,
        "last_updated": datetime.now().isoformat()
    }

    session_data["chat_state"] = chat_state
    save_session(session_token, session_data)

    return chat_state


def clear_chat_state(session_token: str) -> None:
    """
    Clear chat state from session (mark as inactive).

    Args:
        session_token: Session identifier
    """
    session_data = load_session(session_token)
    if not session_data:
        return

    # Set chat_state to None or empty dict to mark as inactive
    session_data["chat_state"] = None
    save_session(session_token, session_data)


def save_chat_answer(
    session_token: str,
    question_number: int,
    option: str,
    confidence: float,
    source: str = "chat"
) -> None:
    """
    Save extracted answer from chat to the session answers array.

    Args:
        session_token: Session identifier
        question_number: Question number (1-10)
        option: Selected option (A-E)
        confidence: Confidence score (0.0-1.0)
        source: Answer source ('chat' or 'ui')
    """
    session_data = load_session(session_token)
    if not session_data:
        raise ValueError(f"Session {session_token} not found")

    # Initialize answers array if needed
    if "answers" not in session_data:
        session_data["answers"] = []

    # Check if answer already exists for this question
    existing_answer_idx = next(
        (i for i, a in enumerate(session_data["answers"]) if a.get("question_number") == question_number),
        None
    )

    answer_data = {
        "question_number": question_number,
        "selected_option": option,
        "source": source,
        "confidence": confidence,
        "answered_at": datetime.now().isoformat()
    }

    if existing_answer_idx is not None:
        # Replace existing answer
        session_data["answers"][existing_answer_idx] = answer_data
    else:
        # Add new answer
        session_data["answers"].append(answer_data)

    # Also update chat_state if it exists
    if session_data.get("chat_state"):
        session_data["chat_state"]["extracted_option"] = option
        session_data["chat_state"]["extraction_confidence"] = confidence

    save_session(session_token, session_data)


def get_chat_messages(session_token: str, question_number: int) -> list[dict]:
    """
    Get chat messages for a specific question.

    Args:
        session_token: Session identifier
        question_number: Question number (1-10)

    Returns:
        list[dict]: List of messages with 'role', 'content', 'timestamp'
    """
    chat_state = load_chat_state(session_token, question_number)
    if not chat_state:
        return []

    return chat_state.get("messages", [])
