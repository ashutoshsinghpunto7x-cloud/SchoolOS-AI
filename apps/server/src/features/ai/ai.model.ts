import mongoose, { Document, Schema } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiProvider = 'vapi' | 'openai' | 'elevenlabs' | 'mock';
export type AiConversationStatus = 'pending' | 'active' | 'completed' | 'failed';

// ── AiConversation ────────────────────────────────────────────────────────────

export interface IAiConversation extends Document {
  conversationId?: string;   // Provider-assigned ID (e.g. Vapi call ID)
  provider: AiProvider;
  promptId: string;
  promptVersion: string;
  communicationId: string;
  studentId: string;
  status: AiConversationStatus;
  transcript?: string;
  summary?: string;
  durationSeconds?: number;
  createdBy: string;
  schoolId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new Schema<IAiConversation>(
  {
    conversationId: { type: String, index: true, sparse: true },
    provider: { type: String, enum: ['vapi', 'openai', 'elevenlabs', 'mock'], required: true },
    promptId: { type: String, required: true },
    promptVersion: { type: String, required: true },
    communicationId: { type: String, required: true },
    studentId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'failed'],
      default: 'pending',
    },
    transcript: { type: String },
    summary: { type: String },
    durationSeconds: { type: Number },
    createdBy: { type: String, required: true },
    schoolId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

aiConversationSchema.index({ communicationId: 1 });
aiConversationSchema.index({ schoolId: 1, createdAt: -1 });
aiConversationSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

export const AiConversation = mongoose.model<IAiConversation>('AiConversation', aiConversationSchema);

// ── AiUsage ───────────────────────────────────────────────────────────────────

export interface IAiUsage extends Document {
  provider: string;
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs?: number;
  communicationId?: string;
  conversationId?: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageSchema = new Schema<IAiUsage>(
  {
    provider: { type: String, required: true },
    aiModel: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
    durationMs: { type: Number },
    communicationId: { type: String },
    conversationId: { type: String },
    schoolId: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

aiUsageSchema.index({ schoolId: 1, createdAt: -1 });
aiUsageSchema.index({ communicationId: 1 });

export const AiUsage = mongoose.model<IAiUsage>('AiUsage', aiUsageSchema);
