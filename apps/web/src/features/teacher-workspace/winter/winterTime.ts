import { useEffect, useState } from 'react';
import type { TodayClass } from '@schoolos/types';

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Current minutes-since-midnight, refreshed every 30s. */
export function useNowMinutes(): number {
  const [n, setN] = useState(nowMin);
  useEffect(() => {
    const t = setInterval(() => setN(nowMin()), 30_000);
    return () => clearInterval(t);
  }, []);
  return n;
}

export function sortClasses(classes: TodayClass[]): TodayClass[] {
  return [...classes].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
}

export type StopState = 'past' | 'cur' | 'future';

export function stopState(c: TodayClass, now: number): StopState {
  if (now >= toMin(c.endTime)) return 'past';
  if (now >= toMin(c.startTime)) return 'cur';
  return 'future';
}

/** Where the sleigh sits along the route, as a 0–100 percentage. Each class
 *  owns an equal slice of the track; the sleigh rests on a class while it's
 *  running and glides between two classes during the gap. */
export function sleighPercent(sorted: TodayClass[], now: number): number {
  const n = sorted.length;
  if (!n) return 0;
  const pos = (i: number) => ((i + 0.5) / n) * 100;
  const half = (100 / n) * 0.45;
  if (now < toMin(sorted[0].startTime)) return Math.max(0, pos(0) - half);
  for (let i = 0; i < n; i++) {
    const s = toMin(sorted[i].startTime);
    const e = toMin(sorted[i].endTime);
    if (now >= s && now < e) return pos(i);
    const next = sorted[i + 1];
    if (next && now >= e && now < toMin(next.startTime)) {
      const gap = toMin(next.startTime) - e;
      const t = gap > 0 ? (now - e) / gap : 1;
      return pos(i) + (pos(i + 1) - pos(i)) * t;
    }
  }
  return Math.min(100, pos(n - 1) + half);
}

/** "Maths · 8-B in 12 min" / "Now: Maths · ends in 20 min" / null when the
 *  teaching day is over. */
export function nextClassLabel(sorted: TodayClass[], now: number): string | null {
  const cur = sorted.find((c) => stopState(c, now) === 'cur');
  if (cur) return `Now: ${cur.subjectName} · ends in ${toMin(cur.endTime) - now} min`;
  const next = sorted.find((c) => toMin(c.startTime) > now);
  if (!next) return null;
  const mins = toMin(next.startTime) - now;
  const when = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  return `${next.subjectName} · ${next.class}-${next.section} in ${when}`;
}
