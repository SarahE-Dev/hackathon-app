import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonRoster extends Document {
  hackathonSessionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'judge' | 'fellow';
  status: 'pending' | 'registered' | 'declined';
  userId?: mongoose.Types.ObjectId; // Linked when user registers
  teamId?: mongoose.Types.ObjectId; // For fellows - which team they're assigned to
  notes?: string;
  invitedAt: Date;
  registeredAt?: Date;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HackathonRosterSchema = new Schema<IHackathonRoster>(
  {
    hackathonSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonSession',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['judge', 'fellow'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'registered', 'declined'],
      default: 'pending',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },
    notes: {
      type: String,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    registeredAt: {
      type: Date,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: one email per role per hackathon
HackathonRosterSchema.index(
  { hackathonSessionId: 1, email: 1, role: 1 },
  { unique: true }
);

// Index for looking up by email (for registration checking)
HackathonRosterSchema.index({ email: 1, status: 1 });

export default mongoose.model<IHackathonRoster>('HackathonRoster', HackathonRosterSchema);
