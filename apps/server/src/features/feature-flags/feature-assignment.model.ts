import mongoose, { Document, Schema } from 'mongoose';

export type FeatureAssignmentTargetType = 'user' | 'role' | 'school' | 'segment';
export type FeatureAssignmentSegment = 'developers' | 'internal_testers';

export interface IFeatureAssignment extends Document {
  featureKey: string;
  targetType: FeatureAssignmentTargetType;
  targetId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const featureAssignmentSchema = new Schema<IFeatureAssignment>(
  {
    featureKey: { type: String, required: true, lowercase: true, trim: true },
    targetType: { type: String, enum: ['user', 'role', 'school', 'segment'], required: true },
    targetId: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

// Prevents granting the same target twice for the same feature.
featureAssignmentSchema.index({ featureKey: 1, targetType: 1, targetId: 1 }, { unique: true });
// Reverse lookup — "which features is this user/role/school granted".
featureAssignmentSchema.index({ targetType: 1, targetId: 1 });

export const FeatureAssignment = mongoose.model<IFeatureAssignment>('FeatureAssignment', featureAssignmentSchema);
