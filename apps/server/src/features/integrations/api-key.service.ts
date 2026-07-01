import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { AuthContext } from '../../lib/auth-context';
import { apiKeyRepository } from './api-key.repository';
import { auditService } from '../audit/audit.service';
import type { IApiKey, ApiKeyScope } from './api-key.model';

const BCRYPT_ROUNDS = 10;
const KEY_PREFIX_LEN = 12;

class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
}

const createSchema = z.object({
  name:      z.string().min(1).max(100),
  scopes:    z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

// ── Key Generation ────────────────────────────────────────────────────────────

function generateApiKey(): { raw: string; prefix: string } {
  const raw = `sk_${process.env.NODE_ENV === 'production' ? 'live' : 'test'}_${crypto.randomBytes(24).toString('base64url')}`;
  return { raw, prefix: raw.slice(0, KEY_PREFIX_LEN) };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const apiKeyService = {
  async list(ctx: AuthContext): Promise<Omit<IApiKey, 'keyHash'>[]> {
    const keys = await apiKeyRepository.findBySchool(ctx.schoolId);
    return keys.map(({ keyHash: _h, ...rest }) => rest as Omit<IApiKey, 'keyHash'>);
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<{ key: IApiKey; rawKey: string }> {
    const input = createSchema.parse(rawInput);
    const { raw, prefix } = generateApiKey();
    const keyHash = await bcrypt.hash(raw, BCRYPT_ROUNDS);

    const key = await apiKeyRepository.create({
      schoolId:     ctx.schoolId,
      name:         input.name,
      keyPrefix:    prefix,
      keyHash,
      scopes:       input.scopes as ApiKeyScope[],
      createdBy:    ctx.userId,
      createdByName: ctx.displayName,
      expiresAt:    input.expiresAt ? new Date(input.expiresAt) : undefined,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'apikey.created',
      resource:        'apikey',
      resourceId:      String(key._id),
      details:         { name: input.name, scopes: input.scopes },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    // rawKey is shown ONCE at creation — never stored in plaintext
    return { key, rawKey: raw };
  },

  async rotate(id: string, ctx: AuthContext): Promise<{ key: IApiKey; rawKey: string }> {
    const existing = await apiKeyRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('API key not found');

    const { raw, prefix } = generateApiKey();
    const keyHash = await bcrypt.hash(raw, BCRYPT_ROUNDS);

    const updated = await apiKeyRepository.create({
      schoolId:     ctx.schoolId,
      name:         existing.name,
      keyPrefix:    prefix,
      keyHash,
      scopes:       existing.scopes,
      createdBy:    ctx.userId,
      createdByName: ctx.displayName,
      expiresAt:    existing.expiresAt,
    });

    // Revoke the old key
    await apiKeyRepository.revoke(id);

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'apikey.rotated',
      resource:        'apikey',
      resourceId:      id,
      details:         { newKeyId: String(updated._id) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { key: updated, rawKey: raw };
  },

  async revoke(id: string, ctx: AuthContext): Promise<void> {
    const existing = await apiKeyRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('API key not found');
    await apiKeyRepository.revoke(id);
    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'apikey.revoked',
      resource:        'apikey',
      resourceId:      id,
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  /**
   * Validate an incoming API key. Returns the key record if valid, null otherwise.
   * Updates lastUsedAt if valid.
   */
  async validate(rawKey: string): Promise<IApiKey | null> {
    if (!rawKey || rawKey.length < KEY_PREFIX_LEN) return null;
    const prefix = rawKey.slice(0, KEY_PREFIX_LEN);
    const keyRecord = await apiKeyRepository.findByPrefix(prefix);
    if (!keyRecord) return null;

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) return null;

    const valid = await bcrypt.compare(rawKey, keyRecord.keyHash);
    if (!valid) return null;

    // Fire-and-forget lastUsedAt update
    apiKeyRepository.updateLastUsed(String(keyRecord._id)).catch(() => {});

    return keyRecord;
  },
};
