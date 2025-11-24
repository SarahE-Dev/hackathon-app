import mongoose, { Schema, Document } from 'mongoose';

export interface IRubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  scoringGuide: Array<{
    points: number;
    description: string;
  }>;
}

export interface IFAQ {
  question: string;
  answer: string;
  order: number;
}

export interface IJudgeDocumentation extends Document {
  hackathonSessionId?: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  type: 'rubric' | 'faq' | 'guide' | 'general';

  // For rubrics
  rubricCriteria?: IRubricCriterion[];
  totalPoints?: number;

  // For FAQs
  faqs?: IFAQ[];

  // For guides and general documentation
  content?: string;

  // Metadata
  isActive: boolean;
  isDefault: boolean; // If true, applies to all hackathons in the org
  createdBy: mongoose.Types.ObjectId;
  lastUpdatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RubricCriterionSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  maxPoints: { type: Number, required: true, min: 0 },
  scoringGuide: [{
    points: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
  }],
}, { _id: false });

const FAQSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { _id: false });

const JudgeDocumentationSchema = new Schema<IJudgeDocumentation>(
  {
    hackathonSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonSession',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['rubric', 'faq', 'guide', 'general'],
      required: true,
    },

    // Rubric fields
    rubricCriteria: [RubricCriterionSchema],
    totalPoints: {
      type: Number,
      min: 0,
    },

    // FAQ fields
    faqs: [FAQSchema],

    // Guide/General content
    content: {
      type: String,
    },

    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
JudgeDocumentationSchema.index({ organizationId: 1, type: 1 });
JudgeDocumentationSchema.index({ hackathonSessionId: 1, type: 1 });
JudgeDocumentationSchema.index({ isDefault: 1, organizationId: 1 });

// Calculate total points for rubrics before saving
JudgeDocumentationSchema.pre('save', function(next) {
  if (this.type === 'rubric' && this.rubricCriteria && this.rubricCriteria.length > 0) {
    this.totalPoints = this.rubricCriteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  }
  next();
});

export default mongoose.model<IJudgeDocumentation>('JudgeDocumentation', JudgeDocumentationSchema);
