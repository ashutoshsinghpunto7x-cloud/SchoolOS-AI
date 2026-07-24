import mongoose, { Document, Schema } from 'mongoose';

export type BehaviorCategory = 'positive' | 'negative' | 'neutral';

export interface IBehaviorOption extends Document {
  schoolId: string;
  label: string;
  category: BehaviorCategory;
  // True only for the 6 school-wide options seeded via ensureDefaults —
  // admin/principal can still edit or deactivate them, just not hard-delete.
  isDefault: boolean;
  // Present only for a teacher's own custom option (self-scoped); absent for
  // school-wide options created by admin/principal or the seeded defaults.
  createdByTeacherId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BEHAVIOR_CATEGORIES: BehaviorCategory[] = ['positive', 'negative', 'neutral'];

const behaviorOptionSchema = new Schema<IBehaviorOption>(
  {
    schoolId:           { type: String, required: true },
    label:              { type: String, required: true, trim: true, maxlength: 80 },
    category:           { type: String, enum: BEHAVIOR_CATEGORIES, required: true, default: 'neutral' },
    isDefault:          { type: Boolean, default: false },
    createdByTeacherId: { type: String },
    isActive:           { type: Boolean, default: true },
    createdBy:          { type: String },
  },
  { timestamps: true, versionKey: false },
);

// Primary query: all options visible to a school (or a specific teacher's own).
behaviorOptionSchema.index({ schoolId: 1, isActive: 1 });
behaviorOptionSchema.index({ schoolId: 1, createdByTeacherId: 1 });

export const BehaviorOption = mongoose.model<IBehaviorOption>('BehaviorOption', behaviorOptionSchema);
