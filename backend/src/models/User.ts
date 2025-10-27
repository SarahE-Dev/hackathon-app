import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../../shared/src/types/common';

export interface IUserRoleAssignment {
  role: UserRole;
  organizationId: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
}

export interface IUser extends Document {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roles: IUserRoleAssignment[];
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserRoleAssignmentSchema = new Schema({
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  cohortId: {
    type: Schema.Types.ObjectId,
    ref: 'Cohort',
  },
}, { _id: false });

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  roles: {
    type: [UserRoleAssignmentSchema],
    default: [],
  },
  lastLogin: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ 'roles.organizationId': 1 });
UserSchema.index({ isActive: 1 });

// Instance method to check if user has a specific role
UserSchema.methods.hasRole = function(role: UserRole, organizationId?: string): boolean {
  return this.roles.some((r: IUserRoleAssignment) => {
    if (organizationId) {
      return r.role === role && r.organizationId.toString() === organizationId;
    }
    return r.role === role;
  });
};

export default mongoose.model<IUser>('User', UserSchema);
