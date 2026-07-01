import mongoose, { Document, Schema } from 'mongoose';

export type ApiKeyScope =
  | 'read:students'
  | 'read:teachers'
  | 'read:attendance'
  | 'read:fees'
  | 'write:attendance'
  | 'write:fees'
  | 'read:integrations'
  | 'write:integrations';

export interface IApiKey extends Document {
  schoolId: string;
  name: string;
  keyPrefix: string;   // first 12 chars — used for DB lookup
  keyHash: string;     // bcrypt hash of the full key
  scopes: ApiKeyScope[];
  enabled: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    schoolId:     { type: String, required: true },
    name:         { type: String, required: true },
    keyPrefix:    { type: String, required: true },
    keyHash:      { type: String, required: true },
    scopes:       { type: [String], default: [] },
    enabled:      { type: Boolean, default: true },
    lastUsedAt:   { type: Date },
    expiresAt:    { type: Date },
    createdBy:    { type: String, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

apiKeySchema.index({ schoolId: 1, createdAt: -1 });
apiKeySchema.index({ keyPrefix: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
