/**
 * User Roles in the System (Justice Through Code)
 *
 * ADMIN - Full system access: manage users, assessments, sessions, and all settings
 * PROCTOR - Monitor live sessions, pause/resume teams, handle incidents
 * JUDGE - Score hackathon projects, grade assessments, release grades
 * GRADER - (Reserved for future use) Limited grading permissions for TAs/assistants
 *          Currently, JUDGE handles all grading. GRADER can be implemented for:
 *          - Grading specific question types only
 *          - TA roles with limited permissions
 * FELLOW - JTC Fellows: take assessments, join hackathon teams, view their results
 */
export enum UserRole {
  ADMIN = 'admin',
  PROCTOR = 'proctor',
  GRADER = 'grader', // Reserved - not currently used in routes
  JUDGE = 'judge',
  FELLOW = 'fellow',
}

export enum QuestionType {
  MCQ_SINGLE = 'mcq-single',
  MCQ_MULTI = 'mcq-multi',
  FREEFORM = 'freeform',
  LONG_FORM = 'long-form',
  CODING = 'coding',
  FILE_UPLOAD = 'file-upload',
}

export enum AssessmentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum AttemptStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RELEASED = 'released',
}

export enum GradeStatus {
  PENDING = 'pending',
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  RELEASED = 'released',
}

export enum ProctoringEventType {
  TAB_SWITCH = 'tab-switch',
  BLUR = 'blur',
  COPY = 'copy',
  PASTE = 'paste',
  PRINT = 'print',
  IDLE = 'idle',
  MANUAL_FLAG = 'manual-flag',
  ID_CHECK = 'id-check',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum SubmissionLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  JAVA = 'java',
  CPP = 'cpp',
  GO = 'go',
}

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Judge Documentation Types
export enum JudgeDocumentationType {
  RUBRIC = 'rubric',
  FAQ = 'faq',
  GUIDE = 'guide',
  GENERAL = 'general',
}

export interface RubricScoringGuide {
  points: number;
  description: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  scoringGuide: RubricScoringGuide[];
}

export interface FAQ {
  question: string;
  answer: string;
  order: number;
}

export interface JudgeDocumentation {
  _id: string;
  hackathonSessionId?: string;
  organizationId: string;
  title: string;
  type: JudgeDocumentationType;
  rubricCriteria?: RubricCriterion[];
  totalPoints?: number;
  faqs?: FAQ[];
  content?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  lastUpdatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}
