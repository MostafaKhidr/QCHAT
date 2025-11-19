"""
Clarification chain - provides personalized question clarification with examples.
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


# Pydantic model for clarification output
class ClarificationResponse(BaseModel):
    """Clarification response with personalized explanation."""
    clarification_text: str = Field(
        ...,
        description="Personalized clarification response (3-4 sentences max) addressing the parent's concern"
    )


CLARIFICATION_PROMPT_EN = """You are a caring assistant helping {parent_name} understand this question about {child_name}.

**CLARIFICATION TASK:** Address {parent_name}'s specific concern and provide targeted clarification.

Previous Context (if any): {previous_context}

Parent's concern: "{user_input}"

Question: "{question_text}"

Pass Example: "{pass_example}"

**RESPONSE STRUCTURE:**

1. Directly answer their question with a short, clear explanation
2. Give a concrete example with {child_name}'s name (NOT [child_name]) that relates to their concern
3. Ask directly: "Does {child_name} do this?"

**CRITICAL RULES:**

- ALWAYS use {child_name} in examples, NEVER use [child_name] or placeholders
- Replace ANY [child_name] in the pass example with {child_name}
- BE WARM but DIRECT
- Use SIMPLE, conversational language
- Keep it SHORT (3-4 sentences total)
- DO NOT mention "yes or no" - just ask naturally
- Make the example feel personal and specific to their child
- Address their specific concern from "{user_input}" directly
- Use the previous context to understand the conversation flow and provide coherent clarification

{format_instructions}
"""

CLARIFICATION_PROMPT_AR = """أنت مساعد حنون يساعد {parent_name} على فهم هذا السؤال المتعلق بـ {child_name}.

**مهمة التوضيح:** اتبع مخاوف {parent_name} المحددة وقدم توضيحاً مستهدفاً.

السياق السابق (إن وجد): {previous_context}

مخاوف الوالد/الوالدة: "{user_input}"

السؤال: "{question_text}"

مثال الإجابة الصحيحة: "{pass_example}"

**هيكل الرد:**

1. أجب عن سؤالهم مباشرة بشرح قصير وواضح
2. أعطِ مثالاً ملموساً باستخدام اسم {child_name} (وليس [child_name]) يتعلق بمخاوفهم
3. اسأل مباشرة: "هل يفعل {child_name} هذا؟"

**قواعد مهمة:**

- استخدم دائماً {child_name} في الأمثلة، أبداً لا تستخدم [child_name] أو أي رموز مكانية
- استبدل أي [child_name] في مثال الإجابة الصحيحة بـ {child_name}
- كن دافئاً لكن مباشراً
- استخدم لغة بسيطة ومحادثة
- اجعل الرد قصيراً (3-4 جمل فقط)
- لا تذكر "نعم أو لا" - فقط اسأل بشكل طبيعي
- اجعل المثال يبدو شخصياً ومحدداً لطفلهم
- تعامل مباشرة مع مخاوفهم المحددة من "{user_input}"
- استخدم السياق السابق لفهم سياق المحادثة وتقديم توضيح متماسك

{format_instructions}
"""


def create_clarification_chain():
    """
    Create clarification chain with personalized examples.
    
    Returns:
        Callable function for question clarification
    """
    llm = get_llm(temperature=0.7)
    parser = PydanticOutputParser(pydantic_object=ClarificationResponse)
    
    prompt_en = ChatPromptTemplate.from_template(CLARIFICATION_PROMPT_EN + "\n\n{format_instructions}")
    prompt_ar = ChatPromptTemplate.from_template(CLARIFICATION_PROMPT_AR + "\n\n{format_instructions}")
    
    def invoke_chain(inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invoke chain with language-specific prompt.
        
        Expected inputs:
            - parent_name: str
            - child_name: str
            - user_input: str (parent's concern/question)
            - question_text: str
            - pass_example: str (optional, example from question data)
            - previous_context: str (optional, previous conversation context)
            - language: str ("en" or "ar")
        """
        try:
            language = inputs.get("language", "en")
            prompt = prompt_ar if language == "ar" else prompt_en
            
            # Get required fields with defaults
            parent_name = inputs.get("parent_name", "")
            child_name = inputs.get("child_name", "")
            user_input = inputs.get("user_input", "")
            question_text = inputs.get("question_text", "") or inputs.get("question", "")
            pass_example = inputs.get("pass_example", "")
            previous_context = inputs.get("previous_context", "")
            
            # Replace [child_name] placeholder in pass_example if present
            if pass_example and "[child_name]" in pass_example:
                pass_example = pass_example.replace("[child_name]", child_name)
            
            # Get format instructions from parser
            format_instructions = parser.get_format_instructions()
            
            chain = prompt | llm | parser
            result = chain.invoke({
                "parent_name": parent_name,
                "child_name": child_name,
                "user_input": user_input,
                "question_text": question_text,
                "pass_example": pass_example,
                "previous_context": previous_context,
                "format_instructions": format_instructions,
            })
            
            # Convert Pydantic model to dict for compatibility
            return {
                "clarification_text": result.clarification_text
            }
            
        except Exception as e:
            print(f"Error in clarification chain: {e}")
            # Fallback clarification
            language = inputs.get("language", "en")
            child_name = inputs.get("child_name", "your child")
            
            if language == "ar":
                return {
                    "clarification_text": f"دعني أوضح السؤال بطريقة أخرى تتعلق بـ {child_name}. ما الذي تلاحظينه عادة؟"
                }
            else:
                return {
                    "clarification_text": f"Let me rephrase this question about {child_name}. What do you usually observe?"
                }
    
    return invoke_chain


# Example usage
if __name__ == "__main__":
    chain = create_clarification_chain()
    
    print("=" * 80)
    print("Testing Clarification Chain")
    print("=" * 80)
    
    # Test 1: English - Basic clarification
    print("\n[Test 1] English - Basic clarification:")
    print("-" * 80)
    result = chain({
        "parent_name": "Sarah",
        "child_name": "Emma",
        "user_input": "I'm not sure what you mean",
        "question_text": "Does your child respond to their name when called?",
        "pass_example": "When you call [child_name]'s name, [child_name] looks at you or turns toward you.",
        "language": "en"
    })
    print(f"Result: {result['clarification_text']}")
    
    # Test 2: English - With previous context
    print("\n[Test 2] English - With previous context:")
    print("-" * 80)
    result = chain({
        "parent_name": "John",
        "child_name": "Alex",
        "user_input": "What if they sometimes do and sometimes don't?",
        "question_text": "Does your child make eye contact when you talk to them?",
        "pass_example": "[child_name] looks at your face when you're talking or playing together.",
        "previous_context": "Parent asked about frequency of behaviors.",
        "language": "en"
    })
    print(f"Result: {result['clarification_text']}")
    
    # Test 3: Arabic - Basic clarification
    print("\n[Test 3] Arabic - Basic clarification:")
    print("-" * 80)
    result_ar = chain({
        "parent_name": "فاطمة",
        "child_name": "محمد",
        "user_input": "لا أفهم السؤال",
        "question_text": "هل يستجيب طفلك لاسمه عند مناداته؟",
        "pass_example": "عندما تنادي [child_name] باسمه، ينظر [child_name] إليك أو يدير وجهه نحوك.",
        "language": "ar"
    })
    print(f"Result: {result_ar['clarification_text']}")
    
    # Test 4: English - Specific concern about behavior
    print("\n[Test 4] English - Specific concern:")
    print("-" * 80)
    result = chain({
        "parent_name": "Maria",
        "child_name": "Lucas",
        "user_input": "He only does it with me, not with strangers",
        "question_text": "Does your child smile back when you smile at them?",
        "pass_example": "[child_name] smiles back at you when you smile.",
        "language": "en"
    })
    print(f"Result: {result['clarification_text']}")
    
    # Test 5: Arabic - With concern
    print("\n[Test 5] Arabic - With concern:")
    print("-" * 80)
    result_ar = chain({
        "parent_name": "خالد",
        "child_name": "سارة",
        "user_input": "أحياناً يفعل وأحياناً لا",
        "question_text": "هل يقلد طفلك أفعالك مثل التصفيق أو التلويح باليد؟",
        "pass_example": "[child_name] يقلدك عندما تصفقين أو تلويحين بيدك.",
        "language": "ar"
    })
    print(f"Result: {result_ar['clarification_text']}")
    
    # Test 6: Minimal inputs (testing defaults)
    print("\n[Test 6] English - Minimal inputs:")
    print("-" * 80)
    result = chain({
        "parent_name": "Test Parent",
        "child_name": "Test Child",
        "user_input": "I need clarification",
        "question_text": "Test question?",
        "language": "en"
    })
    print(f"Result: {result['clarification_text']}")
    
    print("\n" + "=" * 80)
    print("Tests completed!")
    print("=" * 80)
