import mongoose, { Schema, Document } from 'mongoose';
import { AttemptStatus } from '../../../shared/src/types/common';

export interface IAnswer {
  questionId: mongoose.Types.ObjectId;
  answer: any;
  timestamp: Date;
  timeSpent: number;
  version: number;
}

export interface IFileSubmission {
  questionId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface IAttemptEvent {
  type: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IAttempt extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assessmentId: mongoose.Types.ObjectId;
  assessmentSnapshot: any;
  startedAt?: Date;
  submittedAt?: Date;
  timeSpent: number;
  answers: IAnswer[];
  files: IFileSubmission[];
  events: IAttemptEvent[];
  status: AttemptStatus;
  score?: number;
  maxScore?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  answer: {
    type: Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  version: {
    type: Number,
    default: 1,
  },
}, { _id: false });

const FileSubmissionSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const AttemptEventSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
}, { _id: false });

const AttemptSchema = new Schema({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  assessmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  assessmentSnapshot: {
    type: Schema.Types.Mixed,
    required: true,
  },
  startedAt: {
    type: Date,
  },
  submittedAt: {
    type: Date,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  answers: {
    type: [AnswerSchema],
    default: [],
  },
  files: {
    type: [FileSubmissionSchema],
    default: [],
  },
  events: {
    type: [AttemptEventSchema],
    default: [],
  },
  status: {
    type: String,
    enum: Object.values(AttemptStatus),
    default: AttemptStatus.NOT_STARTED,
  },
  score: {
    type: Number,
    min: 0,
  },
  maxScore: {
    type: Number,
    min: 0,
  },
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,
}, {
  timestamps: true,
});

// Indexes
AttemptSchema.index({ sessionId: 1, userId: 1 });
AttemptSchema.index({ userId: 1, status: 1 });
AttemptSchema.index({ status: 1 });

// Virtual for calculating progress
AttemptSchema.virtual('progress').get(function(this: IAttempt) {
  if (!this.assessmentSnapshot?.sections) return 0;
  const totalQuestions = this.assessmentSnapshot.sections.reduce(
    (acc: number, section: any) => acc + (section.questionIds?.length || 0),
    0
  );
  return totalQuestions > 0 ? (this.answers.length / totalQuestions) * 100 : 0;
});

export default mongoose.model<IAttempt>('Attempt', AttemptSchema);
