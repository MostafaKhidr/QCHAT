"""Utility functions for Q-CHAT backend."""
import json
import os
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import settings


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
