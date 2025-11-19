// ==================== Enums ====================

export const SessionStatus = {
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type RiskLevel = typeof RiskLevel[keyof typeof RiskLevel];

export const AnswerType = {
  YES: 'yes',
  NO: 'no',
  UNANSWERED: 'unanswered',
} as const;

export type AnswerType = typeof AnswerType[keyof typeof AnswerType];

export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

export type MessageRole = typeof MessageRole[keyof typeof MessageRole];

export const LanguageType = {
  EN: 'en',
  AR: 'ar',
} as const;

export type LanguageType = typeof LanguageType[keyof typeof LanguageType];

export const ContactRequestStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  SESSION_CREATED: 'session_created',
  CLOSED: 'closed',
} as const;

export type ContactRequestStatus = typeof ContactRequestStatus[keyof typeof ContactRequestStatus];

// ==================== Request Types ====================

export interface CreateSessionRequest {
  mrn: string;
  parent_name: string;
  child_name: string;
  child_age_months: number;
  language: LanguageType;
}

export interface SendMessageRequest {
  message: string;
}

export interface ContactRequestSubmission {
  parent_name: string;
  parent_email: string;
  parent_phone?: string | null;
  child_name: string;
  child_age_months: number;
  preferred_language: LanguageType;
  message?: string | null;
}

// ==================== Response Types ====================

export interface CreateSessionResponse {
  session_id: string;
  session_token: string;
  session_url: string;
}

export interface BotMessageResponse {
  bot_message: string;
  session_status: SessionStatus;
  current_question: number | null;
  is_complete: boolean;
  next_question_text?: string | null;
}

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface SessionInfoResponse {
  session_id: string;
  mrn: string;
  parent_name: string;
  child_name: string;
  child_age_months: number;
  language: LanguageType;
  status: SessionStatus;
  current_question: number;
  total_score: number;
  risk_level: RiskLevel | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by_admin: boolean;
  messages: ConversationMessage[];
}

export interface QuestionBreakdownItem {
  question_number: number;
  question_text: string;
  patient_answer: AnswerType;
  ai_assessment: 'concern' | 'pass';
}

export interface ScreeningReportResponse {
  session_id: string;
  final_score: number;
  risk_level: RiskLevel;
  recommendations: string; // JSON array as string
  report_text: string;
  generated_at: string;
  question_breakdown?: QuestionBreakdownItem[];
  child_name?: string;
  mrn?: string;
  child_age_months?: number;
}

export interface CurrentQuestionResponse {
  question_number: number;
  text: string;
  examples_pass: string[];
  examples_fail: string[];
}

export interface ContactRequestResponse {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  child_name: string;
  child_age_months: number;
  preferred_language: LanguageType;
  message: string | null;
  status: ContactRequestStatus;
  created_session_id: string | null;
  handled_by_admin: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Error Types ====================

export interface APIError {
  detail: string;
  status?: number;
}

// ==================== Local State Types ====================

export interface LocalSession {
  session_token: string;
  mrn: string;
  parent_name: string;
  child_name: string;
  child_age_months: number;
  language: LanguageType;
  status: SessionStatus;
  created_at: string;
  final_score?: number;
  risk_level?: RiskLevel;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

// ==================== Form Types ====================

export interface SessionFormData {
  mrn: string;
  parentName: string;
  childName: string;
  childAgeMonths: number;
  language: LanguageType;
}

export interface ContactFormData {
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  childName: string;
  childAgeMonths: number;
  preferredLanguage: LanguageType;
  message?: string;
}

// ==================== Q-CHAT-10 Types ====================

export const QChatAnswerOption = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
} as const;

export type QChatAnswerOption = typeof QChatAnswerOption[keyof typeof QChatAnswerOption];

export interface QChatCreateSessionRequest {
  child_name: string;
  child_age_months: number;
  parent_name?: string;
  language: LanguageType;
}

export interface QChatCreateSessionResponse {
  session_token: string;
  child_name: string;
  child_age_months: number;
  created_at: string;
}

export interface QChatQuestionOption {
  value: string; // A, B, C, D, E
  label_en: string;
  label_ar: string;
}

export interface QChatQuestion {
  question_number: number;
  text_en: string;
  text_ar: string;
  options: QChatQuestionOption[];
  video_positive: string | null;
  video_negative: string | null;
}

export interface QChatAnswer {
  question_number: number;
  selected_option: string; // A, B, C, D, E
  option_label: string;
  scored_point: boolean;
  answered_at: string;
  question_text_en: string;
  question_text_ar: string;
}

export interface QChatSessionResponse {
  session_token: string;
  child_name: string;
  child_age_months: number;
  parent_name: string | null;
  language: string;
  status: SessionStatus;
  current_question: number;
  total_questions: number;
  answers: QChatAnswer[];
  created_at: string;
  completed_at: string | null;
}

export interface QChatSubmitAnswerRequest {
  question_number: number;
  selected_option: QChatAnswerOption;
}

export interface QChatSubmitAnswerResponse {
  accepted: boolean;
  next_question_number: number | null;
  is_complete: boolean;
  current_score: number;
}

export interface QChatReport {
  session_token: string;
  child_name: string;
  child_age_months: number;
  parent_name: string | null;
  total_score: number;
  max_score: number;
  recommend_referral: boolean;
  risk_level: string; // "low" | "high"
  answers: QChatAnswer[];
  recommendations: string[];
  completed_at: string;
}

export interface QChatLocalSession {
  session_token: string;
  child_name: string;
  child_age_months: number;
  parent_name?: string;
  language: LanguageType;
  status: SessionStatus;
  created_at: string;
  current_question: number;
  total_score?: number;
  recommend_referral?: boolean;
}

// ==================== QCHAT Chat Assistant Types ====================

export interface QChatChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface QChatChatStartRequest {
  question_number: number;
  language: LanguageType;
}

export interface QChatChatStartResponse {
  message: string;
  chat_id: string;
  existing_messages: QChatChatMessage[];
}

export interface QChatChatMessageRequest {
  message: string;
  chat_id: string;
}

export interface QChatChatMessageResponse {
  message: string;
  extracted_option?: QChatAnswerOption;
  is_complete: boolean;
  next_question_number?: number;
  confidence?: number;
}
