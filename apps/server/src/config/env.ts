import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
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
  // AI — Vapi (Voice)
  VAPI_API_KEY: z.string().optional(),
  VAPI_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_ASSISTANT_ID: z.string().optional(),
  VAPI_WEBHOOK_SECRET: z.string().optional(),
  // AI — ElevenLabs (Speech)
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  // Twilio — WhatsApp messaging
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  // Your Twilio WhatsApp-enabled number, e.g. +14155238886 (sandbox) or your own verified number
  TWILIO_WHATSAPP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
