import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamSubmission extends Document {
  teamId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  problemId: mongoose.Types.ObjectId;
  
  // Submission details
  code: string;
  language: string;
  explanation?: string;
  
  // Test results
  testResults: Array<{
    testCaseId: string;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    executionTime: number;
    error?: string;
  }>;
  
  // Scoring
  passedTests: number;
  totalTests: number;
  score: number; // Percentage 0-100
  pointsEarned: number;
  maxPoints: number;
  
  // Status
  status: 'in_progress' | 'submitted' | 'passed' | 'failed';
  allTestsPassed: boolean;
  
  // Metadata
  submittedBy: mongoose.Types.ObjectId; // Which team member submitted
  submittedAt?: Date;
  attempts: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const TeamSubmissionSchema = new Schema<ITeamSubmission>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonSession',
      required: true,
      index: true,
    },
    problemId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      default: 'python',
    },
    explanation: {
      type: String,
    },
    testResults: [
      {
        testCaseId: { type: String, required: true },
        passed: { type: Boolean, required: true },
        actualOutput: { type: String, default: '' },
        expectedOutput: { type: String, required: true },
        executionTime: { type: Number, default: 0 },
        error: { type: String },
      },
    ],
    passedTests: {
      type: Number,
      default: 0,
    },
    totalTests: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    maxPoints: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'passed', 'failed'],
      default: 'in_progress',
    },
    allTestsPassed: {
      type: Boolean,
      default: false,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique team+session+problem combination
TeamSubmissionSchema.index({ teamId: 1, sessionId: 1, problemId: 1 }, { unique: true });

// Index for querying team submissions
TeamSubmissionSchema.index({ teamId: 1, sessionId: 1 });

// Index for leaderboard queries
TeamSubmissionSchema.index({ sessionId: 1, pointsEarned: -1 });

export default mongoose.model<ITeamSubmission>('TeamSubmission', TeamSubmissionSchema);

