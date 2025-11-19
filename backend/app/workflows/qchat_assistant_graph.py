"""
QCHAT Assistant Graph - Per-question AI assistant workflow.

This workflow provides conversational assistance for a single QCHAT question,
helping parents understand the question and extracting their answer (A-E option).
"""
import sys
from pathlib import Path

# Add project root to Python path (backend directory)
_project_root = Path(__file__).parent.parent.parent.resolve()
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from typing import Dict, Any
import re
from langgraph.graph import StateGraph, END
from langgraph.types import interrupt
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage

from app.workflows.qchat_assistant_state import QChatAssistantState
from app.workflows.helpers import format_conversation_history
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Import chains
from app.chains.intent_chain import create_intent_chain
from app.chains.qchat_answer_extraction_chain import create_qchat_answer_extraction_chain
from app.chains.clarification_chain import create_clarification_chain
from app.chains.qchat_welcome_chain import create_qchat_welcome_chain
from app.chains.redirect_chain import create_redirect_chain

# Initialize chains
intent_chain = create_intent_chain()
qchat_answer_extraction_chain = create_qchat_answer_extraction_chain()
clarification_chain = create_clarification_chain()
qchat_welcome_chain = create_qchat_welcome_chain()
redirect_chain = create_redirect_chain()


# ============================================================================
# NODES
# ============================================================================

def welcome_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Welcome node - uses AI to generate a natural, professional welcome message.
    Only runs on first invocation. If conversation already exists, skips welcome.
    """
    conversation_history = state.get("conversation_history", [])
    current_message = state.get("current_message", "")
    
    # If conversation already exists, skip welcome and return empty (will route to await_user_input)
    if conversation_history:
        print("🔵 [NODE: welcome] - Conversation exists, skipping welcome")
        logger.debug("[NODE: welcome] Conversation exists, skipping welcome")
        return {}
    
    print("🔵 [NODE: welcome] - Generating welcome message...")
    logger.debug("[NODE: welcome]")

    language = state.get("language", "en")
    question_number = state.get("current_question_number", 1)
    question_text = state.get("question_text", "")
    parent_name = state.get("parent_name", "")
    child_name = state.get("child_name", "")
    options = state.get("options", [])

    # Replace [child_name] placeholder with actual child name in question
    display_question = question_text
    if child_name:
        display_question = question_text.replace("[child_name]", child_name)
    elif "[child_name]" in display_question:
        display_question = display_question.replace("[child_name]", "your child")

    # Get examples for clarification (use first example from options A and E for contrast)
    example_a = ""
    example_e = ""
    if options:
        for opt in options:
            if opt.get("value") == "A" and opt.get("example"):
                example_a = opt["example"]
                # Replace [child_name] in example
                if child_name:
                    example_a = example_a.replace("[child_name]", child_name)
                elif "[child_name]" in example_a:
                    example_a = example_a.replace("[child_name]", "your child")
            elif opt.get("value") == "E" and opt.get("example"):
                example_e = opt["example"]
                # Replace [child_name] in example
                if child_name:
                    example_e = example_e.replace("[child_name]", child_name)
                elif "[child_name]" in example_e:
                    example_e = example_e.replace("[child_name]", "your child")

    # Use AI to generate natural welcome message
    try:
        result = qchat_welcome_chain({
            "language": language,
            "parent_name": parent_name,
            "child_name": child_name or "your child",
            "question_number": question_number,
            "question_text": display_question,
            "example_a": example_a,
            "example_e": example_e,
        })
        
        message = result.get("message", "")
        
        if not message:
            raise ValueError("Empty message from welcome chain")
            
    except Exception as e:
        logger.error(f"Error generating AI welcome message: {e}", exc_info=True)
        # Fallback to a simple professional message
        if language == "ar":
            if parent_name:
                greeting = f"مرحباً {parent_name}"
            else:
                greeting = "مرحباً"
            
            message = f"{greeting}.\n\n"
            message += f"أنا مساعدك الذكي لمساعدتك في الإجابة على السؤال {question_number} من استبيان Q-CHAT.\n\n"
            message += f"السؤال: {display_question}\n\n"
            
            if example_a and example_e:
                message += "لتوضيح السؤال:\n"
                message += f"• مثال على الإجابة الأولى (A): {example_a}\n"
                message += f"• مثال على الإجابة الأخيرة (E): {example_e}\n\n"
            
            message += "يمكنك أن تسألني أي شيء عن هذا السؤال، أو تصف سلوك طفلك بكلماتك الخاصة وسأساعدك في اختيار الإجابة المناسبة.\n\n"
            message += "كيف يمكنني مساعدتك اليوم؟"
        else:
            if parent_name:
                greeting = f"Hello {parent_name}"
            else:
                greeting = "Hello"
            
            message = f"{greeting}.\n\n"
            message += f"I'm your AI assistant here to help you answer Question {question_number} of the Q-CHAT assessment.\n\n"
            message += f"Question: {display_question}\n\n"
            
            if example_a and example_e:
                message += "To help clarify:\n"
                message += f"• Example of the first option (A): {example_a}\n"
                message += f"• Example of the last option (E): {example_e}\n\n"
            
            message += "You can ask me anything about this question, or describe your child's behavior in your own words, and I'll help you choose the most appropriate answer.\n\n"
            message += "How can I assist you today?"

    # Initialize conversation history
    conversation_history = [{
        "role": "assistant",
        "content": message
    }]

    return {
        "bot_response": message,
        "conversation_history": conversation_history,
        "current_message": ""  # Clear current_message so await_user_input will wait for first input
    }


def await_user_input_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Await input node - uses current_message from state if available, otherwise waits for input.
    """
    print("🟡 [NODE: await_user_input] - Processing user input...")
    logger.debug("[NODE: await_user_input]")

    # Check if message is already in state (API mode)
    user_input = state.get("current_message", "")
    conversation_history = state.get("conversation_history", [])

    # If no user input provided, we need to wait for it
    if not user_input or user_input.strip() == "":
        # Check if we just sent a message (like welcome) - in this case, wait for input
        if conversation_history and conversation_history[-1].get("role") == "assistant":
            print("   → No user input yet, waiting for interrupt...")
            logger.debug("[await_user_input] No input, waiting for user input via interrupt")
            user_input = interrupt({
                "type": "user_input",
                "prompt": "Awaiting your message..."
            })
        else:
            # No conversation yet - wait for input
            logger.debug("[await_user_input] No input, waiting for user input")
            user_input = interrupt({
                "type": "user_input",
                "prompt": "Awaiting your message..."
            })

    if user_input:
        print(f"   → Received user input: '{user_input[:50]}{'...' if len(user_input) > 50 else ''}'")
        logger.debug(f"[await_user_input] Received: '{user_input}'")

        # Add user message to conversation history if not already there
        # Check if the message is already in history (to avoid duplicates)
        # Check last 3 messages to avoid adding duplicate user messages
        is_duplicate = False
        if conversation_history:
            last_messages = conversation_history[-3:] if len(conversation_history) >= 3 else conversation_history
            for msg in last_messages:
                if msg.get("role") == "user" and msg.get("content") == user_input:
                    is_duplicate = True
                    logger.debug(f"[await_user_input] Duplicate user message detected, skipping")
                    break
        
        if not is_duplicate:
            conversation_history.append({
                "role": "user",
                "content": user_input
            })

    return {
        "current_message": user_input,
        "conversation_history": conversation_history
    }


def classify_intent_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Classify intent node - analyzes user input to determine intent.
    """
    print("🟢 [NODE: classify_intent] - Classifying user intent...")
    logger.debug("[NODE: classify_intent]")

    current_message = state.get("current_message", "")
    question_text = state.get("question_text", "")
    language = state.get("language", "en")
    conversation_history = state.get("conversation_history", [])

    try:
        result = intent_chain({
            "user_input": current_message,
            "current_question_text": question_text,
            "language": language,
            "conversation_history": conversation_history
        })

        intent = result.get("intent", "other")
        emotion = result.get("emotion", "neutral")

        print(f"   → Intent: {intent}, Emotion: {emotion}")
        logger.debug(f"[classify_intent] Intent: {intent}, Emotion: {emotion}")

        return {
            "last_intent": intent,
            "last_emotion": emotion
        }
    except Exception as e:
        logger.error(f"[classify_intent] Error: {e}", exc_info=True)
        return {
            "last_intent": "answering",
            "last_emotion": "neutral"
        }


def extract_qchat_answer_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Extract QCHAT answer node - extracts A-E option from user description.
    """
    print("🟣 [NODE: extract_qchat_answer] - Extracting answer from user input...")
    logger.debug("[NODE: extract_qchat_answer]")

    current_message = state.get("current_message", "")
    question_text = state.get("question_text", "")
    options = state.get("options", [])
    language = state.get("language", "en")
    conversation_history = state.get("conversation_history", [])

    try:
        result = qchat_answer_extraction_chain({
            "question_text": question_text,
            "user_input": current_message,
            "options": options,
            "language": language,
            "conversation_history": conversation_history
        })

        option = result.get("option", "unclear")
        confidence = result.get("confidence", 0.0)
        reasoning = result.get("reasoning", "")

        print(f"   → Extracted Option: {option}, Confidence: {confidence:.2f}")
        logger.debug(f"[extract_qchat_answer] Option: {option}, Confidence: {confidence}")

        # If option extracted successfully (not "unclear"), mark as complete
        is_complete = option != "unclear" and option in ["A", "B", "C", "D", "E"]

        # Calculate next question
        current_q = state.get("current_question_number", 1)
        next_q = current_q + 1 if is_complete else None

        # Generate acknowledgment if answer extracted
        if is_complete:
            parent_name = state.get("parent_name", "")
            if language == "ar":
                ack_msg = f"شكراً لك{' ' + parent_name if parent_name else ''}! لقد فهمت. سأسجل الخيار {option}."
            else:
                ack_msg = f"Thank you{' ' + parent_name if parent_name else ''}! I understand. I'll record Option {option}."

            # Add acknowledgment to history
            conversation_history.append({
                "role": "assistant",
                "content": ack_msg
            })

            return {
                "extracted_option": option,
                "extraction_confidence": confidence,
                "extraction_reasoning": reasoning,
                "is_answer_complete": True,
                "bot_response": ack_msg,
                "conversation_history": conversation_history,
                "next_question_number": next_q
            }
        else:
            return {
                "extracted_option": option,
                "extraction_confidence": confidence,
                "extraction_reasoning": reasoning,
                "is_answer_complete": False,
                "current_message": ""  # Clear current_message - will go to clarification which will handle it
            }

    except Exception as e:
        logger.error(f"[extract_qchat_answer] Error: {e}", exc_info=True)
        return {
            "extracted_option": "unclear",
            "extraction_confidence": 0.0,
            "is_answer_complete": False,
            "current_message": ""  # Clear current_message - will go to clarification which will handle it
        }


def handle_clarification_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Handle clarification node - provides question clarification.
    """
    print("🟠 [NODE: handle_clarification] - Providing clarification...")
    logger.debug("[NODE: handle_clarification]")

    current_message = state.get("current_message", "")
    question_text = state.get("question_text", "")
    language = state.get("language", "en")
    parent_name = state.get("parent_name", "")
    child_name = state.get("child_name", "your child")
    conversation_history = state.get("conversation_history", [])

    # Get example from first option if available
    options = state.get("options", [])
    pass_example = ""
    if options:
        first_option = options[0]
        pass_example = first_option.get("example", "")

    # Format recent context
    recent_context = format_conversation_history(conversation_history[-5:]) if len(conversation_history) > 0 else ""

    try:
        result = clarification_chain({
            "parent_name": parent_name,
            "child_name": child_name,
            "user_input": current_message,
            "question_text": question_text,
            "pass_example": pass_example,
            "previous_context": recent_context,
            "language": language
        })

        clarification_text = result.get("clarification_text", "")

        # Check if we're repeating the same response (prevent loops)
        if conversation_history:
            last_assistant_msg = None
            for msg in reversed(conversation_history):
                if msg.get("role") == "assistant":
                    last_assistant_msg = msg.get("content", "")
                    break
            
            # If the last assistant message is the same, don't add it again
            if last_assistant_msg == clarification_text:
                logger.warning("[handle_clarification] Duplicate response detected, skipping")
                return {
                    "bot_response": clarification_text,
                    "conversation_history": conversation_history,
                    "current_message": ""  # Clear current_message to stop the graph and wait for new input
                }

        # Add to conversation history
        conversation_history.append({
            "role": "assistant",
            "content": clarification_text
        })

        return {
            "bot_response": clarification_text,
            "conversation_history": conversation_history,
            "current_message": ""  # Clear current_message so await_user_input will wait for next input
        }
    except Exception as e:
        logger.error(f"[handle_clarification] Error: {e}", exc_info=True)
        # Fallback
        if language == "ar":
            fallback = f"دعني أوضح: {question_text}"
        else:
            fallback = f"Let me clarify: {question_text}"

        conversation_history.append({
            "role": "assistant",
            "content": fallback
        })

        return {
            "bot_response": fallback,
            "conversation_history": conversation_history,
            "current_message": ""  # Clear current_message so await_user_input will wait for next input
        }


def handle_asking_question_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Handle asking question node - answers user's questions about the assessment question.
    """
    print("🔴 [NODE: handle_asking_question] - Answering user's question...")
    logger.debug("[NODE: handle_asking_question]")

    # Reuse clarification logic for answering questions
    return handle_clarification_node(state)


def handle_greeting_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Handle greeting node - acknowledges greetings professionally in one line and smoothly transitions to the clarified question.
    """
    print("⚪ [NODE: handle_greeting] - Handling greeting...")
    logger.debug("[NODE: handle_greeting]")

    current_message = state.get("current_message", "")
    question_text = state.get("question_text", "")
    question_number = state.get("current_question_number", 1)
    language = state.get("language", "en")
    parent_name = state.get("parent_name", "")
    child_name = state.get("child_name", "")
    options = state.get("options", [])
    conversation_history = state.get("conversation_history", [])

    # Replace [child_name] placeholder with actual child name in question
    display_question = question_text
    if child_name:
        display_question = question_text.replace("[child_name]", child_name)
    elif "[child_name]" in display_question:
        display_question = display_question.replace("[child_name]", "your child")

    # Get example for clarification (use first example from option A)
    example = ""
    if options:
        for opt in options:
            if opt.get("value") == "A" and opt.get("example"):
                example = opt["example"]
                # Replace [child_name] in example
                if child_name:
                    example = example.replace("[child_name]", child_name)
                elif "[child_name]" in example:
                    example = example.replace("[child_name]", "your child")
                break

    # Use welcome chain to generate professional, natural greeting response
    # The chain will handle greeting acknowledgment and smooth transition to question
    try:
        result = qchat_welcome_chain({
            "language": language,
            "parent_name": parent_name,
            "child_name": child_name or "your child",
            "question_number": question_number,
            "question_text": display_question,
            "example_a": example,
            "example_e": "",
        })
        
        welcome_message = result.get("message", "")
        print(f"🟢 [NODE: handle_greeting] - Welcome message: {welcome_message}")
        
        if welcome_message:
            # Use the full AI-generated message - it already includes greeting acknowledgment and question
            message = welcome_message
        else:
            raise ValueError("Empty message from welcome chain")
            
    except Exception as e:
        print(f"🔴 [NODE: handle_greeting] - Error generating professional greeting response: {e}")
        logger.error(f"Error generating professional greeting response: {e}", exc_info=True)
        # Fallback: simple direct message
        if language == "ar":
            greeting_ack = f"مرحباً{' ' + parent_name if parent_name else ''}، سعيد بلقائك!"
            if example:
                question_asking = f" دعني أسألك: {display_question} مثال: {example}."
            else:
                question_asking = f" دعني أسألك: {display_question}"
            message = f"{greeting_ack}{question_asking}"
        else:
            greeting_ack = f"Hello{' ' + parent_name if parent_name else ''}, nice to meet you!"
            if example:
                question_asking = f" Let me ask: {display_question} Example: {example}."
            else:
                question_asking = f" Let me ask: {display_question}"
            message = f"{greeting_ack}{question_asking}"

    conversation_history.append({
        "role": "assistant",
        "content": message
    })

    return {
        "bot_response": message,
        "conversation_history": conversation_history,
        "current_message": ""  # Clear current_message so await_user_input will wait for next input
    }


def handle_off_topic_node(state: QChatAssistantState) -> Dict[str, Any]:
    """
    Handle off-topic node - warmly answers parent's question briefly, then smoothly redirects to the clarified question.
    """
    print("⚫ [NODE: handle_off_topic] - Handling off-topic and redirecting...")
    logger.debug("[NODE: handle_off_topic]")

    current_message = state.get("current_message", "")
    question_text = state.get("question_text", "")
    question_number = state.get("current_question_number", 1)
    language = state.get("language", "en")
    parent_name = state.get("parent_name", "")
    child_name = state.get("child_name", "")
    options = state.get("options", [])
    conversation_history = state.get("conversation_history", [])

    # Replace [child_name] placeholder with actual child name in question
    display_question = question_text
    if child_name:
        display_question = question_text.replace("[child_name]", child_name)
    elif "[child_name]" in display_question:
        display_question = display_question.replace("[child_name]", "your child")

    # Get example for clarification (use first example from option A)
    example = ""
    if options:
        for opt in options:
            if opt.get("value") == "A" and opt.get("example"):
                example = opt["example"]
                # Replace [child_name] in example
                if child_name:
                    example = example.replace("[child_name]", child_name)
                elif "[child_name]" in example:
                    example = example.replace("[child_name]", "your child")
                break

    # Use redirect chain to generate professional, warm response
    # It will answer their off-topic question briefly and smoothly transition to the clarified question
    try:
        # Track unrelated count (simple approach - could be enhanced with state tracking)
        unrelated_count = 1  # Default to 1, could be tracked in state if needed
        
        result = redirect_chain({
            "language": language,
            "parent_name": parent_name,
            "child_name": child_name or "your child",
            "question_text": display_question,
            "user_input": current_message,
            "unrelated_count": unrelated_count,
            "example": example,
            "example_a": example,  # For backward compatibility
            "conversation_history": conversation_history,
        })
        
        message = result.get("redirect_message", "")
        
        if not message:
            raise ValueError("Empty message from redirect chain")
            
    except Exception as e:
        logger.error(f"Error generating professional redirect response: {e}", exc_info=True)
        # Fallback: simple direct message
        if language == "ar":
            if example:
                message = f"شكراً لسؤالك{' ' + parent_name if parent_name else ''}، أفهم اهتمامك. دعني أسألك: {display_question} مثال: {example}."
            else:
                message = f"شكراً لسؤالك{' ' + parent_name if parent_name else ''}، أفهم اهتمامك. دعني أسألك: {display_question}"
        else:
            if example:
                message = f"Thanks for your question{' ' + parent_name if parent_name else ''}, I understand your concern. Let me ask: {display_question} Example: {example}."
            else:
                message = f"Thanks for your question{' ' + parent_name if parent_name else ''}, I understand your concern. Let me ask: {display_question}"

    conversation_history.append({
        "role": "assistant",
        "content": message
    })

    return {
        "bot_response": message,
        "conversation_history": conversation_history,
        "current_message": ""  # Clear current_message so await_user_input will wait for next input
    }


# ============================================================================
# ROUTING FUNCTIONS
# ============================================================================

def route_after_welcome(state: QChatAssistantState) -> str:
    """Route after welcome - if conversation exists, go to await_user_input, else await_user_input."""
    conversation_history = state.get("conversation_history", [])
    
    # If conversation already exists, we skipped welcome, go to await_user_input
    if conversation_history:
        print(f"🔀 [ROUTE: route_after_welcome] - Conversation exists, routing to await_user_input")
        logger.debug(f"[route_after_welcome] Conversation exists, routing to await_user_input")
        return "await_user_input"
    
    # First time - go to await_user_input
    print(f"🔀 [ROUTE: route_after_welcome] - First time, routing to await_user_input")
    logger.debug(f"[route_after_welcome] First time, routing to await_user_input")
    return "await_user_input"


def route_after_await_input(state: QChatAssistantState) -> str:
    """Route after awaiting input - always go to classify_intent if we have input, else END."""
    current_message = state.get("current_message", "")
    conversation_history = state.get("conversation_history", [])
    
    # If we have a user message, route to classify_intent
    if current_message and current_message.strip():
        print(f"🔀 [ROUTE: route_after_await_input] - User input received, routing to classify_intent")
        logger.debug(f"[route_after_await_input] User input received, routing to classify_intent")
        return "classify_intent"
    
    # If no input and last message is from assistant (we just sent welcome), end
    # This means we're waiting for user input via interrupt
    if conversation_history and conversation_history[-1].get("role") == "assistant":
        print(f"🔀 [ROUTE: route_after_await_input] - No input, ending (waiting for interrupt)")
        logger.debug(f"[route_after_await_input] No input, ending (waiting for interrupt)")
        return END
    
    # Default: route to classify_intent (shouldn't reach here normally)
    print(f"🔀 [ROUTE: route_after_await_input] - Default routing to classify_intent")
    logger.debug(f"[route_after_await_input] Default routing to classify_intent")
    return "classify_intent"


def route_by_intent(state: QChatAssistantState) -> str:
    """Route based on detected intent."""
    intent = state.get("last_intent", "other")

    print(f"🔀 [ROUTE: route_by_intent] - Intent: {intent}")
    logger.debug(f"[route_by_intent] Intent: {intent}")

    routing_map = {
        "answering": "extract_qchat_answer",
        "clarification": "handle_clarification",
        "asking_question": "handle_asking_question",
        "question_related_query": "handle_asking_question",
        "greeting": "handle_greeting",
        "off_topic": "handle_off_topic",
        "other": "handle_clarification"  # Default to clarification for safety
    }

    route = routing_map.get(intent, "handle_clarification")
    print(f"   → Routing to: {route}")
    logger.debug(f"[route_by_intent] → Routing to: {route}")
    return route


def route_after_extraction(state: QChatAssistantState) -> str:
    """Route after answer extraction - END if complete, else clarification."""
    is_complete = state.get("is_answer_complete", False)
    extracted_option = state.get("extracted_option", "unclear")

    if is_complete and extracted_option in ["A", "B", "C", "D", "E"]:
        print(f"🔀 [ROUTE: route_after_extraction] - Answer complete: {extracted_option}, ending")
        logger.debug(f"[route_after_extraction] Answer complete: {extracted_option}, ending")
        return END
    else:
        print(f"🔀 [ROUTE: route_after_extraction] - Answer unclear, requesting clarification")
        logger.debug(f"[route_after_extraction] Answer unclear, requesting clarification")
        return "handle_clarification"


def route_after_clarification(state: QChatAssistantState) -> str:
    """Route after clarification - always go to await_user_input to wait for next user input."""
    print("🔀 [ROUTE: route_after_clarification] - Routing to await_user_input")
    logger.debug("[route_after_clarification] Routing to await_user_input")
    return "await_user_input"


# ============================================================================
# GRAPH CREATION
# ============================================================================

def create_qchat_assistant_graph() -> StateGraph:
    """
    Create and configure the QCHAT assistant graph workflow.

    Returns:
        Configured StateGraph instance
    """
    # Create graph
    workflow = StateGraph(QChatAssistantState)

    # Add nodes
    workflow.add_node("welcome", welcome_node)
    workflow.add_node("await_user_input", await_user_input_node)
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("extract_qchat_answer", extract_qchat_answer_node)
    workflow.add_node("handle_clarification", handle_clarification_node)
    workflow.add_node("handle_asking_question", handle_asking_question_node)
    workflow.add_node("handle_greeting", handle_greeting_node)
    workflow.add_node("handle_off_topic", handle_off_topic_node)

    # Set entry point
    workflow.set_entry_point("welcome")

    # Add edges
    # welcome → route (always goes to await_user_input, but check if we should skip welcome)
    workflow.add_conditional_edges(
        "welcome",
        route_after_welcome,
        {
            "await_user_input": "await_user_input"
        }
    )

    # await_user_input → route based on whether we have input
    workflow.add_conditional_edges(
        "await_user_input",
        route_after_await_input,
        {
            "classify_intent": "classify_intent",

        }
    )

    # classify_intent → route by intent (never goes back to await_user_input)
    workflow.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "extract_qchat_answer": "extract_qchat_answer",
            "handle_clarification": "handle_clarification",
            "handle_asking_question": "handle_asking_question",
            "handle_greeting": "handle_greeting",
            "handle_off_topic": "handle_off_topic"
        }
    )

    # extract_qchat_answer → route (END if complete, else clarification)
    workflow.add_conditional_edges(
        "extract_qchat_answer",
        route_after_extraction,
        {
            END: END,
            "handle_clarification": "handle_clarification"
        }
    )

    # handle_clarification → await_user_input (always)
    workflow.add_edge("handle_clarification", "await_user_input")

    # handle_asking_question → await_user_input (always)
    workflow.add_edge("handle_asking_question", "await_user_input")

    # handle_greeting → await_user_input (always)
    workflow.add_edge("handle_greeting", "await_user_input")

    # handle_off_topic → await_user_input (always)
    workflow.add_edge("handle_off_topic", "await_user_input")

    # Compile with checkpointer for conversation persistence
    checkpointer = MemorySaver()
    compiled_graph = workflow.compile(checkpointer=checkpointer)
    
    # Set recursion limit to prevent infinite loops
    # This will be used when invoking the graph
    return compiled_graph


if __name__ == "__main__":
    """Test the QCHAT assistant graph."""
    graph = create_qchat_assistant_graph()
    logger.info("QCHAT assistant graph created successfully!")
    logger.debug("\nGraph structure:")
    logger.debug(graph.get_graph().draw_ascii())
