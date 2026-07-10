import mongoose, { Document, Schema } from 'mongoose';

export type DevicePlatform = 'ios' | 'android';

export interface IDeviceToken extends Document {
  userId: string;
  schoolId: string;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  updatedAt: Date;
}

const DEVICE_PLATFORMS: DevicePlatform[] = ['ios', 'android'];

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId:   { type: String, required: true },
    schoolId: { type: String, required: true },
    token:    { type: String, required: true },
    platform: { type: String, enum: DEVICE_PLATFORMS, required: true },
  },
  { timestamps: true, versionKey: false }
);

// One row per (user, token) — re-registering the same device just touches updatedAt.
deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
deviceTokenSchema.index({ schoolId: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
