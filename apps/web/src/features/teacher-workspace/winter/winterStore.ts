import { useCallback, useSyncExternalStore } from 'react';

/**
 * Winter-theme state for the teacher dashboard.
 *
 * Purely client-side (localStorage, scoped per teacher): the on/off toggle, the
 * snowflake points / level, and which daily-quest tasks were done on which day.
 * Nothing here is sent to the server — if points/streaks ever need to follow a
 * teacher across devices, this is the single seam to swap for an API.
 */

export interface DayRecord {
  done: string[];
  bonus: boolean;
}

export interface WinterState {
  enabled: boolean;
  points: number;
  days: Record<string, DayRecord>;
}

const KEY_PREFIX = 'teacher-winter-v1:';
const POINTS_PER_LEVEL = 200;
export const BONUS_POINTS = 20;

export const LEVEL_NAMES = ['Snow Scout', 'Frost Helper', 'Frost Mentor', 'Ice Captain', 'Winter Legend'];

const DEFAULT_STATE: WinterState = { enabled: true, points: 0, days: {} };

const cache = new Map<string, WinterState>();
const listeners = new Set<() => void>();

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

/** Local-calendar day key (YYYY-MM-DD) — deliberately not UTC, so a teacher's
 *  "today" rolls over at their local midnight, not at 5:30am IST. */
export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function read(userId: string): WinterState {
  const hit = cache.get(userId);
  if (hit) return hit;
  let state = DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WinterState>;
      state = {
        enabled: parsed.enabled !== false,
        points: typeof parsed.points === 'number' ? parsed.points : 0,
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      };
    }
  } catch {
    state = DEFAULT_STATE;
  }
  cache.set(userId, state);
  return state;
}

function write(userId: string, next: WinterState) {
  // Keep only the last 60 days so the record can't grow without bound.
  const keys = Object.keys(next.days).sort();
  const days = { ...next.days };
  keys.slice(0, Math.max(0, keys.length - 60)).forEach((k) => delete days[k]);
  const clean = { ...next, days };
  cache.set(userId, clean);
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(clean));
  } catch {
    /* storage full / blocked — state still works for this session */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function levelInfo(points: number) {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const base = (level - 1) * POINTS_PER_LEVEL;
  return {
    level,
    name: LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1],
    into: points - base,
    span: POINTS_PER_LEVEL,
    pct: Math.min(100, ((points - base) / POINTS_PER_LEVEL) * 100),
  };
}

/** Consecutive completed-quest days ending today (or yesterday, so the streak
 *  isn't shown as broken before the teacher has had a chance to play today). */
export function computeStreak(days: Record<string, DayRecord>): number {
  const cursor = new Date();
  if (!days[dayKey(cursor)]?.bonus) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days[dayKey(cursor)]?.bonus) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useWinter(userId: string | undefined) {
  const id = userId ?? 'anon';
  const state = useSyncExternalStore(
    subscribe,
    () => read(id),
    () => DEFAULT_STATE,
  );

  const setEnabled = useCallback(
    (enabled: boolean) => write(id, { ...read(id), enabled }),
    [id],
  );

  /** Marks a task done for today and awards its points. Returns true only the
   *  first time, so callers can celebrate exactly once. */
  const completeTask = useCallback(
    (taskId: string, points: number): boolean => {
      const cur = read(id);
      const key = dayKey();
      const day = cur.days[key] ?? { done: [], bonus: false };
      if (day.done.includes(taskId)) return false;
      write(id, {
        ...cur,
        points: cur.points + points,
        days: { ...cur.days, [key]: { ...day, done: [...day.done, taskId] } },
      });
      return true;
    },
    [id],
  );

  /** Awards the all-tasks-done bonus once per day. */
  const claimBonus = useCallback((): boolean => {
    const cur = read(id);
    const key = dayKey();
    const day = cur.days[key] ?? { done: [], bonus: false };
    if (day.bonus) return false;
    write(id, {
      ...cur,
      points: cur.points + BONUS_POINTS,
      days: { ...cur.days, [key]: { ...day, bonus: true } },
    });
    return true;
  }, [id]);

  const today = state.days[dayKey()] ?? { done: [], bonus: false };

  return {
    enabled: state.enabled,
    setEnabled,
    points: state.points,
    days: state.days,
    today,
    streak: computeStreak(state.days),
    level: levelInfo(state.points),
    completeTask,
    claimBonus,
  };
}
