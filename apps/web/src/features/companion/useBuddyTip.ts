import { useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { companionConfigFor, findCompanionRoute } from './companionConfigs';

/** Where the buddy perches: above an icon, right of a row, on a card's corner, or below a top-bar item. */
export type BuddyTipKind = 'icon' | 'row' | 'card' | 'below';

type BuddyTipAttrs = { 'data-buddy-tip'?: string; 'data-buddy-kind'?: BuddyTipKind };

/**
 * Returns a function that gives the hover-tip data attributes for a nav item
 * pointing at `path`, using the signed-in role's companion config. Spread the
 * result onto the link: `<NavLink {...tip('/teacher/classes', 'icon')} />`.
 * Returns {} when the role has no buddy or the path has no hint.
 */
export function useBuddyTip() {
  const { user } = useAuth();
  const config = companionConfigFor(user?.role);
  return useCallback(
    (path: string, kind: BuddyTipKind = 'row', label?: string): BuddyTipAttrs => {
      const route = config ? findCompanionRoute(config, path) : null;
      if (!route?.hint) return {};
      return { 'data-buddy-tip': `${label ?? route.label}|${route.hint}`, 'data-buddy-kind': kind };
    },
    [config],
  );
}
