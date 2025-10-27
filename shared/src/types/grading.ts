import { GradeStatus, Timestamps } from './common';

export interface Rubric extends Timestamps {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  isTemplate: boolean;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  points: number;
  description: string;
}

export interface Grade extends Timestamps {
  _id: string;
  attemptId: string;
  graderId: string;
  questionScores: QuestionScore[];
  overallScore: number;
  maxScore: number;
  percentage: number;
  status: GradeStatus;
  feedback?: string;
  gradedAt?: Date;
  releasedAt?: Date;
}

export interface QuestionScore {
  questionId: string;
  rubricScores?: Record<string, number>; // criterionId -> points
  points: number;
  maxPoints: number;
  comments: Comment[];
  autograded: boolean;
}

export interface Comment {
  id: string;
  text: string;
  lineNumber?: number; // For code comments
  timestamp: Date;
}

export interface GradingQueueItem {
  attemptId: string;
  studentName: string;
  assessmentTitle: string;
  submittedAt: Date;
  assignedTo?: string;
  priority: number;
}

export interface RegradRequest extends Timestamps {
  _id: string;
  gradeId: string;
  studentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
}
