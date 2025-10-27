import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardEntry {
  rank: number;
  teamId: mongoose.Types.ObjectId;
  teamName: string;
  track?: string;
  averageScore: number;
  judgeScores: number[];
  tiebreakScore?: number;
  submittedAt: Date;
}

export interface ILeaderboard extends Document {
  organizationId: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
  standings: ILeaderboardEntry[];
  lastUpdated: Date;
  isPublic: boolean;
  revealAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema({
  rank: {
    type: Number,
    required: true,
    min: 1,
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  track: {
    type: String,
  },
  averageScore: {
    type: Number,
    required: true,
    min: 0,
  },
  judgeScores: {
    type: [Number],
    default: [],
  },
  tiebreakScore: {
    type: Number,
  },
  submittedAt: {
    type: Date,
    required: true,
  },
}, { _id: false });

const LeaderboardSchema = new Schema({
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
  standings: {
    type: [LeaderboardEntrySchema],
    default: [],
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  revealAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
LeaderboardSchema.index({ organizationId: 1, cohortId: 1 });
LeaderboardSchema.index({ isPublic: 1 });

export default mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);
