import mongoose, { Document, Schema } from 'mongoose';

export type FeatureStatus = 'enabled' | 'disabled' | 'maintenance' | 'beta' | 'deprecated';
export type FeatureVisibilityMode = 'nobody' | 'everyone' | 'custom';

export interface IFeature extends Document {
  key: string;
  name: string;
  description?: string;
  version?: string;
  status: FeatureStatus;
  visibilityMode: FeatureVisibilityMode;
  rolloutPercentage: number;
  enableFrom?: Date;
  disableOn?: Date;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IFeature>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    version: { type: String, trim: true },
    status: {
      type: String,
      enum: ['enabled', 'disabled', 'maintenance', 'beta', 'deprecated'],
      default: 'disabled',
    },
    visibilityMode: {
      type: String,
      enum: ['nobody', 'everyone', 'custom'],
      default: 'nobody',
    },
    rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
    enableFrom: { type: Date },
    disableOn: { type: Date },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

featureSchema.index({ key: 1 }, { unique: true });
featureSchema.index({ status: 1 });

export const Feature = mongoose.model<IFeature>('Feature', featureSchema);
