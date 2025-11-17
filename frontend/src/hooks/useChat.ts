import { useState, useCallback } from 'react';
import { mchatAPI } from '../services/mchat-api';
import useSessionStore from '../store/sessionStore';
import type { APIError } from '../types/api.types';
import { MessageRole as MessageRoleEnum, SessionStatus as SessionStatusEnum } from '../types/api.types';

/**
 * Custom hook for chat management
 */
export const useChat = () => {
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const {
    sessionToken,
    currentSession,
    messages,
    addMessage,
    setLoading,
    setCurrentQuestionNumber,
    updateSessionStatus,
    setCurrentSession,
    clearMessages,
  } = useSessionStore();

  /**
   * Initialize chat session (get welcome message)
   * Returns { success: boolean, newSessionToken?: string } where newSessionToken is set if a new session was created
   */
  const initializeChat = useCallback(async (): Promise<{ success: boolean; newSessionToken?: string }> => {
    if (!sessionToken) {
      setChatError('No active session');
      return { success: false };
    }

    // Prevent duplicate initialization if messages already exist
    if (messages.length > 0) {
      return { success: true };
    }

    setLoading(true);
    setChatError(null);
    setIsTyping(true);

    try {
      const response = await mchatAPI.startSession(sessionToken);

      // Only add message if we don't already have messages (prevent duplicates)
      if (messages.length === 0) {
        addMessage(MessageRoleEnum.ASSISTANT, response.bot_message);
      }

      // Update state
      setCurrentQuestionNumber(response.current_question);
      if (response.session_status) {
        updateSessionStatus(response.session_status);
      }
      setIsComplete(response.is_complete);

      setIsTyping(false);
      setLoading(false);
      return { success: true };
    } catch (error) {
      const apiError = error as APIError;
      
      // Check if the error is "Session already completed"
      if (apiError.detail?.toLowerCase().includes('session already completed') || 
          apiError.detail?.toLowerCase().includes('already completed')) {
        
        // If we have session data, create a new session with the same parameters
        if (currentSession) {
          try {
            setIsTyping(true);
            setChatError(null);
            
            // Create a new session with the same parameters
            const newSessionResponse = await mchatAPI.createSession({
              mrn: currentSession.mrn,
              parent_name: currentSession.parent_name,
              child_name: currentSession.child_name,
              child_age_months: currentSession.child_age_months,
              language: currentSession.language,
            });

            // Create a new LocalSession object
            const newLocalSession = {
              session_token: newSessionResponse.session_token,
              mrn: currentSession.mrn,
              parent_name: currentSession.parent_name,
              child_name: currentSession.child_name,
              child_age_months: currentSession.child_age_months,
              language: currentSession.language,
              status: SessionStatusEnum.CREATED,
              created_at: new Date().toISOString(),
            };

            // Update the store with the new session
            // Note: setCurrentSession clears messages, so we need to add the message after
            setCurrentSession(newLocalSession, newSessionResponse.session_token);

            // Retry initialization with the new session token
            const retryResponse = await mchatAPI.startSession(newSessionResponse.session_token);
            
            // Add welcome message - check if it doesn't already exist to prevent duplicates
            const currentMessages = useSessionStore.getState().messages;
            const hasWelcomeMessage = currentMessages.some(
              msg => msg.role === MessageRoleEnum.ASSISTANT && msg.content.toLowerCase().includes('welcome')
            );
            if (!hasWelcomeMessage) {
              addMessage(MessageRoleEnum.ASSISTANT, retryResponse.bot_message);
            }

            // Update state
            setCurrentQuestionNumber(retryResponse.current_question);
            if (retryResponse.session_status) {
              updateSessionStatus(retryResponse.session_status);
            }
            setIsComplete(retryResponse.is_complete);

            setIsTyping(false);
            setLoading(false);
            // Return success with the new session token so the page can update the URL
            return { success: true, newSessionToken: newSessionResponse.session_token };
          } catch (createError) {
            const createApiError = createError as APIError;
            setChatError(createApiError.detail || 'Failed to create new session');
            setIsTyping(false);
            setLoading(false);
            return { success: false };
          }
        } else {
          // No session data available, can't create a new session
          setChatError('Session already completed. Please create a new session.');
          setIsTyping(false);
          setLoading(false);
          return { success: false };
        }
      } else {
        // Other errors
        setChatError(apiError.detail || 'Failed to initialize chat');
        setIsTyping(false);
        setLoading(false);
        return { success: false };
      }
    }
  }, [sessionToken, currentSession, messages.length, addMessage, setLoading, setCurrentQuestionNumber, updateSessionStatus, setCurrentSession, clearMessages]);

  /**
   * Send a message to the chat
   */
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!sessionToken) {
      setChatError('No active session');
      return false;
    }

    if (!message.trim()) {
      setChatError('Message cannot be empty');
      return false;
    }

    setIsSending(true);
    setChatError(null);
    setIsTyping(true);

    // Add user message immediately
    addMessage(MessageRoleEnum.USER, message);

    try {
      const response = await mchatAPI.sendMessage(sessionToken, message);

      // Add bot response
      addMessage(MessageRoleEnum.ASSISTANT, response.bot_message);

      // Update state
      setCurrentQuestionNumber(response.current_question);
      if (response.session_status) {
        updateSessionStatus(response.session_status);
      }
      setIsComplete(response.is_complete);

      setIsTyping(false);
      setIsSending(false);
      return true;
    } catch (error) {
      const apiError = error as APIError;
      setChatError(apiError.detail || 'Failed to send message');
      setIsTyping(false);
      setIsSending(false);
      return false;
    }
  }, [sessionToken, addMessage, setCurrentQuestionNumber, updateSessionStatus]);

  /**
   * Send quick answer (yes/no)
   */
  const sendQuickAnswer = useCallback(async (answer: 'yes' | 'no'): Promise<boolean> => {
    return await sendMessage(answer);
  }, [sendMessage]);

  /**
   * Reset chat error
   */
  const clearError = useCallback(() => {
    setChatError(null);
  }, []);

  return {
    // State
    messages,
    isSending,
    chatError,
    isTyping,
    isComplete,

    // Actions
    initializeChat,
    sendMessage,
    sendQuickAnswer,
    clearError,
  };
};
