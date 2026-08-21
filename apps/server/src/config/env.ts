import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from '../lib/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Shared cache backend for feature flags / maintenance mode / module restrictions
  // (see lib/redis.ts). Optional: unset locally, each cache falls back to a
  // process-local Map, same behavior as before Redis existed. Required once
  // running more than one server instance, otherwise instances can disagree
  // on flag/maintenance state for up to the cache TTL after a write.
  REDIS_URL: z.string().optional(),
  // Optional: when set, real n8n webhook is triggered. When unset, P0 simulation runs.
  N8N_WEBHOOK_URL: z.string().url().optional(),
  // Optional: shared secret n8n sends in X-Automation-Secret header for webhook validation.
  AUTOMATION_WEBHOOK_SECRET: z.string().optional(),
  SCHOOL_NAME: z.string().default('Sunrise Academy'),
  // JWT
  JWT_ACCESS_SECRET: z.string({ required_error: 'JWT_ACCESS_SECRET is required' }),
  JWT_REFRESH_SECRET: z.string({ required_error: 'JWT_REFRESH_SECRET is required' }),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  // Integration credential encryption — 64-char hex (32-byte AES-256 key)
  // Required in production. Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  // AI — OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  // Caps how many OpenAI calls this server instance has in flight at once, across every
  // concurrent teacher/job — the actual defense against a burst of extraction jobs blowing
  // through the org's shared tokens-per-minute budget (a per-job concurrency cap alone doesn't
  // help once enough jobs are running at the same time). Tune down if still hitting 429s at
  // your org's TPM tier, up if requests are queuing longer than necessary.
  AI_MAX_CONCURRENCY: z.coerce.number().default(4),
  // AI — Vapi (Voice)
  VAPI_API_KEY: z.string().optional(),
  VAPI_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_ASSISTANT_ID: z.string().optional(),
  VAPI_WEBHOOK_SECRET: z.string().optional(),
  // AI — ElevenLabs (Speech)
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  // Twilio — WhatsApp messaging (legacy path, kept for backward compatibility — new
  // notification engine uses Meta WhatsApp Cloud API below instead)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  // Your Twilio WhatsApp-enabled number, e.g. +14155238886 (sandbox) or your own verified number
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  // Meta WhatsApp Cloud API — Communication & Notification Engine
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  // Arbitrary string this server expects back from Meta during webhook (GET) verification.
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  // Ops Center Performance Testing — path to the k6 binary. Defaults to
  // relying on PATH (winget install -e --id GrafanaLabs.k6), override if k6
  // isn't on PATH for the process running the server.
  K6_BIN_PATH: z.string().default('k6'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment variables', { fieldErrors: parsed.error.flatten().fieldErrors });
  process.exit(1);
}

// AUTOMATION_WEBHOOK_SECRET is optional in the schema (so unauthenticated n8n
// dispatch keeps working in dev without extra setup), but leaving it unset in
// production means POST /automation/webhook accepts unauthenticated job
// mutations — fail closed the same way INTEGRATION_ENCRYPTION_KEY does.
if (parsed.data.NODE_ENV === 'production' && !parsed.data.AUTOMATION_WEBHOOK_SECRET) {
  logger.error('AUTOMATION_WEBHOOK_SECRET must be set in production.');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
