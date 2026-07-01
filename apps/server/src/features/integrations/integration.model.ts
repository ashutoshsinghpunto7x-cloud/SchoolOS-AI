import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type IntegrationProviderType =
  | 'attendance'
  | 'payment'
  | 'communication'
  | 'erp'
  | 'calendar'
  | 'lms'
  | 'custom';

export type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing'
  | 'pending';

export type SyncStatus = 'running' | 'completed' | 'failed' | 'partial';

export type SyncType = 'manual' | 'scheduled' | 'webhook' | 'initial';

export type Environment = 'production' | 'sandbox';

// ── Sub-interfaces ────────────────────────────────────────────────────────────

export interface IntegrationConfig {
  syncInterval: number;     // minutes; 0 = manual only
  timeout: number;          // ms
  retryCount: number;
  customFields?: Record<string, unknown>;
}

export interface IIntegrationTimelineEvent {
  event: string;
  at: Date;
  note?: string;
  actorId?: string;
  actorName?: string;
}

// ── IIntegration ─────────────────────────────────────────────────────────────

export interface IIntegration extends Document {
  schoolId: string;
  providerType: IntegrationProviderType;
  providerKey: string;       // e.g. 'zkteco', 'razorpay', 'generic_rest'
  name: string;              // user-defined label
  status: IntegrationStatus;
  enabled: boolean;
  environment: Environment;
  credentialsEncrypted: string;  // AES-256-GCM of JSON credentials
  config: IntegrationConfig;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failure' | 'partial';
  lastSyncError?: string;
  nextSyncAt?: Date;
  timeline: IIntegrationTimelineEvent[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── ISyncLog ──────────────────────────────────────────────────────────────────

export interface ISyncLog {
  _id: string;
  integrationId: string;
  schoolId: string;
  providerKey: string;
  syncType: SyncType;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsSynced: number;
  recordsFailed: number;
  errors: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const timelineEventSchema = new Schema<IIntegrationTimelineEvent>(
  {
    event:     { type: String, required: true },
    at:        { type: Date, required: true },
    note:      { type: String },
    actorId:   { type: String },
    actorName: { type: String },
  },
  { _id: false }
);

const configSchema = new Schema<IntegrationConfig>(
  {
    syncInterval: { type: Number, default: 0 },
    timeout:      { type: Number, default: 30000 },
    retryCount:   { type: Number, default: 3 },
    customFields: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const integrationSchema = new Schema<IIntegration>(
  {
    schoolId:             { type: String, required: true },
    providerType:         { type: String, required: true },
    providerKey:          { type: String, required: true },
    name:                 { type: String, required: true },
    status:               { type: String, enum: ['connected', 'disconnected', 'error', 'syncing', 'pending'], default: 'pending' },
    enabled:              { type: Boolean, default: true },
    environment:          { type: String, enum: ['production', 'sandbox'], default: 'sandbox' },
    credentialsEncrypted: { type: String, required: true },
    config:               { type: configSchema, default: {} },
    lastSyncAt:           { type: Date },
    lastSyncStatus:       { type: String, enum: ['success', 'failure', 'partial'] },
    lastSyncError:        { type: String },
    nextSyncAt:           { type: Date },
    timeline:             { type: [timelineEventSchema], default: [] },
    createdBy:            { type: String, required: true },
    createdByName:        { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

integrationSchema.index({ schoolId: 1, providerType: 1 });
integrationSchema.index({ schoolId: 1, status: 1 });
integrationSchema.index({ schoolId: 1, nextSyncAt: 1 });
integrationSchema.index({ schoolId: 1, providerKey: 1 }, { unique: true });

const syncLogSchema = new Schema(
  {
    integrationId:  { type: String, required: true },
    schoolId:       { type: String, required: true },
    providerKey:    { type: String, required: true },
    syncType:       { type: String, enum: ['manual', 'scheduled', 'webhook', 'initial'], required: true },
    status:         { type: String, enum: ['running', 'completed', 'failed', 'partial'], default: 'running' },
    startedAt:      { type: Date, required: true },
    completedAt:    { type: Date },
    recordsSynced:  { type: Number, default: 0 },
    recordsFailed:  { type: Number, default: 0 },
    errors:         { type: [String], default: [] },
    metadata:       { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

syncLogSchema.index({ integrationId: 1, startedAt: -1 });
syncLogSchema.index({ schoolId: 1, startedAt: -1 });

export const Integration = mongoose.model<IIntegration>('Integration', integrationSchema);
export const SyncLog = mongoose.model('SyncLog', syncLogSchema);
