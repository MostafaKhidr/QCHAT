import api from './api';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  BotMessageResponse,
  SessionInfoResponse,
  ScreeningReportResponse,
  CurrentQuestionResponse,
  ContactRequestSubmission,
  ContactRequestResponse,
} from '../types/api.types';
import { AnswerType } from '../types/api.types';

/**
 * M-CHAT API Service
 * All user-facing endpoints (no authentication required)
 */
class MChatAPI {
  /**
   * Create a new screening session
   * POST /api/sessions/create
   */
  async createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
    const response = await api.post<CreateSessionResponse>('/api/sessions/create', data);
    return response.data;
  }

  /**
   * Start session and get welcome message
   * GET /api/sessions/{token}/start
   */
  async startSession(sessionToken: string): Promise<BotMessageResponse> {
    const response = await api.get<BotMessageResponse>(`/api/sessions/${sessionToken}/start`);
    return response.data;
  }

  /**
   * Send user message to chat
   * POST /api/sessions/{token}/message
   */
  async sendMessage(sessionToken: string, message: string): Promise<BotMessageResponse> {
    const response = await api.post<BotMessageResponse>(
      `/api/sessions/${sessionToken}/message`,
      { message } as SendMessageRequest
    );
    return response.data;
  }

  /**
   * Get session information and conversation history
   * GET /api/sessions/{token}
   */
  async getSession(sessionToken: string): Promise<SessionInfoResponse> {
    const response = await api.get<SessionInfoResponse>(`/api/sessions/${sessionToken}`);
    return response.data;
  }

  /**
   * Get final screening report
   * GET /api/sessions/{token}/report
   */
  async getReport(sessionToken: string): Promise<ScreeningReportResponse> {
    const response = await api.get<ScreeningReportResponse>(`/api/sessions/${sessionToken}/report`);
    return response.data;
  }

  /**
   * Get current question details
   * GET /api/sessions/{token}/question/current
   */
  async getCurrentQuestion(sessionToken: string): Promise<CurrentQuestionResponse> {
    const response = await api.get<CurrentQuestionResponse>(
      `/api/sessions/${sessionToken}/question/current`
    );
    return response.data;
  }

  /**
   * Submit contact request form
   * POST /api/sessions/contact-request
   */
  async submitContactRequest(data: ContactRequestSubmission): Promise<ContactRequestResponse> {
    const response = await api.post<ContactRequestResponse>('/api/sessions/contact-request', data);
    return response.data;
  }

  /**
   * Batch update answers for a completed session (Edit Mode)
   * PATCH /api/sessions/{token}/answers/batch
   */
  async batchUpdateAnswers(
    sessionToken: string,
    answers: Array<{ question_number: number; answer: AnswerType }>
  ): Promise<ScreeningReportResponse> {
    const response = await api.patch<ScreeningReportResponse>(
      `/api/sessions/${sessionToken}/answers/batch`,
      { answers }
    );
    return response.data;
  }
}

// Export singleton instance
export const mchatAPI = new MChatAPI();
export default mchatAPI;
