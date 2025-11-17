// ==================== Enums ====================

export enum SessionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum AnswerType {
  YES = 'yes',
  NO = 'no',
  UNANSWERED = 'unanswered',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum LanguageType {
  EN = 'en',
  AR = 'ar',
}

export enum ContactRequestStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  SESSION_CREATED = 'session_created',
  CLOSED = 'closed',
}

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
