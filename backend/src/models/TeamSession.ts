import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamSession extends Document {
  sessionId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;

  // Timing
  startedAt?: Date;
  submittedAt?: Date;
  timeSpent: number; // seconds
  extraTimeMinutes: number;

  // Progress
  problemProgress: Array<{
    problemId: mongoose.Types.ObjectId;
    status: 'not-started' | 'in-progress' | 'submitted' | 'passed' | 'failed';
    code: string;
    language: string;
    explanation?: string; // Markdown explanation of the solution approach
    testResults: Array<{
      testCaseId: string;
      passed: boolean;
      output?: string;
      error?: string;
      executionTime?: number;
    }>;
    passedTests: number;
    totalTests: number;
    score: number;
    submittedAt?: Date;
  }>;

  // Proctoring events
  events: Array<{
    type: 'session-started' | 'tab-switch' | 'copy-paste' | 'idle' | 'fullscreen-exit' | 'pause' | 'resume' | 'warning' | 'incident';
    timestamp: Date;
    userId?: mongoose.Types.ObjectId;
    userName?: string;
    details?: string;
    severity?: 'low' | 'medium' | 'high';
  }>;

  // Proctoring flags
  tabSwitchCount: number;
  copyPasteCount: number;
  idleCount: number;
  fullscreenExitCount: number;
  warningCount: number;

  // Status
  status: 'not-started' | 'in-progress' | 'paused' | 'submitted' | 'disqualified';
  isPaused: boolean;
  pausedAt?: Date;
  pauseReason?: string;

  // Score
  totalScore: number;
  maxScore: number;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

const TeamSessionSchema = new Schema<ITeamSession>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'HackathonSession', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    startedAt: { type: Date },
    submittedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },
    extraTimeMinutes: { type: Number, default: 0 },

    problemProgress: [{
      problemId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      status: {
        type: String,
        enum: ['not-started', 'in-progress', 'submitted', 'passed', 'failed'],
        default: 'not-started',
      },
      code: { type: String, default: '' },
      language: { type: String, default: 'python' },
      explanation: { type: String, default: '' }, // Markdown explanation of approach
      testResults: [{
        testCaseId: { type: String, required: true },
        passed: { type: Boolean, required: true },
        output: { type: String },
        error: { type: String },
        executionTime: { type: Number },
      }],
      passedTests: { type: Number, default: 0 },
      totalTests: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      submittedAt: { type: Date },
    }],

    events: [{
      type: {
        type: String,
        enum: ['session-started', 'tab-switch', 'copy-paste', 'idle', 'fullscreen-exit', 'pause', 'resume', 'warning', 'incident'],
        required: true,
      },
      timestamp: { type: Date, default: Date.now },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String },
      details: { type: String },
      severity: { type: String, enum: ['low', 'medium', 'high'] },
    }],

    tabSwitchCount: { type: Number, default: 0 },
    copyPasteCount: { type: Number, default: 0 },
    idleCount: { type: Number, default: 0 },
    fullscreenExitCount: { type: Number, default: 0 },
    warningCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'paused', 'submitted', 'disqualified'],
      default: 'not-started',
    },
    isPaused: { type: Boolean, default: false },
    pausedAt: { type: Date },
    pauseReason: { type: String },

    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },

    ipAddress: { type: String },
    userAgent: { type: String },
    deviceFingerprint: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
TeamSessionSchema.index({ sessionId: 1, teamId: 1 }, { unique: true });
TeamSessionSchema.index({ sessionId: 1, status: 1 });
TeamSessionSchema.index({ teamId: 1, status: 1 });

// Virtual for calculating incident score
TeamSessionSchema.virtual('incidentScore').get(function() {
  return this.tabSwitchCount * 1 +
         this.copyPasteCount * 2 +
         this.idleCount * 1 +
         this.fullscreenExitCount * 3 +
         this.warningCount * 5;
});

export default mongoose.model<ITeamSession>('TeamSession', TeamSessionSchema);
