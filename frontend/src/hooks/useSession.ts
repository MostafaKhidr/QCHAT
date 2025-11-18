import { useState, useCallback } from 'react';
import { mchatAPI } from '../services/mchat-api';
import qchatAPI from '../services/qchat-api';
import useSessionStore from '../store/sessionStore';
import type {
  CreateSessionRequest,
  LocalSession,
  APIError,
  QChatCreateSessionRequest,
  QChatLocalSession,
} from '../types/api.types';

/**
 * Custom hook for session management
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
   * Create a new screening session
   */
  const createSession = useCallback(async (data: CreateSessionRequest): Promise<string | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await mchatAPI.createSession(data);

      // Create local session object
      const localSession: LocalSession = {
        session_token: response.session_token,
        mrn: data.mrn,
        parent_name: data.parent_name,
        child_name: data.child_name,
        child_age_months: data.child_age_months,
        language: data.language,
        status: 'created',
        created_at: new Date().toISOString(),
      };

      // Store in state and history
      setCurrentSession(localSession, response.session_token);
      addToHistory(localSession);

      setIsCreating(false);
      return response.session_token;
    } catch (error) {
      const apiError = error as APIError;
      setCreateError(apiError.detail || 'Failed to create session');
      setIsCreating(false);
      return null;
    }
  }, [setCurrentSession, addToHistory]);

  /**
   * Resume an existing session by token
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
      const sessionInfo = await mchatAPI.getSession(token);

      const localSessionFromAPI: LocalSession = {
        session_token: token,
        mrn: sessionInfo.mrn,
        parent_name: sessionInfo.parent_name,
        child_name: sessionInfo.child_name,
        child_age_months: sessionInfo.child_age_months,
        language: sessionInfo.language,
        status: sessionInfo.status,
        created_at: sessionInfo.created_at,
        final_score: sessionInfo.total_score,
        risk_level: sessionInfo.risk_level || undefined,
      };

      setCurrentSession(localSessionFromAPI, token);
      addToHistory(localSessionFromAPI);

      setIsCreating(false);
      return true;
    } catch (error) {
      const apiError = error as APIError;
      setCreateError(apiError.detail || 'Failed to resume session');
      setIsCreating(false);
      return false;
    }
  }, [loadSession, setCurrentSession, addToHistory]);

  /**
   * Create a new Q-CHAT session (simplified, no MRN required)
   */
  const createQChatSession = useCallback(async (data: QChatCreateSessionRequest): Promise<string | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await qchatAPI.createSession(data);

      // Create local session object for Q-CHAT
      const localSession: QChatLocalSession = {
        session_token: response.session_token,
        mrn: data.mrn || '',
        child_name: response.child_name,
        child_age_months: response.child_age_months,
        parent_name: data.parent_name,
        language: data.language,
        status: 'created',
        created_at: response.created_at,
        current_question: 1,
      };

      // Store in state (we can reuse the same store structure)
      setCurrentSession(localSession as any, response.session_token);
      addToHistory(localSession as any);

      setIsCreating(false);
      return response.session_token;
    } catch (error) {
      const apiError = error as APIError;
      setCreateError(apiError.detail || 'Failed to create Q-CHAT session');
      setIsCreating(false);
      return null;
    }
  }, [setCurrentSession, addToHistory]);

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
    createQChatSession,
    resumeSession,
    endSession,
  };
};
