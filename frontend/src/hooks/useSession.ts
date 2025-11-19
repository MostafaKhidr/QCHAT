import { useState, useCallback } from 'react';
import qchatAPI from '../services/qchat-api';
import useSessionStore from '../store/sessionStore';
import type {
  APIError,
  QChatCreateSessionRequest,
  QChatLocalSession,
} from '../types/api.types';
import { SessionStatus } from '../types/api.types';

/**
 * Custom hook for Q-CHAT-10 session management
 */
export const useSession = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    currentSession,
    sessionToken,
    setCurrentSession,
    clearCurrentSession,
    addToHistory,
    loadSession,
  } = useSessionStore();

  /**
   * Create a new Q-CHAT-10 session
   */
  const createSession = useCallback(async (data: QChatCreateSessionRequest): Promise<string | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await qchatAPI.createSession(data);

      // Create local session object for Q-CHAT-10
      const localSession: QChatLocalSession = {
        session_token: response.session_token,
        child_name: response.child_name,
        child_age_months: response.child_age_months,
        parent_name: data.parent_name,
        language: data.language,
        status: SessionStatus.CREATED,
        created_at: response.created_at,
        current_question: 1,
      };

      // Store in state and history
      setCurrentSession(localSession as any, response.session_token);
      addToHistory(localSession as any);

      setIsCreating(false);
      return response.session_token;
    } catch (error) {
      const apiError = error as APIError;
      setCreateError(apiError.detail || 'Failed to create Q-CHAT-10 session');
      setIsCreating(false);
      return null;
    }
  }, [setCurrentSession, addToHistory]);

  /**
   * Resume an existing Q-CHAT-10 session by token
   */
  const resumeSession = useCallback(async (token: string): Promise<boolean> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      // First try to load from local storage
      const localSession = loadSession(token);

      if (localSession) {
        setIsCreating(false);
        return true;
      }

      // If not found locally, fetch from API
      const sessionInfo = await qchatAPI.getSession(token);

      const localSessionFromAPI: QChatLocalSession = {
        session_token: token,
        child_name: sessionInfo.child_name,
        child_age_months: sessionInfo.child_age_months,
        parent_name: sessionInfo.parent_name || '',
        language: sessionInfo.language as 'en' | 'ar',
        status: sessionInfo.status,
        created_at: sessionInfo.created_at,
        current_question: sessionInfo.current_question || 1,
      };

      setCurrentSession(localSessionFromAPI as any, token);
      addToHistory(localSessionFromAPI as any);

      setIsCreating(false);
      return true;
    } catch (error) {
      const apiError = error as APIError;
      setCreateError(apiError.detail || 'Failed to resume Q-CHAT-10 session');
      setIsCreating(false);
      return false;
    }
  }, [loadSession, setCurrentSession, addToHistory]);

  /**
   * End current session
   */
  const endSession = useCallback(() => {
    clearCurrentSession();
  }, [clearCurrentSession]);

  return {
    // State
    currentSession,
    sessionToken,
    isCreating,
    createError,

    // Actions
    createSession,
    resumeSession,
    endSession,
  };
};
