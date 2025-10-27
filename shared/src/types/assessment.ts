import { QuestionType, AssessmentStatus, DifficultyLevel, Timestamps } from './common';

export interface Question extends Timestamps {
  _id: string;
  type: QuestionType;
  version: number;
  status: AssessmentStatus;
  title: string;
  content: QuestionContent;
  tags: string[];
  difficulty: DifficultyLevel;
  authorId: string;
  organizationId: string;
  points: number;
}

export interface QuestionContent {
  prompt: string; // Rich text/markdown
  options?: MCQOption[]; // For MCQ questions
  correctAnswer?: any; // For auto-graded questions
  testCases?: TestCase[]; // For coding questions
  rubricId?: string;
  allowedFileTypes?: string[]; // For file-upload questions
  maxFileSize?: number; // In bytes
  codeTemplate?: string; // For coding questions
  language?: string; // For coding questions
}

export interface MCQOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Only for backend/grading
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  timeLimit?: number; // milliseconds
  memoryLimit?: number; // MB
}

export interface Assessment extends Timestamps {
  _id: string;
  title: string;
  description?: string;
  organizationId: string;
  authorId: string;
  sections: AssessmentSection[];
  settings: AssessmentSettings;
  status: AssessmentStatus;
  publishedSnapshot?: PublishedAssessmentSnapshot;
  publishedAt?: Date;
}

export interface AssessmentSection {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
  timeLimit?: number; // minutes
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionsToDisplay?: number; // For question pools
}

export interface AssessmentSettings {
  totalTimeLimit?: number; // minutes
  attemptsAllowed: number;
  showResultsImmediately: boolean;
  allowReview: boolean;
  allowBackward: boolean;
  shuffleSections: boolean;
  startWindow?: Date;
  endWindow?: Date;
  lateSubmissionPolicy?: {
    enabled: boolean;
    deadline: Date;
    penaltyPercentage: number;
  };
  proctoring: ProctoringSettings;
  accessibility: AccessibilitySettings;
}

export interface ProctoringSettings {
  enabled: boolean;
  requireIdCheck: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  enableWebcam: boolean;
  enableScreenRecording: boolean;
  fullscreenRequired: boolean;
  allowCalculator: boolean;
  allowScratchpad: boolean;
}

export interface AccessibilitySettings {
  allowExtraTime: boolean;
  extraTimePercentage?: number;
  allowScreenReader: boolean;
  dyslexiaFriendlyFont: boolean;
}

export interface PublishedAssessmentSnapshot {
  version: number;
  assessment: Assessment;
  questions: Question[]; // Full question data at time of publishing
  publishedAt: Date;
  publishedBy: string;
}

export interface QuestionBank {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
  questionIds: string[];
  tags: string[];
}
