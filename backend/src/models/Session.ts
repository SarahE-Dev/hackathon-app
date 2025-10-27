import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionPolicies {
  allowLateSubmission: boolean;
  lateDeadline?: Date;
  autoStartOnJoin: boolean;
  showLeaderboard: boolean;
}

export interface ISessionAccommodation {
  userId: mongoose.Types.ObjectId;
  timeMultiplier: number;
  reducedProctoring: boolean;
  separateRoom: boolean;
  notes?: string;
}

export interface ISession extends Document {
  assessmentId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
  title: string;
  windowStart: Date;
  windowEnd: Date;
  policies: ISessionPolicies;
  accommodations: ISessionAccommodation[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionPoliciesSchema = new Schema({
  allowLateSubmission: {
    type: Boolean,
    default: false,
  },
  lateDeadline: Date,
  autoStartOnJoin: {
    type: Boolean,
    default: false,
  },
  showLeaderboard: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const SessionAccommodationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timeMultiplier: {
    type: Number,
    default: 1.0,
    min: 1.0,
  },
  reducedProctoring: {
    type: Boolean,
    default: false,
  },
  separateRoom: {
    type: Boolean,
    default: false,
  },
  notes: String,
}, { _id: false });

const SessionSchema = new Schema({
  assessmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
    index: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  cohortId: {
    type: Schema.Types.ObjectId,
    ref: 'Cohort',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  windowStart: {
    type: Date,
    required: true,
  },
  windowEnd: {
    type: Date,
    required: true,
  },
  policies: {
    type: SessionPoliciesSchema,
    default: {},
  },
  accommodations: {
    type: [SessionAccommodationSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
SessionSchema.index({ organizationId: 1, isActive: 1 });
SessionSchema.index({ windowStart: 1, windowEnd: 1 });

export default mongoose.model<ISession>('Session', SessionSchema);
