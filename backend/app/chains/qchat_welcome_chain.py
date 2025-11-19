"""
QCHAT Welcome Chain - Generates AI-powered welcome messages for Q-CHAT questions.

This chain creates natural, professional welcome messages that introduce the question
and provide helpful examples to guide parents.
"""
import sys
from pathlib import Path

# Add project root to Python path
_project_root = Path(__file__).parent.parent.resolve()
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from .base import get_llm


# Pydantic model for welcome response
class QChatWelcomeResponse(BaseModel):
    """QCHAT welcome message response."""
    message: str = Field(
        ...,
        description="Complete welcome message that greets the parent, introduces the question, provides examples, and explains how the assistant can help"
    )


# English prompt template
QCHAT_WELCOME_PROMPT_EN = """You are a warm, friendly AI assistant helping parents complete Q-CHAT questions about their child.

Context:
- Parent name: {parent_name}
- Child name: {child_name}
- Question number: {question_number}
- Question text: {question_text}
- Example: {example}

Task: Generate a short, warm, and professional message (2-3 sentences maximum) that:

1. **Acknowledge Greeting**: Professionally acknowledge the parent's greeting by name (if provided) - keep it brief and warm, one line
2. **Smoothly Transition**: Smoothly and warmly transition to asking the question in a clarified way using ONE clear example to help them understand what it means
3. **Keep it Natural**: End naturally without asking "which option fits best" - just present the question with the example

Guidelines:
- Be warm, professional, and conversational
- Use the child's name naturally (not [child_name])
- Keep it short - maximum 2-3 sentences total
- Use simple, everyday language
- Use only ONE example to illustrate the question clearly
- Smoothly transition from greeting to question - make it feel like a natural, helpful conversation
- Do NOT include options list (always, usually, sometimes, etc.) in the question
- Do NOT ask "which option fits best" - just present the question naturally
- Make the transition feel smooth and warm, not abrupt

{format_instructions}
"""


# Arabic prompt template
QCHAT_WELCOME_PROMPT_AR = """أنت مساعد ذكي دافئ وودود يساعد الوالدين في إكمال أسئلة Q-CHAT حول طفلهم.

السياق:
- اسم الوالد: {parent_name}
- اسم الطفل: {child_name}
- رقم السؤال: {question_number}
- نص السؤال: {question_text}
- مثال: {example}

المهمة: أنشئ رسالة قصيرة ودافئة ومهنية (2-3 جمل كحد أقصى) التي:

1. **الاعتراف بالتحية**: اعترف بتحية الوالد بشكل مهني باستخدام اسمه (إذا تم توفيره) - اجعلها مختصرة ودافئة، سطر واحد
2. **الانتقال بسلاسة**: انتقل بسلاسة ودفء لطرح السؤال بطريقة موضحة باستخدام مثال واحد واضح لمساعدتهم على فهم معناه
3. **اجعلها طبيعية**: أنهِ بشكل طبيعي دون سؤال "أي خيار ينطبق" - فقط اعرض السؤال مع المثال

الإرشادات:
- كن دافئاً ومهنياً ومحادثاً
- استخدم اسم الطفل بشكل طبيعي (وليس [child_name])
- اجعلها قصيرة - حد أقصى 2-3 جمل إجمالاً
- استخدم لغة بسيطة وواضحة
- استخدم مثالاً واحداً فقط لتوضيح السؤال بوضوح
- انتقل بسلاسة من التحية إلى السؤال - اجعلها تبدو كمحادثة طبيعية ومفيدة
- لا تتضمن قائمة الخيارات (دائماً، عادة، أحياناً، إلخ) في السؤال
- لا تسأل "أي خيار ينطبق" - فقط اعرض السؤال بشكل طبيعي
- اجعل الانتقال يبدو سلساً ودافئاً، وليس مفاجئاً

{format_instructions}
"""


def create_qchat_welcome_chain():
    """
    Create QCHAT welcome message generation chain.
    
    Returns:
        Callable function for welcome message generation
    """
    llm = get_llm(temperature=0.8)  # Higher temperature for more natural, varied responses
    parser = PydanticOutputParser(pydantic_object=QChatWelcomeResponse)
    
    # Create prompt templates
    prompt_en = ChatPromptTemplate.from_template(QCHAT_WELCOME_PROMPT_EN + "\n\n{format_instructions}")
    prompt_ar = ChatPromptTemplate.from_template(QCHAT_WELCOME_PROMPT_AR + "\n\n{format_instructions}")
    
    def invoke_chain(inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke chain to generate welcome message."""
        try:
            language = inputs.get("language", "en")
            parent_name = inputs.get("parent_name", "")
            child_name = inputs.get("child_name", "")
            question_number = inputs.get("question_number", 1)
            question_text = inputs.get("question_text", "")
            example_a = inputs.get("example_a", "")
            example_e = inputs.get("example_e", "")
            
            # Select prompt based on language
            prompt = prompt_ar if language == "ar" else prompt_en
            
            # Get format instructions
            format_instructions = parser.get_format_instructions()
            
            # Use example_a as the single example (or example_e if example_a is not available)
            example = example_a or example_e or "Not provided"
            
            # Prepare prompt variables
            prompt_vars = {
                "parent_name": parent_name or "Parent",
                "child_name": child_name or "your child",
                "question_number": question_number,
                "question_text": question_text,
                "example": example,
                "format_instructions": format_instructions,
            }
            
            # Invoke chain
            chain = prompt | llm | parser
            result = chain.invoke(prompt_vars)
            
            return {
                "message": result.message
            }
            
        except Exception as e:
            # Fallback to a simple message if AI generation fails
            language = inputs.get("language", "en")
            parent_name = inputs.get("parent_name", "")
            child_name = inputs.get("child_name", "your child")
            question_number = inputs.get("question_number", 1)
            question_text = inputs.get("question_text", "")
            
            if language == "ar":
                fallback = (
                    f"مرحباً{' ' + parent_name if parent_name else ''}.\n\n"
                    f"أنا مساعدك الذكي لمساعدتك في الإجابة على السؤال {question_number}.\n\n"
                    f"السؤال: {question_text}\n\n"
                    "كيف يمكنني مساعدتك اليوم؟"
                )
            else:
                fallback = (
                    f"Hello{' ' + parent_name if parent_name else ''}.\n\n"
                    f"I'm your AI assistant here to help you with Question {question_number}.\n\n"
                    f"Question: {question_text}\n\n"
                    "How can I assist you today?"
                )
            
            return {
                "message": fallback
            }
    
    return invoke_chain

