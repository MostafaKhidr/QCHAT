/**
 * QCHAT Chat Assistant API Service
 *
 * Provides methods for interacting with the QCHAT AI assistant chat endpoints.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatStartRequest {
  question_number: number;
  language: 'en' | 'ar';
}

export interface ChatStartResponse {
  message: string;
  chat_id: string;
  existing_messages: ChatMessage[];
}

export interface ChatMessageRequest {
  message: string;
  chat_id: string;
}

export interface ChatMessageResponse {
  message: string;
  extracted_option?: string; // A-E or null
  is_complete: boolean;
  next_question_number?: number;
  confidence?: number;
}

export const qchatChatAPI = {
  /**
   * Start a chat session for a specific question.
   * Returns welcome message and any existing messages if chat was reopened.
   */
  startChat: async (
    sessionToken: string,
    request: ChatStartRequest
  ): Promise<ChatStartResponse> => {
    const response = await axios.post<ChatStartResponse>(
      `${API_BASE_URL}/api/qchat/sessions/${sessionToken}/chat/start`,
      request
    );
    return response.data;
  },

  /**
   * Send a message to the chat assistant and get a response.
   * May return extracted_option if the assistant understood the answer.
   */
  sendMessage: async (
    sessionToken: string,
    request: ChatMessageRequest
  ): Promise<ChatMessageResponse> => {
    const response = await axios.post<ChatMessageResponse>(
      `${API_BASE_URL}/api/qchat/sessions/${sessionToken}/chat/message`,
      request
    );
    return response.data;
  },

  /**
   * Close/clear the current chat session.
   */
  closeChat: async (sessionToken: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/qchat/sessions/${sessionToken}/chat`);
  },
};

export default qchatChatAPI;
