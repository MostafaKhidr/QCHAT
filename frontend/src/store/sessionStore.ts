import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LocalSession,
  ChatMessage,
  SessionStatus,
  MessageRole,
  LanguageType,
  RiskLevel,
} from '../types/api.types';

interface SessionState {
  // Current active session
  currentSession: LocalSession | null;
  sessionToken: string | null;

  // Chat messages
  messages: ChatMessage[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Question tracking
  currentQuestionNumber: number | null;

  // Session history (stored locally)
  sessionHistory: LocalSession[];

  // Actions
  setCurrentSession: (session: LocalSession, token: string) => void;
  addMessage: (role: MessageRole, content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentQuestionNumber: (questionNumber: number | null) => void;
  updateSessionStatus: (status: SessionStatus) => void;
  updateSessionScore: (score: number, riskLevel: RiskLevel) => void;
  clearCurrentSession: () => void;
  addToHistory: (session: LocalSession) => void;
  clearMessages: () => void;
  loadSession: (token: string) => LocalSession | null;
  resetAll: () => void;
}

const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessionToken: null,
      messages: [],
      isLoading: false,
      error: null,
      currentQuestionNumber: null,
      sessionHistory: [],

      // Set current active session
      setCurrentSession: (session, token) => {
        set({
          currentSession: session,
          sessionToken: token,
          messages: [],
          error: null,
          currentQuestionNumber: null,
        });
      },

      // Add chat message
      addMessage: (role, content) => {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: new Date(),
        };
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Set error
      setError: (error) => {
        set({ error });
      },

      // Set current question number
      setCurrentQuestionNumber: (questionNumber) => {
        set({ currentQuestionNumber: questionNumber });
      },

      // Update session status
      updateSessionStatus: (status) => {
        set((state) => {
          if (!state.currentSession) return state;

          const updatedSession = {
            ...state.currentSession,
            status,
          };

          // Update session history if completed
          if (status === 'completed') {
            const historyIndex = state.sessionHistory.findIndex(
              (s) => s.session_token === state.sessionToken
            );

            let newHistory = [...state.sessionHistory];
            if (historyIndex >= 0) {
              newHistory[historyIndex] = updatedSession;
            } else {
              newHistory = [...newHistory, updatedSession];
            }

            return {
              currentSession: updatedSession,
              sessionHistory: newHistory,
            };
          }

          return {
            currentSession: updatedSession,
          };
        });
      },

      // Update session score and risk level
      updateSessionScore: (score, riskLevel) => {
        set((state) => {
          if (!state.currentSession) return state;

          const updatedSession = {
            ...state.currentSession,
            final_score: score,
            risk_level: riskLevel,
          };

          // Also update in history if exists, or add if it doesn't
          const historyIndex = state.sessionHistory.findIndex(
            (s) => s.session_token === state.sessionToken
          );

          let newHistory = [...state.sessionHistory];
          if (historyIndex >= 0) {
            newHistory[historyIndex] = updatedSession;
          } else {
            // Add to history if not already there
            newHistory = [...newHistory, updatedSession];
          }

          return {
            currentSession: updatedSession,
            sessionHistory: newHistory,
          };
        });
      },

      // Clear current session (but keep in history)
      clearCurrentSession: () => {
        set({
          currentSession: null,
          sessionToken: null,
          messages: [],
          currentQuestionNumber: null,
          error: null,
          isLoading: false,
        });
      },

      // Add session to history
      addToHistory: (session) => {
        set((state) => {
          const existingIndex = state.sessionHistory.findIndex(
            (s) => s.session_token === session.session_token
          );

          let newHistory = [...state.sessionHistory];
          if (existingIndex >= 0) {
            newHistory[existingIndex] = session;
          } else {
            newHistory = [...newHistory, session];
          }

          return {
            sessionHistory: newHistory,
          };
        });
      },

      // Clear messages only
      clearMessages: () => {
        set({ messages: [] });
      },

      // Load session from history by token
      loadSession: (token) => {
        const session = get().sessionHistory.find((s) => s.session_token === token);
        if (session) {
          set({
            currentSession: session,
            sessionToken: token,
            messages: [],
            error: null,
          });
          return session;
        }
        return null;
      },

      // Reset all state
      resetAll: () => {
        set({
          currentSession: null,
          sessionToken: null,
          messages: [],
          isLoading: false,
          error: null,
          currentQuestionNumber: null,
          sessionHistory: [],
        });
      },
    }),
    {
      name: 'qchat-session-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        currentSession: state.currentSession,
        sessionToken: state.sessionToken,
        sessionHistory: state.sessionHistory,
      }),
    }
  )
);

export default useSessionStore;
