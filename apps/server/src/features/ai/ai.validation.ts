import { z } from 'zod';

// ── Vapi Webhook Events ───────────────────────────────────────────────────────

const vapiCallSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  endedReason: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  customer: z.object({ number: z.string() }).optional(),
  metadata: z.record(z.string()).optional(),
});

const vapiAnalysisSchema = z.object({
  summary: z.string().optional(),
  structuredData: z.record(z.unknown()).optional(),
  successEvaluation: z.string().optional(),
}).optional();

const vapiArtifactSchema = z.object({
  transcript: z.string().optional(),
  messages: z.array(z.record(z.unknown())).optional(),
}).optional();

export const vapiStatusUpdateSchema = z.object({
  message: z.object({
    type: z.literal('status-update'),
    status: z.string(),
    call: vapiCallSchema,
  }),
});

export const vapiEndOfCallReportSchema = z.object({
  message: z.object({
    type: z.literal('end-of-call-report'),
    endedReason: z.string().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    call: vapiCallSchema,
    analysis: vapiAnalysisSchema,
    artifact: vapiArtifactSchema,
    durationSeconds: z.number().optional(),
  }),
});

// Discriminated union for all Vapi webhook events we handle
export const vapiWebhookSchema = z.object({
  message: z.object({
    type: z.string(),
    call: vapiCallSchema.optional(),
    status: z.string().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    endedReason: z.string().optional(),
    analysis: vapiAnalysisSchema,
    artifact: vapiArtifactSchema,
    durationSeconds: z.number().optional(),
  }),
});

export type VapiWebhookPayload = z.infer<typeof vapiWebhookSchema>;

// ── REST endpoints ────────────────────────────────────────────────────────────

export const initiateCallSchema = z.object({
  studentId: z.string().min(1),
  promptId: z.string().optional(),
});
