import mongoose, { Document, Schema } from 'mongoose';

export interface IRememberedDevice extends Document {
  schoolId: string;
  userId: string;
  deviceId: string;
  deviceLabel?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rememberedDeviceSchema = new Schema<IRememberedDevice>(
  {
    schoolId:    { type: String, required: true, index: true },
    userId:      { type: String, required: true, index: true },
    deviceId:    { type: String, required: true, unique: true },
    deviceLabel: { type: String, trim: true },
    lastUsedAt:  { type: Date, default: Date.now },
    expiresAt:   { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

rememberedDeviceSchema.index({ userId: 1 });

export const RememberedDevice = mongoose.model<IRememberedDevice>('RememberedDevice', rememberedDeviceSchema);
