import mongoose, { Document, Schema } from 'mongoose';

/** A registered passkey (fingerprint/Face ID/Windows Hello) for a user — mirrors remembered-device.model.ts's conventions. One user may have several (one per device). */
export interface IWebAuthnCredential extends Document {
  schoolId: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports?: string[];
  deviceLabel?: string;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webauthnCredentialSchema = new Schema<IWebAuthnCredential>(
  {
    schoolId:     { type: String, required: true, index: true },
    userId:       { type: String, required: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey:    { type: String, required: true },
    counter:      { type: Number, required: true, default: 0 },
    deviceType:   { type: String, enum: ['singleDevice', 'multiDevice'], required: true },
    backedUp:     { type: Boolean, default: false },
    transports:   { type: [String] },
    deviceLabel:  { type: String, trim: true },
    lastUsedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

webauthnCredentialSchema.index({ userId: 1 });

export const WebAuthnCredential = mongoose.model<IWebAuthnCredential>('WebAuthnCredential', webauthnCredentialSchema);
