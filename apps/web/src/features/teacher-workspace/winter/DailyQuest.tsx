import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { BONUS_POINTS, dayKey, useWinter } from './winterStore';
import { buzz, sparkle, sparkleAtElement } from './snowBus';

export interface QuestTask {
  id: string;
  label: string;
  points: number;
  /** Auto-detected from real data (attendance) — can't be ticked by hand. */
  auto?: boolean;
  /** Where "Open" should take the teacher. */
  path: string;
}

type Winter = ReturnType<typeof useWinter>;

/** Snowman that grows as the day's tasks get done (stages 0–3). */
function Snowman({ stage }: { stage: number }) {
  return (
    <svg className={`tw-snowman tw-snowman-s${stage}`} viewBox="0 0 130 176" aria-hidden="true">
      <circle className="tw-ghost" cx="65" cy="138" r="34" />
      <circle className="tw-ghost" cx="65" cy="88" r="26" />
      <circle className="tw-ghost" cx="65" cy="45" r="20" />
      <g className="tw-part tw-p1">
        <circle cx="65" cy="138" r="34" fill="#fff" stroke="#c5d6ee" strokeWidth="2" />
        <circle cx="65" cy="122" r="3" fill="#1B2A4E" /><circle cx="65" cy="138" r="3" fill="#1B2A4E" />
      </g>
      <g className="tw-part tw-p2">
        <circle cx="65" cy="88" r="26" fill="#fff" stroke="#c5d6ee" strokeWidth="2" />
        <path d="M39 88 L12 70 M91 88 L118 68" stroke="#6b4423" strokeWidth="4" strokeLinecap="round" />
        <path d="M42 68 Q65 82 88 68 L88 77 Q65 91 42 77Z" fill="#e0354b" />
      </g>
      <g className="tw-part tw-p3">
        <circle cx="65" cy="45" r="20" fill="#fff" stroke="#c5d6ee" strokeWidth="2" />
        <circle cx="58" cy="42" r="2.4" fill="#1B2A4E" /><circle cx="72" cy="42" r="2.4" fill="#1B2A4E" />
        <path d="M65 47 L82 51 L65 53Z" fill="#f08a24" />
        <rect x="46" y="22" width="38" height="6" rx="3" fill="#1B2A4E" />
        <rect x="52" y="4" width="26" height="19" rx="3" fill="#254A9A" />
      </g>
    </svg>
  );
}

const MSGS = ['Base built 🧊', 'Body + scarf done 🧣', 'Snowman complete! 🎉'];

/** Daily quest card. Attendance ticks itself from the teacher's real data; the
 *  other tasks are self-reported (tap the row) with an "Open" shortcut. */
export function DailyQuestCard({
  winter, tasks, attendanceDone, ready, onOpen,
}: {
  winter: Winter;
  tasks: QuestTask[];
  /** True once every class this teacher can mark today has attendance recorded. */
  attendanceDone: boolean;
  /** False while workspace data is loading, so nothing is awarded off empty data. */
  ready: boolean;
  onOpen: (path: string) => void;
}) {
  const { today, completeTask, claimBonus } = winter;
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const doneIds = today.done;
  const doneCount = tasks.filter((t) => doneIds.includes(t.id)).length;
  const total = tasks.length;
  const stage = total ? Math.ceil((doneCount / total) * 3) : 0;
  const todayPts = useMemo(
    () => tasks.filter((t) => doneIds.includes(t.id)).reduce((s, t) => s + t.points, 0) + (today.bonus ? BONUS_POINTS : 0),
    [tasks, doneIds, today.bonus],
  );

  const award = (t: QuestTask) => {
    if (!completeTask(t.id, t.points)) return;
    sparkleAtElement(rowRefs.current[t.id]?.querySelector('.tw-box') ?? null, '❄', 12);
    toast(`+${t.points} ❄ snowflakes!`);
    buzz(25);
  };

  // Attendance is derived from real data — award it the moment it becomes true.
  useEffect(() => {
    const att = tasks.find((t) => t.auto);
    if (ready && att && attendanceDone) award(att);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, attendanceDone, tasks.length]);

  // Bonus once every task is done.
  useEffect(() => {
    if (!ready || !total || doneCount < total || today.bonus) return;
    if (claimBonus()) {
      toast.success(`🎉 Snowman complete! +${BONUS_POINTS} bonus ❄ · lantern lit 🏮`);
      buzz([40, 60, 40, 60, 80]);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => sparkle(window.innerWidth * (0.2 + Math.random() * 0.6), window.innerHeight * (0.25 + Math.random() * 0.4), '❄', 22), i * 170);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, doneCount, total, today.bonus]);

  if (!total) return null;

  return (
    <section className="tw-card tw-pad" aria-label="Today's snowman quest">
      <i className="tw-ledge" />
      <div className="tw-hd"><h3>⛄ Build today&apos;s snowman</h3><span className="tw-count">{doneCount} / {total}</span></div>
      <div className="tw-quest">
        <div>
          {tasks.map((t) => {
            const done = doneIds.includes(t.id);
            return (
              <div key={t.id} className={`tw-task${done ? ' tw-task-done' : ''}`}>
                <button
                  type="button"
                  ref={(el) => { rowRefs.current[t.id] = el; }}
                  className="tw-task-main"
                  disabled={done || t.auto}
                  onClick={() => award(t)}
                  aria-pressed={done}
                  aria-label={`${t.label}${t.auto && !done ? ' — completes automatically' : ''}`}
                >
                  <span className="tw-box" aria-hidden="true">✓</span>
                  <span className="tw-tt-wrap">
                    <span className="tw-tt">{t.label}</span>
                    <span className="tw-pts">+{t.points} ❄</span>
                  </span>
                </button>
                {!done && (
                  <button type="button" className="tw-open" onClick={() => onOpen(t.path)} aria-label={`Open ${t.label}`}>→</button>
                )}
              </div>
            );
          })}
        </div>
        <Snowman stage={stage} />
      </div>
      <div className="tw-qfoot">
        <span>{doneCount ? MSGS[Math.max(0, stage - 1)] : `Finish all ${total} to complete the snowman!`}</span>
        <b>Today: {todayPts} ❄</b>
      </div>
    </section>
  );
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Lantern row: one lantern per recent day, lit when that day's quest was
 *  completed. Built from the same local history as the streak chip. */
export function StreakCard({ winter }: { winter: Winter }) {
  const { days, streak, today } = winter;
  const lanterns = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - i));
    return { key: dayKey(d), label: i === 5 ? 'Today' : WEEKDAY[d.getDay()], isToday: i === 5 };
  });
  return (
    <section className="tw-card tw-pad" aria-label="Quest streak">
      <i className="tw-ledge" />
      <div className="tw-hd"><h3>🏮 Quest streak</h3><span className="tw-streak-n">{streak} {streak === 1 ? 'day' : 'days'}</span></div>
      <div className="tw-lanterns">
        {lanterns.map((l) => {
          const lit = l.isToday ? today.bonus : Boolean(days[l.key]?.bonus);
          return (
            <div key={l.key} className={`tw-lan${lit ? ' tw-lan-on' : ''}${l.isToday ? ' tw-lan-today' : ''}`}>
              <div className="tw-bulb" />{l.label}
            </div>
          );
        })}
      </div>
      <p className="tw-note">Finish today&apos;s quest to light the next lantern and keep the streak glowing.</p>
    </section>
  );
}
