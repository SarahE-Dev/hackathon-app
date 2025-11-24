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
  // New fields for project submission
  projectExplanation?: string; // Markdown explanation of the project
  technicalApproach?: string; // Technical approach and architecture
  challengesOvercome?: string; // Challenges faced and how they were solved
  codeSnippets?: Array<{
    filename: string;
    language: string;
    code: string;
    explanation?: string;
  }>;
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
  // New fields for project submission
  projectExplanation: {
    type: String,
    trim: true,
  },
  technicalApproach: {
    type: String,
    trim: true,
  },
  challengesOvercome: {
    type: String,
    trim: true,
  },
  codeSnippets: [{
    filename: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    explanation: { type: String },
  }],
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
