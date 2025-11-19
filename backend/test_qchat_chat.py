#!/usr/bin/env python3
"""
Interactive terminal test script for QCHAT Assistant Graph.

This script allows you to test the QCHAT chat flow in the terminal.
Run it with: python test_qchat_chat.py
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.workflows.qchat_assistant_graph import create_qchat_assistant_graph
from app.data.qchat_questions import QChatDatabase
import uuid


def get_question_data(question_number: int, language: str = "en"):
    """Get question data for testing."""
    qchat_db = QChatDatabase()
    lang_key = "arabic" if language == "ar" else "english"
    q_data = qchat_db.get_question(question_number, lang_key)
    
    if not q_data:
        raise ValueError(f"Question {question_number} not found")
    
    question_text = q_data.get("conversational", q_data.get("formal", ""))
    options_list = []
    
    q_options = q_data.get("options", [])
    for opt in q_options:
        options_list.append({
            "value": opt["value"],
            "label": opt["label"],
            "example": q_data.get("examples", {}).get(opt["value"], [""])[0] if q_data.get("examples") else ""
        })
    
    return question_text, options_list


def print_separator():
    """Print a visual separator."""
    print("\n" + "=" * 70 + "\n")


def print_bot_message(message: str):
    """Print bot message with formatting."""
    print(f"🤖 Assistant: {message}\n")


def print_user_message(message: str):
    """Print user message with formatting."""
    print(f"👤 You: {message}\n")


def test_qchat_chat():
    """Main test function for QCHAT chat flow."""
    print_separator()
    print("🧪 QCHAT Assistant Chat Flow Test")
    print_separator()
    
    # Configuration
    print("Configuration:")
    question_number = input("Enter question number (1-10) [default: 1]: ").strip()
    question_number = int(question_number) if question_number else 1
    
    language = input("Enter language (en/ar) [default: en]: ").strip().lower()
    language = language if language in ["en", "ar"] else "en"
    
    parent_name = input("Enter parent name [optional]: ").strip() or None
    child_name = input("Enter child name [optional]: ").strip() or None
    
    print_separator()
    
    # Get question data
    try:
        question_text, options = get_question_data(question_number, language)
    except ValueError as e:
        print(f"❌ Error: {e}")
        return
    
    # Display question info
    print(f"📋 Question {question_number}:")
    print(f"   {question_text}\n")
    print("Options:")
    for opt in options:
        print(f"   {opt['value']}: {opt['label']}")
    print_separator()
    
    # Initialize graph
    print("Initializing QCHAT Assistant Graph...")
    graph = create_qchat_assistant_graph()
    
    # Create initial state
    chat_id = str(uuid.uuid4())
    session_token = f"test_session_{uuid.uuid4().hex[:8]}"
    
    initial_state = {
        "session_token": session_token,
        "current_question_number": question_number,
        "language": language,
        "question_text": question_text,
        "options": options,
        "parent_name": parent_name or "",
        "child_name": child_name or "your child",
        "chat_id": chat_id,
        "conversation_history": [],
        "is_answer_complete": False,
    }
    
    # Configuration for graph execution
    config = {"configurable": {"thread_id": chat_id}}
    
    print("✅ Graph initialized!\n")
    print_separator()
    print("💬 Chat started! Type your messages below.")
    print("   Type 'exit' or 'quit' to end the conversation.")
    print("   Type 'state' to see current state.")
    print_separator()
    
    # Initial state for streaming
    current_state = initial_state
    
    try:
        # Get welcome message by invoking the graph once (it will stop at await_user_input)
        print("🔄 Processing welcome message...\n")
        
        # Set recursion limit for welcome message
        config_with_limit = {
            **config,
            "recursion_limit": 15
        }
        
        # Use invoke to get the welcome message at once
        # The graph will stop at await_user_input when there's no current_message
        result = graph.invoke(initial_state, config_with_limit)
        current_state = result
        
        if "bot_response" in result and result["bot_response"]:
            print_bot_message(result["bot_response"])
        
        # Main conversation loop
        while True:
            # Get user input
            user_input = input("👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle special commands
            if user_input.lower() in ["exit", "quit"]:
                print("\n👋 Ending conversation. Goodbye!\n")
                break
            
            if user_input.lower() == "state":
                print("\n📊 Current State:")
                print(f"   Intent: {current_state.get('last_intent', 'N/A')}")
                print(f"   Emotion: {current_state.get('last_emotion', 'N/A')}")
                print(f"   Extracted Option: {current_state.get('extracted_option', 'N/A')}")
                print(f"   Confidence: {current_state.get('extraction_confidence', 'N/A')}")
                print(f"   Answer Complete: {current_state.get('is_answer_complete', False)}")
                print(f"   Conversation History Length: {len(current_state.get('conversation_history', []))}")
                print()
                continue
            
            # Update state with user message
            current_state["current_message"] = user_input
            
            # Process the user message
            print("\n🔄 Processing...\n")
            
            try:
                # Set recursion limit to prevent infinite loops
                config_with_limit = {
                    **config,
                    "recursion_limit": 15  # Limit to 15 steps to prevent infinite loops
                }
                
                # Use invoke to get the full response at once
                # The graph will stop naturally when await_user_input sees no new message
                result = graph.invoke(current_state, config_with_limit)
                current_state = result
                
                # Check if we got a bot response
                if "bot_response" in result and result["bot_response"]:
                    bot_response = result["bot_response"]
                    print_bot_message(bot_response)
                
                # Check if answer is complete
                if result.get("is_answer_complete") and result.get("extracted_option") in ["A", "B", "C", "D", "E"]:
                    extracted = result.get("extracted_option")
                    confidence = result.get("extraction_confidence", 0.0)
                    print_separator()
                    print(f"✅ Answer extracted: {extracted} (confidence: {confidence:.2f})")
                    print("✅ Conversation complete for this question!")
                    print_separator()
                    
                    # Ask if user wants to continue
                    continue_choice = input("Continue with another message? (y/n) [default: n]: ").strip().lower()
                    if continue_choice != "y":
                        print("\n👋 Ending conversation. Goodbye!\n")
                        return
                    print()
                
            except Exception as e:
                print(f"\n❌ Error during processing: {e}")
                import traceback
                traceback.print_exc()
                print()
                continue
            
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!\n")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_qchat_chat()

