import { MODULE_CATALOG, type ModuleCatalogEntry } from '@schoolos/types';
import type { ModuleRestrictedStatus } from '@/features/ops-center/api/moduleAccessApi';

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The catalog entry (if any) covering the current path — a path can only
 *  ever belong to one module since prefixes don't overlap in MODULE_CATALOG. */
export function findModuleForPath(pathname: string): ModuleCatalogEntry | undefined {
  return MODULE_CATALOG.find((entry) => entry.routePrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix)));
}

export interface ActiveRestriction {
  moduleLabel: string;
  message?: string;
  returnAt?: string;
  showReturnTime: boolean;
}

/** Null when the current path isn't restricted (either it's not a
 *  restrictable module at all, or that module isn't currently restricted). */
export function getActiveRestriction(pathname: string, status: ModuleRestrictedStatus | undefined): ActiveRestriction | null {
  if (!status) return null;
  const entry = findModuleForPath(pathname);
  if (!entry) return null;
  const restriction = status[entry.key];
  if (!restriction) return null;
  return { moduleLabel: entry.label, ...restriction };
}
