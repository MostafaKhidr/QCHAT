/**
 * Q-CHAT-10 API Client
 * Handles all API communication with Q-CHAT backend
 */

import api from './api';
import type {
  QChatCreateSessionRequest,
  QChatCreateSessionResponse,
  QChatQuestion,
  QChatSessionResponse,
  QChatSubmitAnswerRequest,
  QChatSubmitAnswerResponse,
  QChatReport,
} from '../types/api.types';

class QChatAPI {
  private static instance: QChatAPI;

  private constructor() {}

  static getInstance(): QChatAPI {
    if (!QChatAPI.instance) {
      QChatAPI.instance = new QChatAPI();
    }
    return QChatAPI.instance;
  }

  /**
   * Create a new Q-CHAT session
   */
  async createSession(data: QChatCreateSessionRequest): Promise<QChatCreateSessionResponse> {
    const response = await api.post<QChatCreateSessionResponse>('/api/sessions/create', data);
    return response.data;
  }

  /**
   * Get session details
   */
  async getSession(sessionToken: string): Promise<QChatSessionResponse> {
    const response = await api.get<QChatSessionResponse>(`/api/sessions/${sessionToken}`);
    return response.data;
  }

  /**
   * Get a specific question
   */
  async getQuestion(sessionToken: string, questionNumber: number): Promise<QChatQuestion> {
    const response = await api.get<QChatQuestion>(
      `/api/sessions/${sessionToken}/question/${questionNumber}`
    );
    return response.data;
  }

  /**
   * Submit an answer to a question
   */
  async submitAnswer(
    sessionToken: string,
    data: QChatSubmitAnswerRequest
  ): Promise<QChatSubmitAnswerResponse> {
    const response = await api.post<QChatSubmitAnswerResponse>(
      `/api/sessions/${sessionToken}/answer`,
      data
    );
    return response.data;
  }

  /**
   * Get the screening report for a completed session
   */
  async getReport(sessionToken: string): Promise<QChatReport> {
    const response = await api.get<QChatReport>(`/api/sessions/${sessionToken}/report`);
    return response.data;
  }

  /**
   * Get all Q-CHAT questions
   */
  async getAllQuestions(): Promise<QChatQuestion[]> {
    const response = await api.get<QChatQuestion[]>('/api/questions');
    return response.data;
  }
}

export default QChatAPI.getInstance();
