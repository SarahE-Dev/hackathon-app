import mongoose, { Schema, Document } from 'mongoose';

export interface IJudgeScore extends Document {
  teamId: mongoose.Types.ObjectId;
  judgeId: mongoose.Types.ObjectId;
  track?: string;
  scores: Record<string, number>;
  totalScore: number;
  notes?: string;
  conflictOfInterest: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JudgeScoreSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true,
  },
  judgeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  track: {
    type: String,
    trim: true,
  },
  scores: {
    type: Schema.Types.Mixed,
    required: true,
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
  },
  conflictOfInterest: {
    type: Boolean,
    default: false,
  },
  submittedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
JudgeScoreSchema.index({ teamId: 1, judgeId: 1 }, { unique: true });
JudgeScoreSchema.index({ judgeId: 1 });
JudgeScoreSchema.index({ track: 1 });

// Calculate total score before saving
JudgeScoreSchema.pre('save', function(next) {
  const scores = Object.values(this.scores);
  this.totalScore = scores.reduce((sum: number, score: any) => sum + (Number(score) || 0), 0);
  next();
});

export default mongoose.model<IJudgeScore>('JudgeScore', JudgeScoreSchema);
