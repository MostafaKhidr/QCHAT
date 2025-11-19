"""
Helper functions for workflow operations.

Functions to extract information from conversation, collect session data,
and format messages for workflow processing.
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

# Add project root to Python path
_project_root = Path(__file__).parent.parent.resolve()  # Project root
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ..chains.base import get_json_llm
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage


class ExtractedInfo(BaseModel):
    """Extracted information from conversation."""
    parent_name: Optional[str] = Field(None, description="Extracted parent/guardian name")
    child_name: Optional[str] = Field(None, description="Extracted child name")
    child_age: Optional[str] = Field(None, description="Extracted child age in months")
    language: Optional[str] = Field(None, description="Detected language preference: 'en' or 'ar'")


EXTRACT_INFO_PROMPT_EN = """Analyze the conversation history and extract any information about:
1. Parent/guardian name
2. Child's name
3. Child's age (in months or years)
4. Language preference (if user is writing in Arabic, return "ar", if English return "en")

Conversation history:
{conversation_history}

User's latest message: "{user_input}"

Extract any of this information if it's mentioned in the conversation. Return null for any information not found.

Respond with JSON containing: parent_name, child_name, child_age, and language.
"""

EXTRACT_INFO_PROMPT_AR = """حلل سجل المحادثة واستخرج أي معلومات حول:
1. اسم الوالد/الوصي
2. اسم الطفل
3. عمر الطفل (بالشهور أو السنوات)
4. تفضيل اللغة (إذا كان المستخدم يكتب بالعربية، أرجع "ar"، إذا كان بالإنجليزية أرجع "en")

سجل المحادثة:
{conversation_history}

آخر رسالة للمستخدم: "{user_input}"

استخرج أي من هذه المعلومات إذا تم ذكرها في المحادثة. أرجع null لأي معلومات غير موجودة.

أرجع JSON يحتوي على: parent_name، child_name، child_age، و language.
"""


def format_conversation_history(history: list) -> str:
    """Format conversation history for prompts."""
    if not history:
        return "No previous messages."
    
    formatted = []
    for msg in history[-10:]:  # Last 10 messages
        # Handle LangChain message objects
        if isinstance(msg, (HumanMessage, AIMessage)):
            if isinstance(msg, HumanMessage):
                role_display = "User"
            else:  # AIMessage
                role_display = "Assistant"
            content = msg.content if hasattr(msg, 'content') else str(msg)
        elif isinstance(msg, dict):
            # Handle dict format for backward compatibility
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            role_display = "Assistant" if role == "assistant" else "User" if role == "user" else role
        else:
            # Handle other message types
            msg_type = type(msg).__name__.lower()
            if "ai" in msg_type or "assistant" in msg_type:
                role_display = "Assistant"
            elif "human" in msg_type or "user" in msg_type:
                role_display = "User"
            else:
                role_display = "Unknown"
            content = getattr(msg, "content", str(msg))
            if not isinstance(content, str):
                content = str(content)
        
        formatted.append(f"{role_display}: {content}")
    
    return "\n".join(formatted) if formatted else "No previous messages."


def extract_names_and_language(
    conversation_history: list,
    user_input: str,
    language: str = "en"
) -> Dict[str, Optional[str]]:
    """
    Try to extract parent name, child name, age, and language from conversation.
    
    Args:
        conversation_history: List of conversation messages
        user_input: Latest user input
        language: Current language setting
        
    Returns:
        Dictionary with parent_name, child_name, child_age, language (or None if not found)
    """
    try:
        llm = get_json_llm()
        parser = PydanticOutputParser(pydantic_object=ExtractedInfo)
        
        prompt_template = EXTRACT_INFO_PROMPT_AR if language == "ar" else EXTRACT_INFO_PROMPT_EN
        prompt = ChatPromptTemplate.from_template(prompt_template + "\n\n{format_instructions}")
        
        formatted_history = format_conversation_history(conversation_history)
        format_instructions = parser.get_format_instructions()
        
        chain = prompt | llm | parser
        result = chain.invoke({
            "conversation_history": formatted_history,
            "user_input": user_input,
            "format_instructions": format_instructions,
        })
        
        # Detect language from user input if not already set
        detected_lang = result.language
        if not detected_lang:
            # Simple heuristic: check for Arabic characters
            arabic_chars = any('\u0600' <= char <= '\u06FF' for char in user_input)
            detected_lang = "ar" if arabic_chars else "en"
        else:
            detected_lang = detected_lang.lower()
            if detected_lang not in ["en", "ar"]:
                detected_lang = "en"
        
        return {
            "parent_name": result.parent_name,
            "child_name": result.child_name,
            "child_age": result.child_age,
            "language": detected_lang
        }
        
    except Exception as e:
        print(f"Error extracting info: {e}")
        # Fallback: simple language detection
        arabic_chars = any('\u0600' <= char <= '\u06FF' for char in user_input)
        detected_lang = "ar" if arabic_chars else "en"
        
        return {
            "parent_name": None,
            "child_name": None,
            "child_age": None,
            "language": detected_lang
        }


def collect_missing_session_info(
    state: Dict[str, Any],
    language: str = "en"
) -> Dict[str, str]:
    """
    Determine what information needs to be collected from the user.
    
    Args:
        state: Current workflow state
        language: Language preference
        
    Returns:
        Dictionary with messages to ask for missing information
    """
    missing_info = []
    
    if not state.get("parent_name"):
        missing_info.append("parent_name")
    if not state.get("child_name"):
        missing_info.append("child_name")
    if not state.get("language"):
        missing_info.append("language")
    
    if language == "ar":
        messages = {
            "parent_name": "ما هو اسمك؟ (الوالد/الوصي)",
            "child_name": "ما هو اسم طفلك؟",
            "language": "ما هي اللغة المفضلة لديك؟ (English/العربية)"
        }
        intro = "قبل أن نبدأ، أحتاج إلى بعض المعلومات:"
    else:
        messages = {
            "parent_name": "What is your name? (Parent/Guardian)",
            "child_name": "What is your child's name?",
            "language": "What is your preferred language? (English/العربية)"
        }
        intro = "Before we begin, I need a few pieces of information:"
    
    if not missing_info:
        return {}
    
    # Return the first missing piece to ask for
    first_missing = missing_info[0]
    return {
        "needs_info": True,
        "info_type": first_missing,
        "question": messages[first_missing],
        "intro": intro,
        "all_missing": missing_info
    }


def calculate_score(all_answers: List[Dict], questions_db) -> int:
    """
    Calculate M-CHAT-R score based on answers.
    
    Args:
        all_answers: List of answer dicts with keys: question_number, answer, confidence
        questions_db: MChatRDatabase instance to get question metadata
    
    Returns:
        Score (0-20 range)
    """
    score = 0
    for answer in all_answers:
        q_num = answer.get("question_number", 0)
        answer_value = answer.get("answer", "")
        
        # Only count yes/no answers, skip unanswered/unclear
        if answer_value not in ["yes", "no"]:
            continue
        
        # Get question metadata
        question_data = questions_db.get_question(q_num)
        if not question_data:
            continue
        
        # Get reverse_scored flag from parent question structure
        question_key = f"question_{q_num}"
        questions_data = questions_db.questions.get("m_chat_questions", {})
        if question_key in questions_data:
            reverse_scored = questions_data[question_key].get("reverse_scored", False)
        else:
            reverse_scored = False
        
        # Count "yes" as 1 point, "no" as 0 points (unless reverse_scored)
        if answer_value == "yes":
            score += 1 if not reverse_scored else 0
        elif answer_value == "no":
            score += 1 if reverse_scored else 0
        # "unanswered" and other values count as 0
    
    return score

