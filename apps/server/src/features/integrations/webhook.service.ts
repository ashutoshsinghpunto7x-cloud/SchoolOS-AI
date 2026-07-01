import { z } from 'zod';
import crypto from 'crypto';
import type { AuthContext } from '../../lib/auth-context';
import { webhookEndpointRepository, webhookDeliveryRepository } from './webhook.repository';
import { credentialService } from './credentials/credential.service';
import { auditService } from '../audit/audit.service';
import type { IWebhookEndpoint } from './webhook.model';

class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
}

const createWebhookSchema = z.object({
  name:          z.string().min(1).max(100),
  url:           z.string().url(),
  events:        z.array(z.string()).min(1),
  secret:        z.string().optional(),
  retryCount:    z.number().int().min(0).max(10).default(3),
  timeoutMs:     z.number().int().min(1000).max(60000).default(15000),
  headers:       z.record(z.string(), z.string()).optional(),
  integrationId: z.string().optional(),
});

const updateWebhookSchema = z.object({
  name:       z.string().min(1).max(100).optional(),
  url:        z.string().url().optional(),
  events:     z.array(z.string()).optional(),
  secret:     z.string().optional(),
  enabled:    z.boolean().optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  timeoutMs:  z.number().int().min(1000).max(60000).optional(),
  headers:    z.record(z.string(), z.string()).optional(),
});

export const webhookService = {
  async list(ctx: AuthContext): Promise<IWebhookEndpoint[]> {
    const hooks = await webhookEndpointRepository.findBySchool(ctx.schoolId);
    return hooks.map((h) => ({ ...h, secretEncrypted: h.secretEncrypted ? '[redacted]' : undefined } as IWebhookEndpoint));
  },

  async getById(id: string, ctx: AuthContext): Promise<IWebhookEndpoint> {
    const hook = await webhookEndpointRepository.findById(id);
    if (!hook || hook.schoolId !== ctx.schoolId) throw new NotFoundError('Webhook not found');
    return { ...hook, secretEncrypted: hook.secretEncrypted ? '[redacted]' : undefined } as IWebhookEndpoint;
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<IWebhookEndpoint> {
    const input = createWebhookSchema.parse(rawInput);

    const secretEncrypted = input.secret ? credentialService.encrypt(input.secret) : undefined;

    const hook = await webhookEndpointRepository.create({
      schoolId:        ctx.schoolId,
      integrationId:   input.integrationId,
      name:            input.name,
      url:             input.url,
      events:          input.events,
      secretEncrypted,
      retryCount:      input.retryCount,
      timeoutMs:       input.timeoutMs,
      headers:         input.headers,
      createdBy:       ctx.userId,
      createdByName:   ctx.displayName,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'webhook.created',
      resource:        'webhook',
      resourceId:      String(hook._id),
      details:         { url: input.url, events: input.events },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { ...hook, secretEncrypted: undefined } as IWebhookEndpoint;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IWebhookEndpoint> {
    const input = updateWebhookSchema.parse(rawInput);
    const existing = await webhookEndpointRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('Webhook not found');

    const updateData: Partial<IWebhookEndpoint> = {};
    if (input.name)            updateData.name = input.name;
    if (input.url)             updateData.url = input.url;
    if (input.events)          updateData.events = input.events;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.retryCount !== undefined) updateData.retryCount = input.retryCount;
    if (input.timeoutMs !== undefined)  updateData.timeoutMs = input.timeoutMs;
    if (input.headers)         updateData.headers = input.headers;
    if (input.secret)          updateData.secretEncrypted = credentialService.encrypt(input.secret);

    const updated = await webhookEndpointRepository.update(id, updateData);
    if (!updated) throw new NotFoundError('Webhook not found');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'webhook.updated',
      resource:        'webhook',
      resourceId:      id,
      details:         { changes: Object.keys(input) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { ...updated, secretEncrypted: undefined } as IWebhookEndpoint;
  },

  async delete(id: string, ctx: AuthContext): Promise<void> {
    const existing = await webhookEndpointRepository.findById(id);
    if (!existing || existing.schoolId !== ctx.schoolId) throw new NotFoundError('Webhook not found');
    await webhookEndpointRepository.delete(id);
    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'webhook.deleted',
      resource:        'webhook',
      resourceId:      id,
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  /**
   * Deliver an event to all matching webhook endpoints for a school.
   * Called fire-and-forget by other services when events occur.
   */
  async dispatchEvent(schoolId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const hooks = await webhookEndpointRepository.findByEvent(schoolId, event);
    for (const hook of hooks) {
      const delivery = await webhookDeliveryRepository.create({ webhookId: String(hook._id), schoolId, event, payload });
      setImmediate(() => webhookService._deliver(String(delivery._id)));
    }
  },

  async _deliver(deliveryId: string): Promise<void> {
    const delivery = await webhookDeliveryRepository.findById(deliveryId);
    if (!delivery) return;

    const hook = await webhookEndpointRepository.findById(delivery.webhookId);
    if (!hook) return;

    const maxAttempts = hook.retryCount + 1;
    const currentAttempts = delivery.attempts.length;
    if (currentAttempts >= maxAttempts) {
      await webhookDeliveryRepository.updateStatus(deliveryId, 'failed');
      return;
    }

    const body = JSON.stringify(delivery.payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SchoolOS-Event': delivery.event,
      'X-SchoolOS-Delivery': deliveryId,
      ...(hook.headers ?? {}),
    };

    // Add HMAC signature if secret configured
    if (hook.secretEncrypted) {
      try {
        const secret = credentialService.decrypt(hook.secretEncrypted);
        const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
        headers['X-SchoolOS-Signature'] = `sha256=${sig}`;
      } catch {
        // If decryption fails, skip signature
      }
    }

    const start = Date.now();
    try {
      const response = await fetch(hook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(hook.timeoutMs),
      });
      const durationMs = Date.now() - start;
      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        await webhookDeliveryRepository.updateStatus(deliveryId, 'delivered', {
          statusCode: response.status,
          responseBody: responseBody.slice(0, 500),
          durationMs,
        });
      } else {
        const shouldRetry = currentAttempts + 1 < maxAttempts;
        await webhookDeliveryRepository.updateStatus(
          deliveryId,
          shouldRetry ? 'retrying' : 'failed',
          { statusCode: response.status, responseBody: responseBody.slice(0, 500), durationMs },
          shouldRetry ? new Date(Date.now() + (currentAttempts + 1) * 60000) : undefined
        );
      }
    } catch (err) {
      const durationMs = Date.now() - start;
      const shouldRetry = currentAttempts + 1 < maxAttempts;
      await webhookDeliveryRepository.updateStatus(
        deliveryId,
        shouldRetry ? 'retrying' : 'failed',
        { error: err instanceof Error ? err.message : 'Delivery failed', durationMs },
        shouldRetry ? new Date(Date.now() + (currentAttempts + 1) * 60000) : undefined
      );
    }
  },

  async getDeliveries(webhookId: string, ctx: AuthContext, page = 1, limit = 20) {
    const hook = await webhookEndpointRepository.findById(webhookId);
    if (!hook || hook.schoolId !== ctx.schoolId) throw new NotFoundError('Webhook not found');
    return webhookDeliveryRepository.findByWebhook(webhookId, page, limit);
  },

  async getAllDeliveries(ctx: AuthContext, page = 1, limit = 20) {
    return webhookDeliveryRepository.findBySchool(ctx.schoolId, page, limit);
  },
};
