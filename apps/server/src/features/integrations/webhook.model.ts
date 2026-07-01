import mongoose, { Document, Schema } from 'mongoose';

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface WebhookAttempt {
  attemptedAt: Date;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs?: number;
}

export interface IWebhookEndpoint extends Document {
  schoolId: string;
  integrationId?: string;   // optional — can be standalone
  name: string;
  url: string;
  events: string[];          // event types this webhook fires for
  secretEncrypted?: string;  // AES-256-GCM encrypted signing secret
  enabled: boolean;
  retryCount: number;
  timeoutMs: number;
  headers?: Record<string, string>;  // custom headers to include
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery extends Document {
  webhookId: string;
  schoolId: string;
  event: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: WebhookAttempt[];
  nextRetryAt?: Date;
  createdAt: Date;
}

const webhookAttemptSchema = new Schema<WebhookAttempt>(
  {
    attemptedAt:  { type: Date, required: true },
    statusCode:   { type: Number },
    responseBody: { type: String },
    error:        { type: String },
    durationMs:   { type: Number },
  },
  { _id: false }
);

const webhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    schoolId:         { type: String, required: true },
    integrationId:    { type: String },
    name:             { type: String, required: true },
    url:              { type: String, required: true },
    events:           { type: [String], default: [] },
    secretEncrypted:  { type: String },
    enabled:          { type: Boolean, default: true },
    retryCount:       { type: Number, default: 3 },
    timeoutMs:        { type: Number, default: 15000 },
    headers:          { type: Schema.Types.Mixed },
    createdBy:        { type: String, required: true },
    createdByName:    { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

webhookEndpointSchema.index({ schoolId: 1, createdAt: -1 });
webhookEndpointSchema.index({ schoolId: 1, events: 1 });

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId:    { type: String, required: true },
    schoolId:     { type: String, required: true },
    event:        { type: String, required: true },
    payload:      { type: Schema.Types.Mixed, required: true },
    status:       { type: String, enum: ['pending', 'delivered', 'failed', 'retrying'], default: 'pending' },
    attempts:     { type: [webhookAttemptSchema], default: [] },
    nextRetryAt:  { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ schoolId: 1, status: 1 });
webhookDeliverySchema.index({ schoolId: 1, createdAt: -1 });

export const WebhookEndpoint = mongoose.model<IWebhookEndpoint>('WebhookEndpoint', webhookEndpointSchema);
export const WebhookDelivery = mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema);
