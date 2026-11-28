import { useCallback, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import type { UserRole } from '@schoolos/types';
import { useFeature } from '@/lib/featureFlags/FeatureFlagProvider';
import { getHomePathForRole } from '@/features/auth/utils/roleHome';

/**
 * Winter look for every dashboard except the teacher's (which has its own richer
 * version under teacher-workspace/winter). It is an "ambient" layer — snow,
 * frosted cards, icy backdrop — applied by AppLayout on each role's dashboard
 * home page only, so tables/forms elsewhere are untouched.
 *
 * Two switches: the Ops Centre flag `winter-theme-dashboards` (kill switch for
 * everyone) and a per-device toggle the user can flip from the dashboard.
 */

const KEY = 'winter-ambient-v1';
const listeners = new Set<() => void>();

function readPref(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function setPref(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* blocked storage — toggle just won't persist */
  }
  listeners.forEach((l) => l());
}

/** Roles whose dashboard gets the ambient look. Teacher has its own theme;
 *  driver is a single full-bleed page. */
const EXCLUDED: UserRole[] = ['teacher', 'driver'];

export function useAmbientWinter(role: UserRole | undefined) {
  const { pathname } = useLocation();
  const allowed = useFeature('winter-theme-dashboards');
  const pref = useSyncExternalStore(subscribe, readPref, () => true);
  const toggle = useCallback((on: boolean) => setPref(on), []);

  const home = role ? getHomePathForRole(role) : '';
  const clean = pathname.replace(/\/+$/, '') || '/';
  // Admin also lands on /reception, which is a dashboard in its own right.
  const onDashboard = !!role && !EXCLUDED.includes(role)
    && (clean === home || (role === 'admin' && clean === '/reception'));

  return {
    /** Dashboard + flag on — the toggle pill is worth showing. */
    available: allowed && onDashboard,
    /** Actually render the winter look. */
    active: allowed && onDashboard && pref,
    toggle,
  };
}
