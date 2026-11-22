import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './snowBus';

interface Flake { x: number; y: number; r: number; v: number; s: number; a: number; vx: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; ch: string; sz: number; rot: number }

/** Full-screen, pointer-transparent snowfall. Light on purpose: ~42 flakes on
 *  phones, DPR 1, paused while the tab is hidden. A finger/cursor parts the
 *  flakes, and `tw-burst` / `tw-storm` events (see snowBus.ts) add sparkles. */
export function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const size = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    size();

    const COUNT = window.innerWidth < 600 ? 42 : 70;
    const mk = (): Flake => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.4 + 0.8,
      v: Math.random() * 0.8 + 0.35, s: Math.random() * 6.28, a: Math.random() * 0.5 + 0.4, vx: 0,
    });
    const flakes: Flake[] = Array.from({ length: COUNT }, mk);
    let sparks: Spark[] = [];
    const pt = { x: -999, y: -999 };
    let release: ReturnType<typeof setTimeout> | undefined;
    let stormTimer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;

    const onMove = (e: PointerEvent) => { pt.x = e.clientX; pt.y = e.clientY; };
    const onDown = (e: PointerEvent) => { pt.x = e.clientX; pt.y = e.clientY; clearTimeout(release); };
    const onUp = () => { release = setTimeout(() => { pt.x = -999; pt.y = -999; }, 500); };
    const onBurst = (e: Event) => {
      const { x, y, ch, n } = (e as CustomEvent<{ x: number; y: number; ch: string; n: number }>).detail;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28;
        const sp = 2 + Math.random() * 4;
        sparks.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, ch,
          sz: 12 + Math.random() * 12, rot: Math.random() * 6,
        });
      }
    };
    const onStorm = () => {
      flakes.push(...Array.from({ length: 110 }, () => ({ ...mk(), y: -Math.random() * H, v: Math.random() * 3 + 2, vx: 1.5 })));
      clearTimeout(stormTimer);
      stormTimer = setTimeout(() => flakes.splice(COUNT), 6000);
    };

    window.addEventListener('resize', size);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('tw-burst', onBurst);
    window.addEventListener('tw-storm', onStorm);

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      if (!document.hidden) {
        for (const f of flakes) {
          const dx = f.x - pt.x;
          const dy = f.y - pt.y;
          const d = Math.hypot(dx, dy);
          if (d < 80 && d > 0) { f.vx += (dx / d) * 0.9; f.y += (dy / d) * 0.5; }
          f.vx *= 0.94; f.s += 0.012; f.x += Math.sin(f.s) * 0.5 + f.vx; f.y += f.v;
          if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; }
          if (f.x < -5) f.x = W + 5;
          if (f.x > W + 5) f.x = -5;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, 6.283);
          ctx.fillStyle = `rgba(255,255,255,${f.a})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(110,165,240,.35)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        sparks = sparks.filter((p) => p.life > 0);
        for (const p of sparks) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.016; p.rot += 0.1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.font = `${p.sz}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#7db4f5';
          ctx.fillText(p.ch, 0, 0);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(release);
      clearTimeout(stormTimer);
      window.removeEventListener('resize', size);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('tw-burst', onBurst);
      window.removeEventListener('tw-storm', onStorm);
    };
  }, []);

  return <canvas ref={ref} className="tw-fx" aria-hidden="true" />;
}
