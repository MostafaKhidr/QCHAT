"""
Data module for Q-CHAT-10 questions and related data structures.

This module contains hard-coded question data that can be easily modified
without requiring database migrations.
"""
from .qchat_questions import QChatDatabase, QCHAT_QUESTIONS, get_question

__all__ = ["QChatDatabase", "QCHAT_QUESTIONS", "get_question"]
