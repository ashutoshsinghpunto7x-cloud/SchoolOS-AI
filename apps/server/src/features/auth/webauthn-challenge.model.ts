import mongoose, { Document, Schema } from 'mongoose';

/** Short-lived challenge issued by generateRegistration/AuthenticationOptions, consumed (and deleted) by the matching verify call. TTL-expired after 5 minutes — same pattern as extraction-job.model.ts. */
export interface IWebAuthnChallenge extends Document {
  purpose: 'register' | 'login';
  userId?: string;
  challenge: string;
  createdAt: Date;
}

const webauthnChallengeSchema = new Schema<IWebAuthnChallenge>(
  {
    purpose:   { type: String, enum: ['register', 'login'], required: true },
    userId:    { type: String },
    challenge: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

webauthnChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export const WebAuthnChallenge = mongoose.model<IWebAuthnChallenge>('WebAuthnChallenge', webauthnChallengeSchema);
