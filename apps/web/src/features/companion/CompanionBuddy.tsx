import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { findCompanionRoute, type CompanionConfig } from './companionConfigs';
import './companionBuddy.css';

// A small companion character ("glide buddy") that lives in the bottom-right
// corner of every dashboard. It:
//  - glides to anything marked with `data-buddy-tip="Title|Text"` when the
//    user pauses on it, and explains it in a speech bubble;
//  - flies to the new page's heading after every navigation and says where you are;
//  - on click, opens that dashboard's AI assistant (`onActivate`), or — where
//    there is none — explains the current page;
//  - looks thoughtful while an assistant is working, and cheers when it answers.
// Optional `data-buddy-kind` ("icon" | "row" | "card" | "below", default card) picks where it perches.
// Per-dashboard wording/placement lives in companionConfigs.ts.
//
// Movement is imperative (transforms + rAF) so the eyes can follow the cursor
// every frame without re-rendering React.

const SIZE = 56;

interface Point {
  x: number;
  y: number;
}

interface Els {
  root: HTMLButtonElement;
  tilt: HTMLElement;
  bubble: HTMLElement;
  title: HTMLElement;
  text: HTMLElement;
}

interface Controller {
  setOpen(open: boolean): void;
  setThinking(thinking: boolean): void;
  arrived(path: string): void;
  guide(path: string): void;
  destroy(): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function createController(els: Els, getConfig: () => CompanionConfig): Controller {
  const { root, tilt, bubble, title, text } = els;
  const pupils = Array.from(root.querySelectorAll<HTMLElement>('.sb-pupil'));
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');

  let pos: Point = { x: 0, y: 0 };
  let mouse: Point = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isOpen = false;
  let thinking = false;
  let busy = false; // showing a navigation message — hover is ignored meanwhile
  let away = false; // perched somewhere other than home
  let hoverEl: Element | null = null;
  let travelToken = 0;
  let raf = 0;
  let disposed = false;
  const mountedAt = performance.now();
  const timers: Record<string, number> = {};

  const later = (key: string, fn: () => void, ms: number) => {
    window.clearTimeout(timers[key]);
    timers[key] = window.setTimeout(fn, ms);
  };
  const cancel = (key: string) => window.clearTimeout(timers[key]);

  // Bottom-right corner, lifted above whatever bottom nav the dashboard has.
  const home = (): Point => ({
    x: window.innerWidth - SIZE - (window.innerWidth >= 640 ? 24 : 16),
    y: window.innerHeight - SIZE - getConfig().bottomOffset(window.innerWidth),
  });

  /* ---------- movement ---------- */
  function moveTo(p: Point, fast = false) {
    const next = { x: clamp(p.x, 8, window.innerWidth - SIZE - 8), y: clamp(p.y, 8, window.innerHeight - SIZE - 8) };
    const dx = next.x - pos.x;
    const dist = Math.hypot(dx, next.y - pos.y);
    pos = next;
    root.classList.toggle('sb-fast', fast);
    root.style.transform = `translate(${next.x}px, ${next.y}px)`;
    if (reduceMq.matches || dist < 12) return;

    // Lean into the direction of travel, leave a sparkle trail, squash on landing.
    tilt.style.setProperty('--sb-tilt', `${clamp(dx / 25, -14, 14)}deg`);
    root.classList.add('sb-moving');
    const token = ++travelToken;
    const until = performance.now() + (fast ? 450 : 700) * 0.8;
    let last = 0;
    const tick = (t: number) => {
      if (disposed || token !== travelToken) return;
      if (dist > 120 && t - last > 45) {
        spawnTrail();
        last = t;
      }
      if (t < until) {
        requestAnimationFrame(tick);
        return;
      }
      tilt.style.setProperty('--sb-tilt', '0deg');
      root.classList.remove('sb-moving');
      pulse('sb-land', 350);
    };
    requestAnimationFrame(tick);
  }

  function spawnTrail() {
    const r = root.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'sb-trail';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = Math.random() > 0.5 ? '✦' : '•';
    s.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 20}px`;
    s.style.top = `${r.top + r.height * 0.7}px`;
    document.body.appendChild(s);
    window.setTimeout(() => s.remove(), 800);
  }

  function pulse(cls: string, ms: number) {
    if (reduceMq.matches && cls !== 'sb-blink') return;
    root.classList.remove(cls);
    void root.offsetWidth; // restart the CSS animation
    root.classList.add(cls);
    later(cls, () => root.classList.remove(cls), ms);
  }

  function mood(m: 'sb-happy' | 'sb-thinking' | null, ms?: number) {
    root.classList.remove('sb-happy', 'sb-thinking');
    cancel('mood');
    if (!m) return;
    root.classList.add(m);
    if (ms) later('mood', () => root.classList.remove(m), ms);
  }

  /* ---------- speech bubble ---------- */
  function say(heading: string, body: string, at: Point, place: 'side' | 'above', delay = 0) {
    cancel('bubble');
    bubble.classList.remove('sb-show');
    later(
      'bubble',
      () => {
        title.textContent = heading;
        text.textContent = body;
        bubble.classList.remove('sb-right', 'sb-left', 'sb-above');
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;
        let left: number;
        let top: number;
        let side: string;
        if (place === 'above') {
          side = 'sb-above';
          left = at.x + SIZE - bw;
          top = at.y - bh - 18;
        } else {
          side = at.x + SIZE + 12 + bw < window.innerWidth - 12 ? 'sb-right' : 'sb-left';
          left = side === 'sb-right' ? at.x + SIZE + 12 : at.x - bw - 12;
          top = at.y + SIZE / 2 - bh / 2;
        }
        bubble.style.left = `${clamp(left, 12, window.innerWidth - bw - 12)}px`;
        bubble.style.top = `${clamp(top, 12, window.innerHeight - bh - 12)}px`;
        bubble.classList.add(side);
        requestAnimationFrame(() => bubble.classList.add('sb-show'));
      },
      delay,
    );
  }
  function hush() {
    cancel('bubble');
    bubble.classList.remove('sb-show');
  }

  /* ---------- eyes ---------- */
  function eyeLoop() {
    if (disposed) return;
    if (!root.classList.contains('sb-thinking')) {
      const r = root.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.45;
      const ang = Math.atan2(mouse.y - cy, mouse.x - cx);
      const near = Math.min(1, Math.hypot(mouse.x - cx, mouse.y - cy) / 120);
      const t = `translate(${Math.cos(ang) * 3 * near}px, ${Math.sin(ang) * 3.6 * near}px)`;
      pupils.forEach((p) => (p.style.transform = t));
    }
    raf = requestAnimationFrame(eyeLoop);
  }
  function blinkLoop() {
    later('blinkLoop', () => {
      pulse('sb-blink', 140);
      blinkLoop();
    }, 2500 + Math.random() * 3500);
  }

  /* ---------- behaviours ---------- */
  function spotFor(el: Element): Point {
    const r = el.getBoundingClientRect();
    const kind = (el as HTMLElement).dataset.buddyKind;
    if (kind === 'icon') return { x: r.left + r.width / 2 - SIZE / 2 + 18, y: r.top - SIZE + 6 };
    if (kind === 'row') return { x: r.right + 10, y: r.top + r.height / 2 - SIZE / 2 };
    if (kind === 'below') return { x: r.left + r.width / 2 - SIZE / 2, y: r.bottom + 10 }; // top-bar items
    return { x: r.right - SIZE + 8, y: r.top - SIZE + 14 }; // perch on a card's top-right corner
  }

  function visit(el: Element) {
    const raw = (el as HTMLElement).dataset.buddyTip ?? '';
    const [heading, body = ''] = raw.split('|');
    moveTo(spotFor(el), away);
    away = true;
    say(heading, body, pos, 'side', reduceMq.matches ? 0 : 380);
  }

  function goHome(fast = false) {
    hush();
    away = false;
    moveTo(home(), fast);
  }

  const onMouseMove = (e: MouseEvent) => {
    mouse = { x: e.clientX, y: e.clientY };
  };

  // Short intent delay so the buddy doesn't chase every flick of the mouse.
  const onMouseOver = (e: MouseEvent) => {
    if (!hoverMq.matches) return;
    const el = (e.target as Element | null)?.closest?.('[data-buddy-tip]') ?? null;
    if (el === hoverEl) return;
    hoverEl = el;
    cancel('hover');
    if (busy || isOpen) return;
    if (el) later('hover', () => visit(el), away ? 140 : 480);
    else if (away) later('hover', () => goHome(), 650);
  };

  // Perched spots are viewport-fixed, so any scroll strands the buddy — send it home.
  const onScroll = (e: Event) => {
    if (e.target === bubble || !away || isOpen) return;
    cancel('hover');
    cancel('navDone');
    busy = false;
    goHome(true);
  };
  const onResize = () => {
    if (!away) moveTo(home(), true);
  };

  function arrived(path: string) {
    // Redirects right after mount (e.g. login → /principal) aren't real navigation;
    // let the entrance + greeting play instead.
    if (performance.now() - mountedAt < 1500) return;
    cancel('hover');
    cancel('nav');
    cancel('navDone');
    if (isOpen) {
      // Navigated by a chat command — just a little celebration at home.
      mood('sb-happy', 1400);
      pulse('sb-hop', 700);
      return;
    }
    busy = true;
    hush();
    const started = performance.now();
    const config = getConfig();
    const isHome = path === config.homePath;
    const route = findCompanionRoute(config, path);

    const tryLand = () => {
      if (disposed) return;
      const h1 = document.querySelector('main h1');
      if (!h1 && performance.now() - started < 2000) {
        later('nav', tryLand, 150);
        return;
      }
      let target = home();
      let place: 'side' | 'above' = 'above';
      if (h1) {
        const range = document.createRange();
        range.selectNodeContents(h1);
        const r = range.getBoundingClientRect();
        if (r.width > 0 && r.top > 40 && r.bottom < window.innerHeight - SIZE) {
          target = { x: r.right + 12, y: r.top + r.height / 2 - SIZE / 2 };
          place = 'side';
        }
      }
      const h1Text = h1?.textContent?.trim() ?? '';
      const label = route?.label ?? (h1Text.length > 0 && h1Text.length <= 40 ? h1Text : null);
      const heading = isHome ? 'Back on your dashboard' : label ? `Here's ${label}` : 'Here we are';
      const body = isHome
        ? "Hover anything and I'll tell you what's inside."
        : route?.hint ?? 'Need a hand here? Click me.';

      moveTo(target);
      away = place === 'side';
      const arrive = reduceMq.matches || place === 'above' ? 0 : 650;
      later('cheer', () => {
        mood('sb-happy', 1600);
        pulse('sb-hop', 700);
      }, arrive);
      say(heading, body, pos, place, arrive + 150);
      later('navDone', () => {
        busy = false;
        goHome();
      }, arrive + 3200);
    };
    later('nav', tryLand, 250);
  }

  // Click on a dashboard with no chat assistant: explain the current page
  // (a second click while the bubble is up dismisses it).
  function guide(path: string) {
    if (bubble.classList.contains('sb-show') && !away) {
      hush();
      return;
    }
    cancel('hover');
    cancel('nav');
    cancel('navDone');
    busy = false;
    goHome(true);
    pulse('sb-poke', 400);
    mood('sb-happy', 1200);
    const config = getConfig();
    const route = findCompanionRoute(config, path);
    const isHome = path === config.homePath;
    say(
      isHome ? 'Your dashboard' : route ? `You're on ${route.label}` : 'Need a hand?',
      route?.hint && !isHome
        ? `${route.hint} Hover any button and I'll explain it.`
        : "Hover any button or menu and I'll explain what it does.",
      home(),
      'above',
    );
    later('guideOff', () => {
      if (!away) hush();
    }, 6000);
  }

  function setOpen(open: boolean) {
    isOpen = open;
    cancel('hover');
    if (open) {
      cancel('nav');
      cancel('navDone');
      busy = false;
      goHome(true);
      pulse('sb-poke', 400);
      mood('sb-happy', 1200);
    } else if (!thinking) {
      mood(null);
    }
  }

  function setThinking(next: boolean) {
    if (next === thinking) return;
    thinking = next;
    if (next) {
      mood('sb-thinking');
    } else {
      mood('sb-happy', 1400);
      pulse('sb-hop', 700);
    }
  }

  /* ---------- start ---------- */
  root.classList.add('sb-instant');
  pos = { x: home().x, y: window.innerHeight + 20 };
  root.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.classList.remove('sb-instant');
      moveTo(home());
      later('hello', () => {
        mood('sb-happy', 1400);
        pulse('sb-hop', 700);
        let greeted = false;
        try {
          greeted = sessionStorage.getItem('schoolos.buddyGreeted') === '1';
          sessionStorage.setItem('schoolos.buddyGreeted', '1');
        } catch {
          /* storage unavailable — greet anyway */
        }
        if (!greeted) {
          say("Hi! I'm your SchoolOS buddy", getConfig().hello, pos, 'above');
          later('helloOff', () => {
            if (!busy && !away) hush();
          }, 4200);
        }
      }, 750);
    }),
  );
  raf = requestAnimationFrame(eyeLoop);
  blinkLoop();
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseover', onMouseOver);
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('resize', onResize);

  return {
    setOpen,
    setThinking,
    arrived,
    guide,
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      Object.values(timers).forEach((t) => window.clearTimeout(t));
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
    },
  };
}

interface CompanionBuddyProps {
  config: CompanionConfig;
  /** Whether this dashboard's chat assistant is open (buddy stays home while it is). */
  open?: boolean;
  /** An assistant is working on a reply — shows the thinking face. */
  thinking?: boolean;
  /** Click handler, usually toggling the dashboard's assistant. Omit to make a click explain the current page. */
  onActivate?: () => void;
  label?: string;
}

export const CompanionBuddy = ({ config, open = false, thinking = false, onActivate, label = 'Ask AI Assistant' }: CompanionBuddyProps) => {
  const configRef = useRef(config);
  configRef.current = config;
  const rootRef = useRef<HTMLButtonElement>(null);
  const tiltRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const ctl = useRef<Controller | null>(null);
  const { pathname } = useLocation();
  const lastPath = useRef(pathname);

  useEffect(() => {
    const [root, tilt, bubble, title, text] = [rootRef.current, tiltRef.current, bubbleRef.current, titleRef.current, textRef.current];
    if (!root || !tilt || !bubble || !title || !text) return;
    const c = createController({ root, tilt, bubble, title, text }, () => configRef.current);
    ctl.current = c;
    return () => {
      c.destroy();
      ctl.current = null;
    };
  }, []);

  useEffect(() => ctl.current?.setOpen(open), [open]);
  useEffect(() => ctl.current?.setThinking(thinking), [thinking]);
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    ctl.current?.arrived(pathname);
  }, [pathname]);

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={() => (onActivate ? onActivate() : ctl.current?.guide(pathname))}
        aria-label={onActivate && open ? 'Close AI Assistant' : label}
        aria-expanded={onActivate ? open : undefined}
        title={label}
        className="sb-buddy"
      >
        <span className="sb-float">
          <span ref={tiltRef} className="sb-tilt">
            <span className="sb-body">
              <span className="sb-antenna" />
              <span className="sb-eyes">
                <span className="sb-eye"><span className="sb-pupil" /></span>
                <span className="sb-eye"><span className="sb-pupil" /></span>
              </span>
              <span className="sb-cheek l" />
              <span className="sb-cheek r" />
              <span className="sb-mouth" />
            </span>
          </span>
        </span>
      </button>
      <div ref={bubbleRef} className="sb-bubble" role="status" aria-live="polite">
        <strong ref={titleRef} />
        <span ref={textRef} />
      </div>
    </>
  );
};
