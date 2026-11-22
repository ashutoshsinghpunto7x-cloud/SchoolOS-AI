import { useEffect, useMemo, useRef, useState } from 'react';
import { Frosty } from './Frosty';
import { buzz, snowstorm, sparkleAtElement } from './snowBus';

interface Props {
  greeting: string;
  firstName: string;
  dateStr: string;
  streak: number;
  /** Live "Maths · 8-B in 12 min" line, or null when the teaching day is over. */
  nextLabel: string | null;
  level: { level: number; name: string; into: number; span: number; pct: number };
  points: number;
  /** Context-aware lines Frosty cycles through (built from the teacher's real day). */
  tips: string[];
  onTurnOff: () => void;
}

const SILLY = [
  'Hehe, that tickles! 😆',
  'Careful — I melt under pressure!',
  'Got a carrot? 🥕',
  'Hot cocoa is my weakness ☕',
];

// Deterministic scenery so it doesn't reshuffle on every re-render.
const STARS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { left: r(1) * 100, top: r(2) * 50, delay: r(3) * 3, size: 1 + r(4) * 2.4 };
});
const PINES: Array<[number, number]> = [[60, 1], [120, 0.8], [170, 1.1], [880, 0.9], [940, 1.2], [1000, 0.8], [1050, 1], [520, 0.7]];

export function WinterHero({ greeting, firstName, dateStr, streak, nextLabel, level, points, tips, onTurnOff }: Props) {
  const heroRef = useRef<HTMLElement>(null);
  const [tipIdx, setTipIdx] = useState(0);
  const [bubble, setBubble] = useState(tips[0] ?? 'Brr! Have a great day ❄');
  const [bubbleOut, setBubbleOut] = useState(false);
  const [jump, setJump] = useState(0);
  const taps = useRef(0);
  const swapTimer = useRef<ReturnType<typeof setTimeout>>();

  const say = (text: string) => {
    setBubbleOut(true);
    clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => { setBubble(text); setBubbleOut(false); }, 250);
  };

  // Rotate through the tips every 6s.
  useEffect(() => {
    if (tips.length < 2) return;
    const t = setInterval(() => setTipIdx((i) => (i + 1) % tips.length), 6000);
    return () => clearInterval(t);
  }, [tips.length]);
  useEffect(() => {
    if (tips[tipIdx]) say(tips[tipIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipIdx]);
  useEffect(() => () => clearTimeout(swapTimer.current), []);

  // Parallax: finger-drag / mouse, plus phone tilt where the browser allows it.
  const layers = () => heroRef.current?.querySelectorAll<HTMLElement>('.tw-layer') ?? [];
  const shift = (x: number, y: number) =>
    layers().forEach((l) => { const d = Number(l.dataset.d); l.style.transform = `translate(${-x * d}px,${-y * d * 0.5}px)`; });
  const reset = () => layers().forEach((l) => { l.style.transform = ''; });
  const onPointer = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    shift((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  };
  useEffect(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      shift(Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5, 0);
    };
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => window.removeEventListener('deviceorientation', onTilt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapFrosty = (e: React.MouseEvent<HTMLButtonElement>) => {
    taps.current += 1;
    setJump((j) => j + 1);
    buzz(15);
    sparkleAtElement(e.currentTarget, '❄', 9);
    if (taps.current % 5 === 0) { say('❄ SNOWSTORM! ❄'); snowstorm(); }
    else say(SILLY[taps.current % SILLY.length]);
  };

  const pineSvg = useMemo(
    () => PINES.map(([x, s]) => (
      <g key={x} transform={`translate(${x},${268 - 60 * s}) scale(${s})`}>
        <polygon points="0,60 -18,60 0,22 18,60" fill="#1d3a6e" />
        <polygon points="0,40 -15,40 0,8 15,40" fill="#24488a" />
        <polygon points="0,22 -11,22 0,-8 11,22" fill="#2c5aa6" />
        <path d="M0 -8 L-6 4 L0 1 L6 4Z M0 8 L-9 22 L0 18 L9 22Z" fill="#fff" />
      </g>
    )),
    [],
  );

  return (
    <section
      ref={heroRef}
      className="tw-hero"
      onPointerMove={onPointer}
      onPointerUp={reset}
      onPointerLeave={reset}
      aria-label="Winter greeting"
    >
      <div className="tw-layer" data-d="4">
        {STARS.map((s, i) => (
          <i key={i} className="tw-star" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, width: s.size, height: s.size }} />
        ))}
      </div>
      <div className="tw-layer" data-d="5"><div className="tw-moon" /></div>
      <div className="tw-shoot" />
      <div className="tw-layer" data-d="10">
        <svg className="tw-mts" viewBox="0 0 1100 290" preserveAspectRatio="none"><path d="M0 200 L130 110 L230 170 L360 80 L500 175 L640 95 L780 170 L920 100 L1100 190 V290 H0Z" fill="#5d7fc4" opacity=".55" /></svg>
      </div>
      <div className="tw-layer" data-d="16">
        <svg className="tw-mts" viewBox="0 0 1100 290" preserveAspectRatio="none">
          <path d="M0 235 L110 165 L210 215 L330 150 L460 225 L590 160 L720 220 L860 155 L1000 215 L1100 175 V290 H0Z" fill="#a9c3ee" />
          <path d="M330 150 L300 175 L330 168 L350 180Z M590 160 L565 180 L590 175 L610 185Z M860 155 L835 178 L860 172 L880 184Z" fill="#fff" />
        </svg>
      </div>
      <div className="tw-layer" data-d="26">
        <svg className="tw-mts" viewBox="0 0 1100 290" preserveAspectRatio="none">{pineSvg}</svg>
      </div>
      <svg className="tw-mts" viewBox="0 0 1100 290" preserveAspectRatio="none" style={{ zIndex: 2 }}>
        <path d="M0 262 Q150 238 320 258 T640 255 T1100 250 V290 H0Z" fill="#f4f9ff" />
      </svg>

      <div className="tw-hero-text">
        <h1>{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p>{dateStr}</p>
        <div className="tw-chips">
          {streak > 0 && <span className="tw-chip">🔥 {streak}-day streak</span>}
          {nextLabel && <span className="tw-chip">⏱ {nextLabel}</span>}
        </div>
        <div className="tw-lvl">
          <div className="tw-lvl-row">
            <span>Lv {level.level} · {level.name}</span>
            <span>{level.into}/{level.span} ❄</span>
          </div>
          <div className="tw-lvl-track"><i style={{ width: `${level.pct}%` }} /></div>
          <span className="sr-only">{points} snowflakes in total</span>
        </div>
      </div>

      <div className={`tw-bubble${bubbleOut ? ' tw-bubble-out' : ''}`} role="status" aria-live="polite">{bubble}</div>
      <Frosty onClick={tapFrosty} jumpKey={jump} />

      <button type="button" className="tw-off" onClick={onTurnOff} aria-label="Turn winter theme off">Turn off ✕</button>
    </section>
  );
}
