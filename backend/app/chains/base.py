"""
Base LLM configuration and factory functions.
"""
import os
import sys
from pathlib import Path
from typing import Any
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel

# Add project root to Python path to enable absolute imports
_project_root = Path(__file__).parent.parent.resolve()  # Project root
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ..config import settings

# Configure LangSmith tracing if enabled and API key is provided
if settings.langsmith_tracing and settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    if settings.langsmith_project:
        os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project


def get_llm(temperature: float = 0.7, model: str = None) -> BaseChatModel:
    """
    Factory function to create LLM instance based on configuration.
    
    Args:
        temperature: Temperature parameter for generation (0.0-1.0)
        model: Optional model name override
        
    Returns:
        Configured LLM instance (OpenAI, Ollama, or Google Gemini)
    """
    if settings.llm_provider == "openai":
        return ChatOpenAI(
            model=model or "gpt-5-mini",
            temperature=temperature,
            api_key=settings.openai_api_key,
            reasoning_effort="minimal"
        )
    elif settings.llm_provider == "ollama":
        return ChatOllama(
            model=model or "gpt-oss-20b",
            temperature=temperature,
            base_url=settings.ollama_base_url,
        )
    elif settings.llm_provider == "gemini":
        # ChatGoogleGenerativeAI can use GOOGLE_API_KEY env var or google_api_key parameter
        kwargs = {
            "model": model or "gemini-pro",
            "temperature": temperature,
        }
        if settings.google_api_key:
            kwargs["google_api_key"] = settings.google_api_key
        return ChatGoogleGenerativeAI(**kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


def get_json_llm(model: str = None) -> BaseChatModel:
    """
    Get LLM configured for JSON output.
    
    Args:
        model: Optional model name override
        
    Returns:
        LLM instance optimized for structured JSON output
    """
    llm = get_llm(temperature=0.3, model=model)
    return llm


# Fallback responses when LLM is unavailable
FALLBACK_RESPONSES = {
    "en": {
        "error": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        "clarification": "Could you please rephrase your answer? I want to make sure I understand correctly.",
        "redirect": "Thank you for sharing. Let's focus on the current question about your child's development.",
        "exit": "Thank you for your time. Your progress has been saved. You can continue later.",
    },
    "ar": {
        "error": "أعتذر، أواجه صعوبات تقنية. يرجى المحاولة مرة أخرى بعد قليل.",
        "clarification": "هل يمكنك إعادة صياغة إجابتك؟ أريد التأكد من أنني فهمت بشكل صحيح.",
        "redirect": "شكراً لمشاركتك. دعنا نركز على السؤال الحالي حول تطور طفلك.",
        "exit": "شكراً لوقتك. تم حفظ تقدمك. يمكنك المتابعة لاحقاً.",
    }
}


def get_fallback_response(response_type: str, language: str = "en") -> str:
    """
    Get fallback response when LLM is unavailable.
    
    Args:
        response_type: Type of response needed
        language: Language code
        
    Returns:
        Fallback response text
    """
    return FALLBACK_RESPONSES.get(language, FALLBACK_RESPONSES["en"]).get(
        response_type,
        FALLBACK_RESPONSES[language]["error"]
    )

