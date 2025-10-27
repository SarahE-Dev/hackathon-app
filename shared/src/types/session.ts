import { AttemptStatus, Timestamps } from './common';

export interface Session extends Timestamps {
  _id: string;
  assessmentId: string;
  organizationId: string;
  cohortId?: string;
  title: string;
  windowStart: Date;
  windowEnd: Date;
  policies: SessionPolicies;
  accommodations: SessionAccommodation[];
  isActive: boolean;
}

export interface SessionPolicies {
  allowLateSubmission: boolean;
  lateDeadline?: Date;
  autoStartOnJoin: boolean;
  showLeaderboard: boolean;
}

export interface SessionAccommodation {
  userId: string;
  timeMultiplier: number; // 1.5 for 50% extra time
  reducedProctoring: boolean;
  separateRoom: boolean;
  notes?: string;
}

export interface Attempt extends Timestamps {
  _id: string;
  sessionId: string;
  userId: string;
  assessmentId: string;
  assessmentSnapshot: any; // Full snapshot of assessment at attempt time
  startedAt?: Date;
  submittedAt?: Date;
  timeSpent: number; // seconds
  answers: Answer[];
  files: FileSubmission[];
  events: AttemptEvent[];
  status: AttemptStatus;
  score?: number;
  maxScore?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface Answer {
  questionId: string;
  answer: any; // Type depends on question type
  timestamp: Date;
  timeSpent: number; // seconds on this question
  version: number; // For tracking answer changes
}

export interface FileSubmission {
  questionId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface AttemptEvent {
  type: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SessionStats {
  totalStudents: number;
  started: number;
  inProgress: number;
  submitted: number;
  averageTimeSpent: number;
  flaggedAttempts: number;
}
