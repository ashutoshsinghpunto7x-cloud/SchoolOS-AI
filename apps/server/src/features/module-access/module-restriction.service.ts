import { MODULE_CATALOG } from './module-catalog';
import { moduleRestrictionRepository } from './module-restriction.repository';
import { moduleRestrictionCache } from './module-restriction.cache';
import { IModuleRestriction } from './module-restriction.model';
import { bulkSetRestrictionSchema, BulkSetRestrictionInput } from './module-restriction.validation';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export interface ModuleAccessRow {
  key: string;
  label: string;
  restricted: boolean;
  message?: string;
  returnAt?: Date;
  showReturnTime: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

async function getCachedRestricted(): Promise<IModuleRestriction[]> {
  const cached = moduleRestrictionCache.get();
  if (cached) return cached;
  const all = await moduleRestrictionRepository.findAll();
  moduleRestrictionCache.set(all);
  return all;
}

export const moduleAccessService = {
  /** Full catalog merged with current state — Ops Center management screen. */
  async listAll(): Promise<ModuleAccessRow[]> {
    const existing = await moduleRestrictionRepository.findAll();
    const byKey = new Map(existing.map((r) => [r.moduleKey, r]));

    return MODULE_CATALOG.map((entry) => {
      const row = byKey.get(entry.key);
      return {
        key: entry.key,
        label: entry.label,
        restricted: row?.restricted ?? false,
        message: row?.message,
        returnAt: row?.returnAt,
        showReturnTime: row?.showReturnTime ?? false,
        updatedAt: row?.updatedAt,
        updatedBy: row?.updatedBy,
      };
    });
  },

  /** What every authenticated tab polls — minimal payload, restricted modules only. */
  async getRestrictedStatus(): Promise<Record<string, { message?: string; returnAt?: Date; showReturnTime: boolean }>> {
    const all = await getCachedRestricted();
    const result: Record<string, { message?: string; returnAt?: Date; showReturnTime: boolean }> = {};
    for (const r of all) {
      if (!r.restricted) continue;
      result[r.moduleKey] = { message: r.message, returnAt: r.returnAt, showReturnTime: r.showReturnTime };
    }
    return result;
  },

  async bulkSet(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const data: BulkSetRestrictionInput = bulkSetRestrictionSchema.parse(rawInput);

    await moduleRestrictionRepository.bulkSet(
      data.moduleKeys,
      {
        restricted: data.restricted,
        message: data.message,
        returnAt: data.returnAt,
        showReturnTime: data.showReturnTime,
      },
      ctx.userId
    );
    moduleRestrictionCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: data.restricted ? 'module_access.restricted' : 'module_access.restored',
      resource: 'module_access', resourceId: data.moduleKeys.join(','),
      details: { moduleKeys: data.moduleKeys, message: data.message, returnAt: data.returnAt, showReturnTime: data.showReturnTime },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
