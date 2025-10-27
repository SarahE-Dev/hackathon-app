import mongoose, { Schema, Document } from 'mongoose';
import { GradeStatus } from '../../../shared/src/types/common';

export interface IComment {
  id: string;
  text: string;
  lineNumber?: number;
  timestamp: Date;
}

export interface IQuestionScore {
  questionId: mongoose.Types.ObjectId;
  rubricScores?: Record<string, number>;
  points: number;
  maxPoints: number;
  comments: IComment[];
  autograded: boolean;
}

export interface IGrade extends Document {
  attemptId: mongoose.Types.ObjectId;
  graderId: mongoose.Types.ObjectId;
  questionScores: IQuestionScore[];
  overallScore: number;
  maxScore: number;
  percentage: number;
  status: GradeStatus;
  feedback?: string;
  gradedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  lineNumber: {
    type: Number,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const QuestionScoreSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  rubricScores: {
    type: Schema.Types.Mixed,
  },
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 0,
  },
  comments: {
    type: [CommentSchema],
    default: [],
  },
  autograded: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const GradeSchema = new Schema({
  attemptId: {
    type: Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true,
    unique: true,
    index: true,
  },
  graderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionScores: {
    type: [QuestionScoreSchema],
    required: true,
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
  },
  maxScore: {
    type: Number,
    required: true,
    min: 0,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: Object.values(GradeStatus),
    default: GradeStatus.PENDING,
  },
  feedback: {
    type: String,
  },
  gradedAt: {
    type: Date,
  },
  releasedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
GradeSchema.index({ graderId: 1, status: 1 });
GradeSchema.index({ status: 1 });

// Calculate percentage before saving
GradeSchema.pre('save', function(next) {
  if (this.maxScore > 0) {
    this.percentage = (this.overallScore / this.maxScore) * 100;
  } else {
    this.percentage = 0;
  }
  next();
});

export default mongoose.model<IGrade>('Grade', GradeSchema);
