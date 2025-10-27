import mongoose, { Schema, Document } from 'mongoose';

export interface IRubricLevel {
  points: number;
  description: string;
}

export interface IRubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: IRubricLevel[];
}

export interface IRubric extends Document {
  name: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  criteria: IRubricCriterion[];
  totalPoints: number;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RubricLevelSchema = new Schema({
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
  },
}, { _id: false });

const RubricCriterionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 0,
  },
  levels: {
    type: [RubricLevelSchema],
    default: [],
  },
}, { _id: false });

const RubricSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  criteria: {
    type: [RubricCriterionSchema],
    required: true,
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 0,
  },
  isTemplate: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
RubricSchema.index({ organizationId: 1, isTemplate: 1 });

// Calculate total points before saving
RubricSchema.pre('save', function(next) {
  this.totalPoints = this.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  next();
});

export default mongoose.model<IRubric>('Rubric', RubricSchema);
