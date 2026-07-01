import type { AuthContext } from '../../lib/auth-context';
import { integrationRepository, syncLogRepository } from './integration.repository';
import { credentialService } from './credentials/credential.service';
import { providerRegistry } from './providers/provider.registry';
import { auditService } from '../audit/audit.service';
import type { SyncType } from './integration.model';

class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
}

export const syncService = {
  /**
   * Trigger an immediate sync for an integration.
   * Uses setImmediate so it runs in the background and the response returns immediately.
   */
  async triggerSync(id: string, syncType: SyncType = 'manual', ctx: AuthContext) {
    const integration = await integrationRepository.findById(id);
    if (!integration || integration.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');
    if (!integration.enabled) throw new Error('Integration is disabled');

    const logId = String((await syncLogRepository.create({
      integrationId: id,
      schoolId:      ctx.schoolId,
      providerKey:   integration.providerKey,
      syncType,
    }))._id);

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'integration.sync_started',
      resource:        'integration',
      resourceId:      id,
      details:         { syncType, logId },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    setImmediate(() => syncService._runSyncBackground(id, logId, ctx));

    return { logId, message: 'Sync started' };
  },

  /** Background sync execution — called by setImmediate, never by controllers. */
  async _runSyncBackground(integrationId: string, logId: string, ctx: AuthContext): Promise<void> {
    try {
      const integration = await integrationRepository.findById(integrationId);
      if (!integration) return;

      await integrationRepository.updateStatus(integrationId, 'syncing');
      await integrationRepository.pushTimeline(integrationId, {
        event:     'sync_started',
        note:      `Background sync initiated`,
        actorId:   ctx.userId,
        actorName: ctx.displayName,
      });

      const provider = providerRegistry.get(integration.providerKey);
      const credentials = credentialService.decryptObject(integration.credentialsEncrypted);

      const result = await provider.sync(integration, credentials, ctx);

      const syncStatus = result.success ? 'success' : (result.recordsSynced > 0 ? 'partial' : 'failure');

      // Compute next sync time based on interval
      let nextSyncAt: Date | undefined;
      if (integration.config.syncInterval > 0) {
        nextSyncAt = new Date(Date.now() + integration.config.syncInterval * 60 * 1000);
      }

      await Promise.all([
        syncLogRepository.complete(logId, {
          status:        result.success ? 'completed' : (result.recordsSynced > 0 ? 'partial' : 'failed'),
          recordsSynced: result.recordsSynced,
          recordsFailed: result.recordsFailed,
          errors:        result.errors,
          metadata:      result.metadata,
        }),
        integrationRepository.updateAfterSync(integrationId, syncStatus, result.errors[0], nextSyncAt),
        integrationRepository.pushTimeline(integrationId, {
          event: result.success ? 'sync_completed' : 'sync_failed',
          note:  result.success
            ? `${result.recordsSynced} records synced`
            : `Failed: ${result.errors.slice(0, 2).join('; ')}`,
        }),
      ]);

      auditService.log({
        userId:          ctx.userId,
        userDisplayName: ctx.displayName,
        action:          result.success ? 'integration.sync_completed' : 'integration.sync_failed',
        resource:        'integration',
        resourceId:      integrationId,
        details:         { recordsSynced: result.recordsSynced, errors: result.errors },
        schoolId:        ctx.schoolId,
      });
    } catch (err) {
      await Promise.all([
        syncLogRepository.complete(logId, {
          status: 'failed',
          recordsSynced: 0,
          recordsFailed: 0,
          errors: [err instanceof Error ? err.message : 'Unknown sync error'],
        }),
        integrationRepository.updateAfterSync(integrationId, 'failure', err instanceof Error ? err.message : 'Sync error'),
      ]);
    }
  },

  async getSyncHistory(integrationId: string, ctx: AuthContext, page = 1, limit = 20) {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration || integration.schoolId !== ctx.schoolId) throw new NotFoundError('Integration not found');
    return syncLogRepository.findByIntegration(integrationId, page, limit);
  },

  async getAllSyncHistory(ctx: AuthContext, page = 1, limit = 20) {
    return syncLogRepository.findBySchool(ctx.schoolId, page, limit);
  },
};
