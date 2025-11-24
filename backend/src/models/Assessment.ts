import mongoose, { Schema, Document } from 'mongoose';
import { AssessmentStatus } from '../../../shared/src/types/common';

export interface IAssessmentSection {
  id: string;
  title: string;
  description?: string;
  questionIds: mongoose.Types.ObjectId[];
  timeLimit?: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionsToDisplay?: number;
}

export interface IProctoringSettings {
  enabled: boolean;
  requireIdCheck: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  enableWebcam: boolean;
  enableScreenRecording: boolean;
  recordWebcam: boolean;
  recordScreen: boolean;
  takeSnapshots: boolean;
  snapshotIntervalMinutes: number;
  fullscreenRequired: boolean;
  allowCalculator: boolean;
  allowScratchpad: boolean;
}

export interface IAccessibilitySettings {
  allowExtraTime: boolean;
  extraTimePercentage?: number;
  allowScreenReader: boolean;
  dyslexiaFriendlyFont: boolean;
}

export interface ILateSubmissionPolicy {
  enabled: boolean;
  deadline: Date;
  penaltyPercentage: number;
}

export interface IAssessmentSettings {
  totalTimeLimit?: number;
  attemptsAllowed: number;
  showResultsImmediately: boolean;
  allowReview: boolean;
  allowBackward: boolean;
  shuffleSections: boolean;
  startWindow?: Date;
  endWindow?: Date;
  lateSubmissionPolicy?: ILateSubmissionPolicy;
  proctoring: IProctoringSettings;
  accessibility: IAccessibilitySettings;
}

export interface IPublishedSnapshot {
  version: number;
  assessment: any;
  questions: any[];
  publishedAt: Date;
  publishedBy: mongoose.Types.ObjectId;
}

export interface IAssessment extends Document {
  title: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  sections: IAssessmentSection[];
  settings: IAssessmentSettings;
  status: AssessmentStatus;
  publishedSnapshot?: IPublishedSnapshot;
  publishedAt?: Date;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSectionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  questionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Question',
  }],
  timeLimit: Number,
  randomizeQuestions: {
    type: Boolean,
    default: false,
  },
  randomizeOptions: {
    type: Boolean,
    default: false,
  },
  questionsToDisplay: Number,
}, { _id: false });

const ProctoringSettingsSchema = new Schema({
  enabled: {
    type: Boolean,
    default: true,
  },
  requireIdCheck: {
    type: Boolean,
    default: false,
  },
  detectTabSwitch: {
    type: Boolean,
    default: true,
  },
  detectCopyPaste: {
    type: Boolean,
    default: true,
  },
  enableWebcam: {
    type: Boolean,
    default: false,
  },
  enableScreenRecording: {
    type: Boolean,
    default: false,
  },
  recordWebcam: {
    type: Boolean,
    default: false,
  },
  recordScreen: {
    type: Boolean,
    default: false,
  },
  takeSnapshots: {
    type: Boolean,
    default: false,
  },
  snapshotIntervalMinutes: {
    type: Number,
    default: 5,
  },
  fullscreenRequired: {
    type: Boolean,
    default: false,
  },
  allowCalculator: {
    type: Boolean,
    default: false,
  },
  allowScratchpad: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const AccessibilitySettingsSchema = new Schema({
  allowExtraTime: {
    type: Boolean,
    default: false,
  },
  extraTimePercentage: Number,
  allowScreenReader: {
    type: Boolean,
    default: true,
  },
  dyslexiaFriendlyFont: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const LateSubmissionPolicySchema = new Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  deadline: Date,
  penaltyPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

const AssessmentSettingsSchema = new Schema({
  totalTimeLimit: Number,
  attemptsAllowed: {
    type: Number,
    default: 1,
    min: 1,
  },
  showResultsImmediately: {
    type: Boolean,
    default: false,
  },
  allowReview: {
    type: Boolean,
    default: true,
  },
  allowBackward: {
    type: Boolean,
    default: true,
  },
  shuffleSections: {
    type: Boolean,
    default: false,
  },
  startWindow: Date,
  endWindow: Date,
  lateSubmissionPolicy: LateSubmissionPolicySchema,
  proctoring: {
    type: ProctoringSettingsSchema,
    default: {},
  },
  accessibility: {
    type: AccessibilitySettingsSchema,
    default: {},
  },
}, { _id: false });

const PublishedSnapshotSchema = new Schema({
  version: {
    type: Number,
    required: true,
  },
  assessment: {
    type: Schema.Types.Mixed,
    required: true,
  },
  questions: {
    type: [Schema.Types.Mixed],
    required: true,
  },
  publishedAt: {
    type: Date,
    required: true,
  },
  publishedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { _id: false });

const AssessmentSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sections: {
    type: [AssessmentSectionSchema],
    default: [],
  },
  settings: {
    type: AssessmentSettingsSchema,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(AssessmentStatus),
    default: AssessmentStatus.DRAFT,
  },
  publishedSnapshot: {
    type: PublishedSnapshotSchema,
  },
  publishedAt: Date,
  totalPoints: {
    type: Number,
    default: 100,
  },
}, {
  timestamps: true,
});

// Indexes
AssessmentSchema.index({ organizationId: 1, status: 1 });
AssessmentSchema.index({ authorId: 1 });

export default mongoose.model<IAssessment>('Assessment', AssessmentSchema);
