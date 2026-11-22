import { useEffect, useRef, useState } from 'react';
import type { TodayClass } from '@schoolos/types';
import { sleighPercent, sortClasses, stopState, useNowMinutes } from './winterTime';

/** "Your school day": one stop per timetable period, with a sleigh that tracks
 *  the real clock. Swipeable on phones; auto-scrolls to the current period. */
export function SchoolDayRoute({ classes, onSelect }: { classes: TodayClass[]; onSelect: (c: TodayClass) => void }) {
  const sorted = sortClasses(classes);
  const now = useNowMinutes();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false); // lets the sleigh glide in from the start on mount
  const n = sorted.length;
  const pct = sleighPercent(sorted, now);

  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !armed) return;
    const t = setTimeout(
      () => el.scrollTo({ left: Math.max(0, (el.scrollWidth * pct) / 100 - el.clientWidth / 2), behavior: 'smooth' }),
      700,
    );
    return () => clearTimeout(t);
    // Re-centre only when the day's shape changes, not every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, n]);

  if (!n) return null;
  const shown = armed ? pct : 0;

  return (
    <section className="tw-card tw-pad" aria-label="Your school day">
      <i className="tw-ledge" />
      <div className="tw-hd"><h3>🛷 Your school day</h3><span className="tw-hint">{n} {n === 1 ? 'class' : 'classes'}</span></div>
      <div className="tw-routewrap" ref={wrapRef}>
        <div className="tw-route" style={{ minWidth: Math.max(n * 104, 300) }}>
          <div className="tw-route-line" />
          <div className="tw-route-done" style={{ width: `${shown}%` }} />
          <div className="tw-sleigh" style={{ left: `${shown}%` }} aria-hidden="true">🛷</div>
          {sorted.map((c, i) => {
            const st = stopState(c, now);
            return (
              <button
                key={c.slotId}
                type="button"
                className={`tw-stop tw-stop-${st}`}
                style={{ left: `${((i + 0.5) / n) * 100}%` }}
                onClick={() => onSelect(c)}
                aria-label={`${c.subjectName}, class ${c.class}-${c.section}, ${c.startTime}`}
              >
                <span className="tw-dot">{st === 'past' ? '✓' : i + 1}</span>
                <span className="tw-lab">
                  {c.subjectName}
                  <small>{c.class}-{c.section} · {c.startTime}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {n > 3 && <p className="tw-swipe">← swipe the day →</p>}
    </section>
  );
}
