"""
QCHAT Answer Extraction Chain - Extracts A-E answer from conversational description.

This chain analyzes parent's conversational description of their child's behavior
and maps it to the most appropriate option (A-E) based on frequency, intensity, and context.
"""
import sys
from pathlib import Path

# Add project root to Python path
_project_root = Path(__file__).parent.parent.resolve()
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from typing import Dict, Any, Literal
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from .base import get_json_llm


# Pydantic model for QCHAT answer extraction
class QChatAnswerExtraction(BaseModel):
    """QCHAT answer extraction result with A-E option mapping."""
    option: Literal["A", "B", "C", "D", "E", "unclear"] = Field(
        ...,
        description="Extracted option (A-E) based on behavior description, or 'unclear' if not answering"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence level in the extraction (0.0-1.0)"
    )
    reasoning: str = Field(
        ...,
        description="Brief explanation of why this option was selected"
    )


# English prompt for QCHAT answer extraction
QCHAT_ANSWER_EXTRACTION_PROMPT_EN = """You are an expert analyst helping parents complete the Q-CHAT autism screening assessment.

**Current Question:**
{question_text}

**Available Options:**
{options_formatted}

**Parent's Response:**
"{user_input}"

**Previous Conversation Context:**
{conversation_history}

**Your Task:**
Analyze the parent's description of their child's behavior and determine which option (A-E) best matches what they described.

**Classification Criteria:**
- Focus on FREQUENCY words: "always", "many times", "usually", "sometimes", "rarely", "never", etc.
- Consider CONTEXT: Examples they provide, situations they describe
- Consider INTENSITY: How strongly they describe the behavior
- Match behavioral patterns to option descriptions

**Important Rules:**
1. If the parent is clearly describing an answer, extract it confidently
2. If the parent is asking a question or seeking clarification (not answering), return "unclear"
3. If the parent's description is ambiguous or contradictory, choose the most conservative option with lower confidence
4. Always provide reasoning for your selection

**Examples:**
- "He does this all the time throughout the day" → Option A (if A = "Many times a day")
- "She sometimes does it, maybe half the time" → Option C (if C = "Sometimes")
- "Very rarely, almost never" → Option D or E depending on exact wording
- "What does this question mean?" → "unclear" (not answering)

{format_instructions}
"""


# Arabic prompt for QCHAT answer extraction
QCHAT_ANSWER_EXTRACTION_PROMPT_AR = """أنت خبير في مساعدة الوالدين على إكمال تقييم Q-CHAT للتوحد.

**السؤال الحالي:**
{question_text}

**الخيارات المتاحة:**
{options_formatted}

**رد الوالد:**
"{user_input}"

**سياق المحادثة السابق:**
{conversation_history}

**مهمتك:**
قم بتحليل وصف الوالد لسلوك طفله وحدد أي خيار (A-E) يتطابق بشكل أفضل مع ما وصفوه.

**معايير التصنيف:**
- ركز على كلمات التكرار: "دائماً"، "عدة مرات"، "عادة"، "أحياناً"، "نادراً"، "أبداً"، إلخ.
- خذ بعين الاعتبار السياق: الأمثلة التي يقدمونها، المواقف التي يصفونها
- خذ بعين الاعتبار الشدة: مدى قوة وصفهم للسلوك
- طابق الأنماط السلوكية مع أوصاف الخيارات

**قواعد مهمة:**
1. إذا كان الوالد يصف إجابة بوضوح، استخرجها بثقة
2. إذا كان الوالد يطرح سؤالاً أو يطلب توضيحاً (وليس إجابة)، أرجع "unclear"
3. إذا كان وصف الوالد غامضاً أو متناقضاً، اختر الخيار الأكثر تحفظاً مع ثقة أقل
4. قدم دائماً تفسيراً لاختيارك

**أمثلة:**
- "يفعل هذا طوال الوقت طوال اليوم" → الخيار A (إذا كان A = "عدة مرات في اليوم")
- "تفعله أحياناً، ربما نصف الوقت" → الخيار C (إذا كان C = "أحياناً")
- "نادراً جداً، تقريباً أبداً" → الخيار D أو E حسب الصياغة الدقيقة
- "ما معنى هذا السؤال؟" → "unclear" (ليس إجابة)

{format_instructions}
"""


def format_options_for_prompt(options: list, language: str = "en") -> str:
    """Format options list for prompt display."""
    formatted = []
    for opt in options:
        value = opt.get("value", "")
        if language == "ar":
            label = opt.get("label_ar", opt.get("label", ""))
        else:
            label = opt.get("label_en", opt.get("label", ""))

        # Include example if provided
        example = opt.get("example", "")
        if example:
            formatted.append(f"{value}: {label} - Example: {example}")
        else:
            formatted.append(f"{value}: {label}")

    return "\n".join(formatted)


def create_qchat_answer_extraction_chain():
    """
    Create QCHAT answer extraction chain for A-E options.

    Returns:
        Runnable chain for answer extraction
    """
    llm = get_json_llm()
    parser = PydanticOutputParser(pydantic_object=QChatAnswerExtraction)

    prompt_en = ChatPromptTemplate.from_template(QCHAT_ANSWER_EXTRACTION_PROMPT_EN)
    prompt_ar = ChatPromptTemplate.from_template(QCHAT_ANSWER_EXTRACTION_PROMPT_AR)

    def invoke_chain(inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke chain with language-specific prompt."""
        try:
            language = inputs.get("language", "en")
            prompt = prompt_ar if language == "ar" else prompt_en

            question_text = inputs.get("question_text", "")
            user_input = inputs.get("user_input", inputs.get("user_message", ""))
            options = inputs.get("options", [])
            conversation_history = inputs.get("conversation_history", [])

            # Format options for display
            options_formatted = format_options_for_prompt(options, language)

            # Format conversation history
            from app.workflows.helpers import format_conversation_history
            formatted_history = format_conversation_history(conversation_history) if conversation_history else "No previous messages."

            chain = prompt | llm | parser
            result = chain.invoke({
                "question_text": question_text,
                "user_input": user_input,
                "options_formatted": options_formatted,
                "conversation_history": formatted_history,
                "format_instructions": parser.get_format_instructions(),
            })

            # Convert Pydantic model to dict
            return result.model_dump()

        except Exception as e:
            print(f"Error in QCHAT answer extraction chain: {e}")
            import traceback
            traceback.print_exc()
            return {
                "option": "unclear",
                "confidence": 0.0,
                "reasoning": "Error occurred during extraction"
            }

    return invoke_chain


# Example usage
if __name__ == "__main__":
    chain = create_qchat_answer_extraction_chain()

    # Test case 1: Clear frequency description (English)
    result = chain({
        "question_text": "How often does your child point at things they want?",
        "user_input": "My son points at his bottle when he wants milk, points at the door when he wants to go outside, and points at toys all the time. This happens throughout the day, probably 10-15 times.",
        "options": [
            {"value": "A", "label_en": "Many times a day"},
            {"value": "B", "label_en": "A few times a day"},
            {"value": "C", "label_en": "A few times a week"},
            {"value": "D", "label_en": "Less than once a week"},
            {"value": "E", "label_en": "Never"}
        ],
        "language": "en"
    })
    print(f"Test 1 - English (clear answer): {result}")

    # Test case 2: Arabic with frequency
    result_ar = chain({
        "question_text": "عندما تنادي طفلك باسمه، كم مرة ينظر إليك؟",
        "user_input": "ينظر إلي في معظم الأوقات، ربما ٨ من ١٠ مرات",
        "options": [
            {"value": "A", "label_ar": "دائماً"},
            {"value": "B", "label_ar": "عادة"},
            {"value": "C", "label_ar": "أحياناً"},
            {"value": "D", "label_ar": "نادراً"},
            {"value": "E", "label_ar": "أبداً"}
        ],
        "language": "ar"
    })
    print(f"Test 2 - Arabic (clear answer): {result_ar}")

    # Test case 3: Unclear (asking question)
    result_unclear = chain({
        "question_text": "Does your child use simple gestures like waving goodbye?",
        "user_input": "What do you mean by simple gestures?",
        "options": [
            {"value": "A", "label_en": "Many times a day"},
            {"value": "B", "label_en": "A few times a day"},
            {"value": "C", "label_en": "A few times a week"},
            {"value": "D", "label_en": "Less than once a week"},
            {"value": "E", "label_en": "Never"}
        ],
        "language": "en"
    })
    print(f"Test 3 - Unclear (asking question): {result_unclear}")
