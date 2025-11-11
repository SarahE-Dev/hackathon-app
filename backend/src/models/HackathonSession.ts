import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonSession extends Document {
  title: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number; // minutes

  // Problems/Challenges
  problems: Array<{
    problemId: mongoose.Types.ObjectId;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    order: number;
  }>;

  // Teams participating
  teams: mongoose.Types.ObjectId[];

  // Proctoring settings (HackerRank-style)
  proctoring: {
    enabled: boolean;
    requireFullscreen: boolean;
    detectTabSwitch: boolean;
    detectCopyPaste: boolean;
    detectIdle: boolean;
    idleTimeoutMinutes: number;
    allowCalculator: boolean;
    allowNotes: boolean;
    recordScreen: boolean;
    recordWebcam: boolean;
    takeSnapshots: boolean;
    snapshotIntervalMinutes: number;
    requireIdentityCheck: boolean;
  };

  // Session state
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  isActive: boolean;

  // Accommodations
  accommodations: Array<{
    teamId: mongoose.Types.ObjectId;
    extraTimeMinutes: number;
    reason: string;
  }>;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const HackathonSessionSchema = new Schema<IHackathonSession>(
  {
    title: { type: String, required: true },
    description: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },

    problems: [{
      problemId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      title: { type: String, required: true },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
      points: { type: Number, required: true },
      order: { type: Number, required: true },
    }],

    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],

    proctoring: {
      enabled: { type: Boolean, default: true },
      requireFullscreen: { type: Boolean, default: true },
      detectTabSwitch: { type: Boolean, default: true },
      detectCopyPaste: { type: Boolean, default: true },
      detectIdle: { type: Boolean, default: true },
      idleTimeoutMinutes: { type: Number, default: 15 },
      allowCalculator: { type: Boolean, default: false },
      allowNotes: { type: Boolean, default: true },
      recordScreen: { type: Boolean, default: false },
      recordWebcam: { type: Boolean, default: false },
      takeSnapshots: { type: Boolean, default: false },
      snapshotIntervalMinutes: { type: Number, default: 10 },
      requireIdentityCheck: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ['scheduled', 'active', 'paused', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    isActive: { type: Boolean, default: false },

    accommodations: [{
      teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      extraTimeMinutes: { type: Number, required: true },
      reason: { type: String, required: true },
    }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
HackathonSessionSchema.index({ organizationId: 1, status: 1 });
HackathonSessionSchema.index({ startTime: 1, endTime: 1 });
HackathonSessionSchema.index({ teams: 1 });

export default mongoose.model<IHackathonSession>('HackathonSession', HackathonSessionSchema);
