import mongoose, { Schema, Document } from 'mongoose';

export interface ICohort {
  _id: mongoose.Types.ObjectId;
  name: string;
  year: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ILatePolicySettings {
  enabled: boolean;
  sameDayDeadline?: string;
  weekendDeadline?: string;
  penaltyPercentage?: number;
}

export interface IOrganizationSettings {
  allowSelfRegistration: boolean;
  defaultRetakePolicy: 'none' | 'once-with-penalty' | 'unlimited';
  defaultLatePolicy: ILatePolicySettings;
  timezone: string;
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  cohorts: ICohort[];
  settings: IOrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const CohortSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
});

const LatePolicySettingsSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  sameDayDeadline: {
    type: String,
  },
  weekendDeadline: {
    type: String,
  },
  penaltyPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

const OrganizationSettingsSchema = new Schema({
  allowSelfRegistration: {
    type: Boolean,
    default: false,
  },
  defaultRetakePolicy: {
    type: String,
    enum: ['none', 'once-with-penalty', 'unlimited'],
    default: 'none',
  },
  defaultLatePolicy: {
    type: LatePolicySettingsSchema,
    default: { enabled: false },
  },
  timezone: {
    type: String,
    default: 'America/New_York',
  },
}, { _id: false });

const OrganizationSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  cohorts: {
    type: [CohortSchema],
    default: [],
  },
  settings: {
    type: OrganizationSettingsSchema,
    default: {},
  },
}, {
  timestamps: true,
});

OrganizationSchema.index({ slug: 1 });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
