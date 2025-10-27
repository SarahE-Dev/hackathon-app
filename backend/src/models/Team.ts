import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  organizationId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  projectTitle: string;
  description: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  submittedAt?: Date;
  disqualified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  memberIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  projectTitle: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  track: {
    type: String,
    trim: true,
  },
  repoUrl: {
    type: String,
    trim: true,
  },
  demoUrl: {
    type: String,
    trim: true,
  },
  videoUrl: {
    type: String,
    trim: true,
  },
  submittedAt: {
    type: Date,
  },
  disqualified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
TeamSchema.index({ organizationId: 1, disqualified: 1 });
TeamSchema.index({ memberIds: 1 });
TeamSchema.index({ track: 1 });

export default mongoose.model<ITeam>('Team', TeamSchema);
