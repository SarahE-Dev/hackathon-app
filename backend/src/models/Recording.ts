import mongoose, { Schema, Document } from 'mongoose';

export type RecordingSourceType = 'assessment' | 'hackathon';
export type RecordingType = 'webcam' | 'screen' | 'snapshot';
export type RecordingStatus = 'recording' | 'uploading' | 'processing' | 'complete' | 'failed';

export interface IRecordingChunk {
  index: number;
  storageKey: string;
  size: number;
  duration: number; // milliseconds
  uploadedAt: Date;
}

export interface IRecordingConsent {
  given: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRecording extends Document {
  // Source reference (assessment attempt or hackathon session)
  sourceType: RecordingSourceType;
  sourceId: mongoose.Types.ObjectId; // attemptId or hackathonSessionId

  // User info
  userId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId; // For hackathon recordings

  // Recording details
  type: RecordingType;
  status: RecordingStatus;

  // Storage
  storageKey: string; // S3 key or local path for final file
  storageBucket?: string;
  chunks: IRecordingChunk[];

  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds

  // File info
  fileSize?: number; // bytes
  mimeType: string;

  // Consent tracking
  consent: IRecordingConsent;

  // Error handling
  errorMessage?: string;
  retryCount: number;

  // Metadata
  metadata?: {
    resolution?: string;
    frameRate?: number;
    audioEnabled?: boolean;
    deviceInfo?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const RecordingChunkSchema = new Schema<IRecordingChunk>({
  index: {
    type: Number,
    required: true,
  },
  storageKey: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const RecordingConsentSchema = new Schema<IRecordingConsent>({
  given: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  ipAddress: String,
  userAgent: String,
}, { _id: false });

const RecordingSchema = new Schema<IRecording>(
  {
    sourceType: {
      type: String,
      enum: ['assessment', 'hackathon'],
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'sourceTypeRef',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    type: {
      type: String,
      enum: ['webcam', 'screen', 'snapshot'],
      required: true,
    },
    status: {
      type: String,
      enum: ['recording', 'uploading', 'processing', 'complete', 'failed'],
      default: 'recording',
    },
    storageKey: {
      type: String,
      required: true,
    },
    storageBucket: String,
    chunks: {
      type: [RecordingChunkSchema],
      default: [],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: Date,
    duration: Number,
    fileSize: Number,
    mimeType: {
      type: String,
      required: true,
      default: 'video/webm',
    },
    consent: {
      type: RecordingConsentSchema,
      required: true,
    },
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      resolution: String,
      frameRate: Number,
      audioEnabled: Boolean,
      deviceInfo: String,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for dynamic ref path
RecordingSchema.virtual('sourceTypeRef').get(function (this: IRecording) {
  return this.sourceType === 'assessment' ? 'Attempt' : 'HackathonSession';
});

// Indexes for efficient queries
RecordingSchema.index({ sourceType: 1, sourceId: 1 });
RecordingSchema.index({ userId: 1, status: 1 });
RecordingSchema.index({ status: 1, createdAt: -1 });
RecordingSchema.index({ teamId: 1 }, { sparse: true });

// Index for cleanup jobs (find old recordings)
RecordingSchema.index({ createdAt: 1, status: 1 });

export default mongoose.model<IRecording>('Recording', RecordingSchema);
