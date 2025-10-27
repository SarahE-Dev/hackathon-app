import mongoose, { Schema, Document } from 'mongoose';
import { ProctoringEventType } from '../../../shared/src/types/common';

export interface IProctorEvent extends Document {
  attemptId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  type: ProctoringEventType;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  metadata?: Record<string, any>;
  proctorNote?: string;
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProctorEventSchema = new Schema({
  attemptId: {
    type: Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(ProctoringEventType),
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  proctorNote: {
    type: String,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
ProctorEventSchema.index({ sessionId: 1, timestamp: -1 });
ProctorEventSchema.index({ attemptId: 1, type: 1 });
ProctorEventSchema.index({ resolved: 1 });

export default mongoose.model<IProctorEvent>('ProctorEvent', ProctorEventSchema);
