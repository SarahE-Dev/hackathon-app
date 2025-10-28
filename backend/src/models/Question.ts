import mongoose, { Schema, Document } from 'mongoose';
import { QuestionType, AssessmentStatus, DifficultyLevel } from '../../../shared/src/types/common';

export interface IMCQOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface ITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface IQuestionContent {
  prompt: string;
  options?: IMCQOption[];
  correctAnswer?: any;
  testCases?: ITestCase[];
  rubricId?: mongoose.Types.ObjectId;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  codeTemplate?: string;
  language?: string;
}

export interface IQuestion extends Document {
  type: QuestionType;
  version: number;
  status: AssessmentStatus;
  title: string;
  content: IQuestionContent;
  tags: string[];
  difficulty: DifficultyLevel;
  authorId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  points: number;
  metadata?: Record<string, any>;
  externalLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MCQOptionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
  },
}, { _id: false });

const TestCaseSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  input: {
    type: String,
    required: true,
  },
  expectedOutput: {
    type: String,
    required: true,
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  timeLimit: {
    type: Number,
    default: 3000,
  },
  memoryLimit: {
    type: Number,
    default: 512,
  },
}, { _id: false });

const QuestionContentSchema = new Schema({
  prompt: {
    type: String,
    required: true,
  },
  options: {
    type: [MCQOptionSchema],
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
  },
  testCases: {
    type: [TestCaseSchema],
  },
  rubricId: {
    type: Schema.Types.ObjectId,
    ref: 'Rubric',
  },
  allowedFileTypes: {
    type: [String],
  },
  maxFileSize: {
    type: Number,
    default: 10485760, // 10MB
  },
  codeTemplate: {
    type: String,
  },
  language: {
    type: String,
  },
}, { _id: false });

const QuestionSchema = new Schema({
  type: {
    type: String,
    enum: Object.values(QuestionType),
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: Object.values(AssessmentStatus),
    default: AssessmentStatus.DRAFT,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: QuestionContentSchema,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  difficulty: {
    type: String,
    enum: Object.values(DifficultyLevel),
    default: DifficultyLevel.MEDIUM,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null,
  },
  externalLink: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
QuestionSchema.index({ organizationId: 1, status: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ type: 1 });
QuestionSchema.index({ difficulty: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
