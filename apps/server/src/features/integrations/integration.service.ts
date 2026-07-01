import { z } from 'zod';
import type { AuthContext } from '../../lib/auth-context';
import { integrationRepository, syncLogRepository } from './integration.repository';
import { credentialService } from './credentials/credential.service';
import { providerRegistry } from './providers/provider.registry';
import { PROVIDER_CATALOG, getProviderDefinition } from './providers/provider-catalog';
import { auditService } from '../audit/audit.service';
import type { IIntegration } from './integration.model';

class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
}

class ValidationError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ValidationError'; }
}

// ── Validation Schemas ────────────────────────────────────────────────────────

const createSchema = z.object({
  providerKey:  z.string().min(1),
  name:         z.string().min(1).max(100),
  environment:  z.enum(['production', 'sandbox']).default('sandbox'),
  credentials:  z.record(z.string(), z.unknown()),
  config: z.object({
    syncInterval: z.number().int().min(0).default(0),
    timeout:      z.number().int().min(1000).default(30000),
    retryCount:   z.number().int().min(0).max(10).default(3),
    customFields: z.record(z.string(), z.unknown()).optional(),
  }).default({}),
});

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  enabled:     z.boolean().optional(),
  environment: z.enum(['production', 'sandbox']).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  config: z.object({
    syncInterval: z.number().int().min(0).optional(),
    timeout:      z.number().int().min(1000).optional(),
    retryCount:   z.number().int().min(0).max(10).optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

// ── Service ───────────────────────────────────────────────────────────────────

export const integrationService = {
  getCatalog() {
    return PROVIDER_CATALOG;
  },

  async list(ctx: AuthContext, filters: { providerType?: string; status?: string } = {}): Promise<IIntegration[]> {
    const integrations = await integrationRepository.findAll(ctx.schoolId, filters);
    // Strip encrypted credentials from list responses
    return integrations.map((i) => ({ ...i, credentialsEncrypted: '[redacted]' } as IIntegration));
  },

  async getById(id: string, ctx: AuthContext): Promise<IIntegration> {
    const integration = await integrationRepository.findById(id);
    if (!integration || integration.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');
    return { ...integration, credentialsEncrypted: '[redacted]' } as IIntegration;
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<IIntegration> {
    const input = createSchema.parse(rawInput);

    const definition = getProviderDefinition(input.providerKey);
    if (!definition) throw new ValidationError(`Unknown provider: ${input.providerKey}`);

    if (!providerRegistry.has(input.providerKey)) {
      throw new ValidationError(`Provider ${input.providerKey} is not yet implemented`);
    }

    const credentialsEncrypted = credentialService.encryptObject(input.credentials);

    const integration = await integrationRepository.create({
      schoolId:              ctx.schoolId,
      providerType:          definition.providerType,
      providerKey:           input.providerKey,
      name:                  input.name,
      environment:           input.environment,
      credentialsEncrypted,
      config: {
        syncInterval: input.config.syncInterval ?? definition.configDefaults.syncInterval,
        timeout:      input.config.timeout      ?? definition.configDefaults.timeout,
        retryCount:   input.config.retryCount   ?? definition.configDefaults.retryCount,
        customFields: input.config.customFields,
      },
      createdBy:     ctx.userId,
      createdByName: ctx.displayName,
      timeline: [{
        event: 'created',
        at:    new Date(),
        note:  `Provider: ${definition.name}`,
        actorId:   ctx.userId,
        actorName: ctx.displayName,
      }],
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'integration.created',
      resource:        'integration',
      resourceId:      String(integration._id),
      details:         { providerKey: input.providerKey, name: input.name },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { ...integration, credentialsEncrypted: '[redacted]' } as IIntegration;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IIntegration> {
    const input = updateSchema.parse(rawInput);
    const existing = await integrationRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');

    const updateData: Partial<IIntegration> = {};
    if (input.name)        updateData.name = input.name;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.environment) updateData.environment = input.environment;
    if (input.config)      updateData.config = { ...existing.config, ...input.config };

    if (input.credentials) {
      updateData.credentialsEncrypted = credentialService.encryptObject(input.credentials);
      await integrationRepository.pushTimeline(id, {
        event:     'credentials_updated',
        note:      'Credentials updated',
        actorId:   ctx.userId,
        actorName: ctx.displayName,
      });
    }

    const updated = await integrationRepository.update(id, updateData);
    if (!updated) throw new NotFoundError('Integration not found');

    const actionKey = input.enabled === true ? 'integration.enabled'
      : input.enabled === false ? 'integration.disabled'
      : input.credentials ? 'integration.credentials_updated'
      : 'integration.updated';

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          actionKey as 'integration.updated',
      resource:        'integration',
      resourceId:      id,
      details:         { changes: Object.keys(input) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { ...updated, credentialsEncrypted: '[redacted]' } as IIntegration;
  },

  async delete(id: string, ctx: AuthContext): Promise<void> {
    const existing = await integrationRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');
    await integrationRepository.delete(id);
    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'integration.deleted',
      resource:        'integration',
      resourceId:      id,
      details:         { providerKey: existing.providerKey },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  async testConnection(id: string, ctx: AuthContext) {
    const integration = await integrationRepository.findById(id);
    if (!integration || integration.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');

    const provider = providerRegistry.get(integration.providerKey);
    const credentials = credentialService.decryptObject(integration.credentialsEncrypted);

    const result = await provider.testConnection(credentials);

    // Update status based on result
    await integrationRepository.updateStatus(id, result.success ? 'connected' : 'error');
    await integrationRepository.pushTimeline(id, {
      event:     result.success ? 'connection_tested_ok' : 'connection_test_failed',
      note:      result.message,
      actorId:   ctx.userId,
      actorName: ctx.displayName,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'integration.test_connection',
      resource:        'integration',
      resourceId:      id,
      details:         { success: result.success, latencyMs: result.latencyMs },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return result;
  },

  async getHealth(id: string, ctx: AuthContext) {
    const integration = await integrationRepository.findById(id);
    if (!integration || integration.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');

    const provider = providerRegistry.get(integration.providerKey);
    const credentials = credentialService.decryptObject(integration.credentialsEncrypted);
    return provider.getHealth(integration, credentials);
  },

  async getDashboardStats(ctx: AuthContext) {
    const counts = await integrationRepository.countBySchool(ctx.schoolId);
    const integrations = await integrationRepository.findAll(ctx.schoolId);
    const recentSyncs = await syncLogRepository.findBySchool(ctx.schoolId, 1, 5);

    return {
      ...counts,
      recentSyncs: recentSyncs.data,
      integrations: integrations.map((i) => ({ ...i, credentialsEncrypted: '[redacted]' })),
    };
  },
};
