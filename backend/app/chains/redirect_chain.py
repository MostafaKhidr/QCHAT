"""
Redirect chain - handles unrelated questions with empathy.
"""
import sys
from pathlib import Path

# Add project root to Python path to enable absolute imports
_project_root = Path(__file__).parent.parent.resolve()  # Project root
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from .base import get_llm


# Pydantic model for redirect response
class RedirectResponse(BaseModel):
    """Redirect response with professional message."""
    redirect_message: str = Field(
        ...,
        description="Professional, warm redirect message that briefly answers the off-topic question in one sentence and smoothly transitions to asking the clarified Q-CHAT question with one example"
    )


REDIRECT_PROMPT_EN = """You are a warm, professional AI assistant helping {parent_name} complete Q-CHAT questions about {child_name}.

Context:
- Parent's off-topic question: "{user_input}"
- Current Q-CHAT question: "{question_text}"
- Example for clarification: {example}
- Unrelated question count: {unrelated_count}

Task: Generate a short, warm, and professional message (2-3 sentences maximum) that:

1. **Answer Briefly**: Answer the parent's off-topic question in ONE short, warm sentence - be helpful and genuine
2. **Smooth Transition**: Smoothly transition to asking the Q-CHAT question in a clarified way using ONE clear example
3. **Keep it Natural**: End naturally without asking "which option fits best" - just present the question with the example

Guidelines:
- Be warm, professional, and conversational
- Use the child's name naturally (not [child_name])
- Keep it short - maximum 2-3 sentences total
- Use simple, everyday language
- Use only ONE example to illustrate the Q-CHAT question clearly
- Smoothly transition from answering their question to asking the Q-CHAT question
- Do NOT include options list (always, usually, sometimes, etc.) in the question
- Do NOT ask "which option fits best" - just present the question naturally
- Make the transition feel smooth and warm, not abrupt

{format_instructions}
"""

REDIRECT_PROMPT_AR = """أنت مساعد ذكي دافئ ومهني يساعد {parent_name} في إكمال أسئلة Q-CHAT حول {child_name}.

السياق:
- سؤال الوالد/الوالدة غير المتعلق: "{user_input}"
- سؤال Q-CHAT الحالي: "{question_text}"
- مثال للتوضيح: {example}
- عدد الأسئلة غير المتعلقة: {unrelated_count}

المهمة: أنشئ رسالة قصيرة ودافئة ومهنية (2-3 جمل كحد أقصى) التي:

1. **أجب بإيجاز**: أجب عن سؤال الوالد/الوالدة غير المتعلق في جملة واحدة قصيرة ودافئة - كن مفيداً وصادقاً
2. **انتقال سلس**: انتقل بسلاسة لطرح سؤال Q-CHAT بطريقة موضحة باستخدام مثال واحد واضح
3. **اجعلها طبيعية**: أنهِ بشكل طبيعي دون سؤال "أي خيار ينطبق" - فقط اعرض السؤال مع المثال

الإرشادات:
- كن دافئاً ومهنياً ومحادثاً
- استخدم اسم الطفل بشكل طبيعي (وليس [child_name])
- اجعلها قصيرة - حد أقصى 2-3 جمل إجمالاً
- استخدم لغة بسيطة وواضحة
- استخدم مثالاً واحداً فقط لتوضيح سؤال Q-CHAT بوضوح
- انتقل بسلاسة من الإجابة على سؤالهم إلى طرح سؤال Q-CHAT
- لا تتضمن قائمة الخيارات (دائماً، عادة، أحياناً، إلخ) في السؤال
- لا تسأل "أي خيار ينطبق" - فقط اعرض السؤال بشكل طبيعي
- اجعل الانتقال يبدو سلساً ودافئاً، وليس مفاجئاً

{format_instructions}
"""


def create_redirect_chain():
    """
    Create redirect chain.
    
    Returns:
        Callable function for handling unrelated questions that returns RedirectResponse
    
    Expected inputs:
        - parent_name: str
        - child_name: str
        - question_text: str (current screening question)
        - user_input: str (parent's off-topic message)
        - unrelated_count: int (number of times they've gone off-topic)
        - conversation_history: list (optional, per-question conversation history)
        - language: str ("en" or "ar")
    """
    llm = get_llm(temperature=0.7)
    parser = PydanticOutputParser(pydantic_object=RedirectResponse)
    
    prompt_en = ChatPromptTemplate.from_template(REDIRECT_PROMPT_EN)
    prompt_ar = ChatPromptTemplate.from_template(REDIRECT_PROMPT_AR)
    
    def invoke_chain(inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke chain with language-specific prompt."""
        try:
            language = inputs.get("language", "en")
            prompt = prompt_ar if language == "ar" else prompt_en
            
            # Get required fields with defaults
            parent_name = inputs.get("parent_name", "")
            child_name = inputs.get("child_name", "")
            question_text = inputs.get("question_text", "") or inputs.get("current_question_text", "")
            user_input = inputs.get("user_input", "") or inputs.get("unrelated_question", "")
            unrelated_count = inputs.get("unrelated_count", 1)
            example = inputs.get("example", "") or inputs.get("example_a", "")
            conversation_history = inputs.get("conversation_history", [])
            
            # Format conversation history
            from app.workflows.helpers import format_conversation_history
            formatted_history = format_conversation_history(conversation_history) if conversation_history else "No previous messages in this conversation."
            
            # Get format instructions from parser
            format_instructions = parser.get_format_instructions()
            
            chain = prompt | llm | parser
            result = chain.invoke({
                "parent_name": parent_name,
                "child_name": child_name,
                "question_text": question_text,
                "user_input": user_input,
                "unrelated_count": unrelated_count,
                "example": example,
                "conversation_history": formatted_history,
                "format_instructions": format_instructions,
            })
            
            # Convert Pydantic model to dict for compatibility
            return {
                "redirect_message": result.redirect_message
            }
            
        except Exception as e:
            print(f"Error in redirect chain: {e}")
            language = inputs.get("language", "en")
            unrelated_count = inputs.get("unrelated_count", 1)
            parent_name = inputs.get("parent_name", "")
            child_name = inputs.get("child_name", "")
            question_text = inputs.get("question_text", "") or inputs.get("current_question_text", "")
            user_input = inputs.get("user_input", "") or inputs.get("unrelated_question", "")
            
            if language == "ar":
                example_text = f" مثال: {inputs.get('example', '')}" if inputs.get('example') else ""
                return {
                    "redirect_message": f"شكراً لسؤالك{' ' + parent_name if parent_name else ''}، أفهم اهتمامك. دعني أسألك: {question_text}{example_text}."
                }
            else:
                example_text = f" Example: {inputs.get('example', '')}" if inputs.get('example') else ""
                return {
                    "redirect_message": f"Thanks for your question{' ' + parent_name if parent_name else ''}, I understand your concern. Let me ask: {question_text}{example_text}."
                }
    
    return invoke_chain


if __name__ == "__main__":
    """
    Test the redirect chain with various scenarios.
    Run this script directly to test: python -m app.chains.redirect_chain
    """
    print("=" * 80)
    print("Testing Redirect Chain")
    print("=" * 80)
    
    # Create the chain
    chain = create_redirect_chain()
    
    # Test 1: English - First time off-topic (Level 1)
    print("\n[Test 1] English - First time off-topic (Level 1):")
    print("-" * 80)
    result = chain({
        "parent_name": "Sarah",
        "child_name": "Emma",
        "question_text": "Does your child point to show you something interesting?",
        "user_input": "Can we schedule an appointment with a specialist?",
        "unrelated_count": 1,
        "language": "en"
    })
    print(f"Redirect Message: {result['redirect_message']}")
    print(f"Escalation Level: {result['escalation_level']}")
    assert result['escalation_level'] == 1, "Escalation level should be 1"
    assert "yes or no" in result['redirect_message'].lower(), "Should ask for yes or no"
    print("✓ Test passed")
    
    # Test 2: English - Second time off-topic (Level 2)
    print("\n[Test 2] English - Second time off-topic (Level 2):")
    print("-" * 80)
    result = chain({
        "parent_name": "Sarah",
        "child_name": "Emma",
        "question_text": "Does your child point to show you something interesting?",
        "user_input": "What about speech therapy?",
        "unrelated_count": 2,
        "language": "en"
    })
    print(f"Redirect Message: {result['redirect_message']}")
    print(f"Escalation Level: {result['escalation_level']}")
    assert result['escalation_level'] == 2, "Escalation level should be 2"
    print("✓ Test passed")
    
    # Test 3: English - Third time off-topic (Level 3)
    print("\n[Test 3] English - Third time off-topic (Level 3):")
    print("-" * 80)
    result = chain({
        "parent_name": "Sarah",
        "child_name": "Emma",
        "question_text": "Does your child point to show you something interesting?",
        "user_input": "I'm worried about my child's development",
        "unrelated_count": 3,
        "language": "en"
    })
    print(f"Redirect Message: {result['redirect_message']}")
    print(f"Escalation Level: {result['escalation_level']}")
    assert result['escalation_level'] == 3, "Escalation level should be 3"
    print("✓ Test passed")
    
    # Test 4: Arabic - First time off-topic (Level 1)
    print("\n[Test 4] Arabic - First time off-topic (Level 1):")
    print("-" * 80)
    result_ar = chain({
        "parent_name": "خالد",
        "child_name": "سارة",
        "question_text": "هل يشير طفلك لإظهار شيء مثير للاهتمام؟",
        "user_input": "هل يمكننا تحديد موعد مع أخصائي؟",
        "unrelated_count": 1,
        "language": "ar"
    })
    print(f"Redirect Message: {result_ar['redirect_message']}")
    print(f"Escalation Level: {result_ar['escalation_level']}")
    assert result_ar['escalation_level'] == 1, "Escalation level should be 1"
    assert "نعم أو لا" in result_ar['redirect_message'] or "بنعم أو لا" in result_ar['redirect_message'], "Should ask for yes or no"
    print("✓ Test passed")
    
    # Test 5: English - Using alternative input names
    print("\n[Test 5] English - Using alternative input names (backward compatibility):")
    print("-" * 80)
    result = chain({
        "parent_name": "John",
        "child_name": "Alex",
        "current_question_text": "Does your child respond to their name?",
        "unrelated_question": "What are the symptoms of autism?",
        "unrelated_count": 1,
        "language": "en"
    })
    print(f"Redirect Message: {result['redirect_message']}")
    print(f"Escalation Level: {result['escalation_level']}")
    assert result['escalation_level'] == 1, "Escalation level should be 1"
    print("✓ Test passed")
    
    # Test 6: Minimal inputs (testing defaults)
    print("\n[Test 6] English - Minimal inputs (testing defaults):")
    print("-" * 80)
    result = chain({
        "parent_name": "Test Parent",
        "child_name": "Test Child",
        "question_text": "Test question?",
        "user_input": "Off-topic question",
        "language": "en"
    })
    print(f"Redirect Message: {result['redirect_message']}")
    print(f"Escalation Level: {result['escalation_level']}")
    assert 'redirect_message' in result, "Should have redirect_message"
    assert 'escalation_level' in result, "Should have escalation_level"
    assert 1 <= result['escalation_level'] <= 3, "Escalation level should be between 1 and 3"
    print("✓ Test passed")
    
    # Test 7: Error handling - Fallback when LLM fails
    print("\n[Test 7] Testing fallback behavior:")
    print("-" * 80)
    print("Note: This test verifies the structure, actual LLM errors would trigger fallback")
    result = chain({
        "parent_name": "Test",
        "child_name": "Test",
        "question_text": "Test question?",
        "user_input": "Test input",
        "unrelated_count": 1,
        "language": "en"
    })
    assert 'redirect_message' in result, "Should always return redirect_message"
    assert 'escalation_level' in result, "Should always return escalation_level"
    print("✓ Fallback structure verified")
    
    print("\n" + "=" * 80)
    print("All tests completed successfully! ✓")
    print("=" * 80)

