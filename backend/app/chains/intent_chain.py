"""
Intent detection chain - classifies user intent with precise categories.
"""
import sys
from pathlib import Path

# Add project root to Python path to enable absolute imports
_project_root = Path(__file__).parent.parent.resolve()  # Project root
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from typing import Dict, Any, Literal, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from .base import get_json_llm


# Pydantic model for intent classification
class IntentClassification(BaseModel):
    """Intent classification result with strict enum validation."""
    intent: Literal[
        "answering",
        "clarification",
        "asking_question",
        "question_related_query",
        "greeting",
        "off_topic",
        "skip",
        "restart",
        "finish",
        "exit",
        "incomplete_answer",
        "wrong_format",
        "refusal",
        "other"
    ] = Field(..., description="Classified intent category")
    emotion: Literal[
        "positive",
        "negative",
        "neutral",
        "confused",
        "stressed",
        "hopeful"
    ] = Field(..., description="Parent's emotional state")
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Confidence level of the classification (0.0-1.0)"
    )
    explanation: str = Field(
        ..., 
        description="Brief reasoning for the classification"
    )


# English prompt template
INTENT_PROMPT_EN = """You are a specialized analyst for parent responses during M-CHAT-R autism screening. You must be extremely precise in classification.

CONTEXT:

- Current question #{current_question}: "{q_text}"

- Child: {child_name} ({child_age} months)

- Conversation History (recent messages):
{conversation_history}

- Parent's latest response: "{user_input}"

TASK: Accurately classify the parent's intent into one of these options:

1. "answering": The parent is providing an answer to the question - even if complex, poetic, or ambiguous

Examples: "yes", "no", "sometimes", "he smiles in a way only the universe understands", "she looks through me not at me"

2. "clarification": The parent explicitly asks for explanation of the question

Examples: "what do you mean?", "can you explain the question?", "I don't understand what you're asking"

3. "asking_question": The parent asks a question about the screening or current question

Examples: "why do you ask this?", "what does this behavior mean?"

3.1. "question_related_query": The parent asks a question directly related to the current question

Examples: "what is a superhero?", "what does staring mean?", "do you mean when he plays?"

4. "greeting": Simple greetings or acknowledgments

Examples: "hi", "hello", "hey", "good morning", "thanks", "thank you", "ok", "okay" (when used as acknowledgment)

5. "off_topic": Response completely unrelated to the child or screening

Examples: "what time is it?", "how's the weather?"

6. "skip": Explicit desire to skip the current question

Examples: "skip", "next", "pass"

7. "restart": Desire to start over from the first question

Examples: "start over", "restart", "begin again", "from the beginning"

8. "finish": Desire to finish the test and go to the report

Examples: "finish test", "I want the report", "done", "complete"

9. "exit": Desire to end the screening

Examples: "stop", "quit", "I'm done"

10. "incomplete_answer": Incomplete or nonsensical response

Examples: random letters, "...", broken sentences

11. "wrong_format": Uses JSON, HTML, emojis only, or wrong format

Examples: {{"key": "value"}}, <div>text</div>, 🧗‍♂️🛋️ (without text)

12. "refusal": Clear refusal to answer

Examples: "I don't want to answer", "I won't tell you", "No, I won't"

13. "other": Doesn't fit any other category

**Important Rule:** If the response contains "yes", "no", "sometimes", or any positive indicator, it's "answering" not "clarification".

ADDITIONAL ANALYSIS REQUIRED:

1. **Emotion Detection**: Analyze the parent's emotional state from: positive, negative, neutral, confused, stressed, hopeful

2. **Confidence**: Provide confidence level (0.0-1.0) based on how clear the classification is

3. **Explanation**: Provide a brief reasoning for your classification

Respond with a JSON object containing: intent, emotion, confidence, and explanation.
"""

# Arabic prompt template
INTENT_PROMPT_AR = """أنت محلل متخصص في تحليل استجابات الوالدين أثناء فحص M-CHAT-R للتوحد. يجب أن تكون دقيقاً للغاية في التصنيف.

السياق:

- السؤال الحالي #{current_question}: "{q_text}"

- الطفل: {child_name} ({child_age} شهراً)

- سجل المحادثة (الرسائل الأخيرة):
{conversation_history}

- آخر رد من الوالد: "{user_input}"

المهمة: صنّف بدقة نية الوالد في إحدى الخيارات التالية:

1. "answering": الوالد يقدم إجابة على السؤال - حتى لو كانت معقدة أو شعرية أو غامضة

أمثلة: "نعم"، "لا"، "أحياناً"، "يبتسم بطريقة لا يفهمها إلا الكون"، "تنظر من خلالي لا إلي"

2. "clarification": الوالد يطلب بوضوح شرحاً للسؤال

أمثلة: "ماذا تقصد؟"، "هل يمكنك شرح السؤال؟"، "لا أفهم ما تسأل عنه"


3. "asking_question": الوالد يسأل سؤالاً عن الفحص أو السؤال الحالي

أمثلة: "لماذا تسأل هذا؟"، "ماذا تعني هذه السلوكية؟"

3.1. "question_related_query": الوالد يسأل سؤالاً متعلقاً مباشرة بالسؤال الحالي

أمثلة: "ما هو البطل الخارق؟"، "ماذا يعني التحديق؟"، "هل تقصد عندما يلعب؟"

4. "greeting": تحيات بسيطة أو اعترافات

أمثلة: "مرحباً"، "أهلاً"، "صباح الخير"، "شكراً"، "شكراً لك"، "حسناً" (عند استخدامها كاعتراف)

5. "off_topic": رد غير متعلق تماماً بالطفل أو الفحص

أمثلة: "كم الساعة؟"، "كيف الطقس؟"

6. "skip": رغبة صريحة في تخطي السؤال الحالي

أمثلة: "تخطي"، "التالي"، "مرر"

7. "restart": الرغبة في البدء من جديد من السؤال الأول

أمثلة: "ابدأ من جديد"، "أعد البدء"، "من البداية"

8. "finish": الرغبة في إنهاء الاختبار والذهاب إلى التقرير

أمثلة: "إنهاء الاختبار"، "أريد التقرير"، "انتهيت"، "مكتمل"

9. "exit": الرغبة في إنهاء الفحص

أمثلة: "توقف"، "خرج"، "انتهيت"

10. "incomplete_answer": رد غير مكتمل أو غير منطقي

أمثلة: أحرف عشوائية، "..."، جمل مكسورة

11. "wrong_format": يستخدم JSON، HTML، رموز تعبيرية فقط، أو تنسيق خاطئ

أمثلة: {{"key": "value"}}, <div>text</div>, 🧗‍♂️🛋️ (بدون نص)

12. "refusal": رفض واضح للإجابة

أمثلة: "لا أريد الإجابة"، "لن أخبرك"، "لا، لن أفعل"

13. "other": لا يناسب أي فئة أخرى

**قاعدة مهمة:** إذا كان الرد يحتوي على "نعم"، "لا"، "أحياناً"، أو أي مؤشر إيجابي، فهو "answering" وليس "clarification".

تحليل إضافي مطلوب:

1. **اكتشاف العاطفة**: حلل الحالة العاطفية للوالد من: positive, negative, neutral, confused, stressed, hopeful

2. **الثقة**: قدم مستوى الثقة (0.0-1.0) بناءً على وضوح التصنيف

3. **التبرير**: قدم تبريراً موجزاً لتصنيفك

أرجع كائن JSON يحتوي على: intent, emotion, confidence, و explanation.
"""


def create_intent_chain():
    """
    Create intent detection chain with Pydantic output parser.
    
    Returns:
        Callable function for intent detection that returns IntentClassification
    """
    llm = get_json_llm()
    parser = PydanticOutputParser(pydantic_object=IntentClassification)
    
    def format_conversation_history(history: List[Dict]) -> str:
        """Format conversation history for prompt."""
        if not history:
            return "No previous messages in this conversation."
        
        formatted = []
        # Get last 10 messages for context (enough to understand recent flow)
        for msg in history[-10:]:
            # Handle both dict and LangChain message objects
            if isinstance(msg, dict):
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
            else:
                # LangChain message object (AIMessage, HumanMessage, etc.)
                # Try to get type/role from class name or attribute
                msg_type = type(msg).__name__.lower()
                if "ai" in msg_type or "assistant" in msg_type:
                    role = "assistant"
                elif "human" in msg_type or "user" in msg_type:
                    role = "user"
                else:
                    role = "unknown"
                
                # Get content from message object
                content = getattr(msg, "content", str(msg))
                if not isinstance(content, str):
                    content = str(content)
            
            # Clean up role names for readability
            role_display = "Assistant" if role == "assistant" else "Parent" if role == "user" else role
            formatted.append(f"{role_display}: {content}")
        
        return "\n".join(formatted) if formatted else "No previous messages in this conversation."
    
    # Create dynamic prompt based on language
    prompt_en = ChatPromptTemplate.from_template(INTENT_PROMPT_EN + "\n\n{format_instructions}")
    prompt_ar = ChatPromptTemplate.from_template(INTENT_PROMPT_AR + "\n\n{format_instructions}")
    
    def invoke_chain(inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke chain with language-specific prompt."""
        try:
            language = inputs.get("language", "en")
            prompt = prompt_ar if language == "ar" else prompt_en
            
            # Get format instructions from parser
            format_instructions = parser.get_format_instructions()
            
            # Prepare prompt variables
            current_question_num = inputs.get("current_question", "0")
            q_text = inputs.get("question_text", "")  # Explicit question text
            if not q_text:
                q_text = inputs.get("current_question_text", "")  # Fallback to alternative name
            child_name = inputs.get("child_name", "child")
            child_age = inputs.get("child_age", "unknown")
            user_input = inputs.get("user_input", inputs.get("user_message", ""))
            
            # Format conversation history
            conv_history = inputs.get("conversation_history", [])
            formatted_history = format_conversation_history(conv_history)
            
            chain = prompt | llm | parser
            result = chain.invoke({
                "current_question": current_question_num,
                "q_text": q_text,
                "child_name": child_name,
                "child_age": child_age,
                "conversation_history": formatted_history,
                "user_input": user_input,
                "format_instructions": format_instructions,
            })
            
            # Convert Pydantic model to dict for compatibility
            return {
                "intent": result.intent,
                "emotion": result.emotion,
                "confidence": result.confidence,
                "explanation": result.explanation
            }
            
        except Exception as e:
            print(f"Error in intent chain: {e}")
            # Return fallback response with all required fields
            return {
                "intent": "answering",
                "emotion": "neutral",
                "confidence": 0.5,
                "explanation": "Fallback due to processing error"
            }
    
    return invoke_chain


# Example usage
if __name__ == "__main__":
    chain = create_intent_chain()
    result = chain({
        "user_input": "Yes, my child does that sometimes",
        "user_message": "Yes, my child does that sometimes",  # Support both
        "current_question": "1",
        "question_text": "Does your child make eye contact?",
        "child_name": "Sarah",
        "child_age": "24",
        "language": "en",
        "conversation_history": [
            {"role": "assistant", "content": "Welcome to the M-CHAT-R screening..."},
            {"role": "user", "content": "Hello, I'm ready to start"}
        ]
    })
    print(result)

