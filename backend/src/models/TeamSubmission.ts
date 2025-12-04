import mongoose, { Schema, Document } from 'mongoose';

// Proctoring event interface
export interface IProctoringEvent {
  type: 'copy' | 'paste' | 'tab-switch' | 'window-blur' | 'right-click' | 
        'keyboard-shortcut' | 'code-change' | 'external-paste';
  timestamp: Date;
  metadata?: {
    textLength?: number;
    text?: string; // Only first 100 chars for large pastes
    keys?: string;
    fromExternal?: boolean;
    changeType?: 'insert' | 'delete' | 'replace';
    linesChanged?: number;
  };
}

// Proctoring summary for quick flagging
export interface IProctoringStats {
  copyCount: number;
  pasteCount: number;
  externalPasteCount: number; // Pastes that don't match recent copies
  tabSwitchCount: number;
  windowBlurCount: number;
  suspiciousShortcuts: number;
  totalTimeSpent: number; // milliseconds
  activeTypingTime: number; // milliseconds of actual typing
  idleTime: number; // milliseconds of inactivity
  avgTypingSpeed: number; // characters per minute
  largestPaste: number; // character count
  suspiciousPatterns: string[];
  riskScore: number; // 0-100, higher = more suspicious
}

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
  
  // Proctoring / Anti-cheating
  proctoringEvents: IProctoringEvent[];
  proctoringStats: IProctoringStats;
  codeSnapshots: Array<{
    code: string;
    timestamp: Date;
    charCount: number;
  }>;
  startedAt?: Date; // When they first opened the problem
  
  // Judge feedback
  judgeFeedback?: {
    judgeId: mongoose.Types.ObjectId;
    rubricScores: {
      correctness: number;
      codeQuality: number;
      efficiency: number;
      explanation: number;
    };
    totalJudgeScore: number;
    feedback?: string;
    flagged: boolean;
    flagReason?: string;
    reviewedAt: Date;
  };
  
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
    // Proctoring fields
    proctoringEvents: [{
      type: {
        type: String,
        enum: ['copy', 'paste', 'tab-switch', 'window-blur', 'right-click', 
               'keyboard-shortcut', 'code-change', 'external-paste'],
        required: true,
      },
      timestamp: { type: Date, required: true },
      metadata: {
        textLength: Number,
        text: String,
        keys: String,
        fromExternal: Boolean,
        changeType: String,
        linesChanged: Number,
      },
    }],
    proctoringStats: {
      copyCount: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
      externalPasteCount: { type: Number, default: 0 },
      tabSwitchCount: { type: Number, default: 0 },
      windowBlurCount: { type: Number, default: 0 },
      suspiciousShortcuts: { type: Number, default: 0 },
      totalTimeSpent: { type: Number, default: 0 },
      activeTypingTime: { type: Number, default: 0 },
      idleTime: { type: Number, default: 0 },
      avgTypingSpeed: { type: Number, default: 0 },
      largestPaste: { type: Number, default: 0 },
      suspiciousPatterns: [{ type: String }],
      riskScore: { type: Number, default: 0 },
    },
    codeSnapshots: [{
      code: { type: String, required: true },
      timestamp: { type: Date, required: true },
      charCount: { type: Number, required: true },
    }],
    startedAt: {
      type: Date,
    },
    // Judge feedback with rubric-based scoring
    judgeFeedback: {
      judgeId: { type: Schema.Types.ObjectId, ref: 'User' },
      // Rubric scores (each 0-100% of allocated points for that criterion)
      rubricScores: {
        correctness: { type: Number, min: 0, max: 100, default: 0 }, // Does code produce correct output? (40% weight)
        codeQuality: { type: Number, min: 0, max: 100, default: 0 }, // Clean, readable, well-organized? (20% weight)
        efficiency: { type: Number, min: 0, max: 100, default: 0 }, // Time/space complexity appropriate? (20% weight)
        explanation: { type: Number, min: 0, max: 100, default: 0 }, // Clear explanation of approach? (20% weight)
      },
      totalJudgeScore: { type: Number, default: 0 }, // Calculated total based on rubric
      feedback: { type: String }, // Written feedback from judge
      flagged: { type: Boolean, default: false }, // Flag for suspicious activity
      flagReason: { type: String }, // Reason for flagging
      reviewedAt: { type: Date },
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

