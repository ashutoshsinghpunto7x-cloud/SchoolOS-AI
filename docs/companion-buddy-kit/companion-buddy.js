/**
 * Companion Buddy — a small animated assistant character for any web app.
 * No dependencies. Works with plain HTML, React, Vue, Svelte, etc.
 *
 *   import { createCompanionBuddy } from './companion-buddy.js';
 *   import './companion-buddy.css';
 *   const buddy = createCompanionBuddy({ onClick: () => openMyChat() });
 *
 * What it does
 *  - Floats in the bottom-right corner, blinks, and its eyes follow the cursor.
 *  - Hover tips: give any element `data-buddy-tip="Title|Text"` and when the user
 *    pauses on it the buddy glides over (leaving a sparkle trail) and explains it.
 *    `data-buddy-kind` picks where it perches: "card" (default, top-right corner),
 *    "icon" (above), "row" (to the right), "below" (under — for top-bar items).
 *  - Page arrivals: call `buddy.arrived(path)` on route change and it flies to the
 *    page heading, cheers, and says where you are (from `routes`).
 *  - Moods: `setThinking(true)` while your AI works, `cheer()` when it answers.
 *  - Respects prefers-reduced-motion; hover tips only on mouse/trackpad devices.
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.mount=document.body]
 * @param {(e: MouseEvent) => void} [options.onClick]  Click handler. Default: explain the current page.
 * @param {string} [options.label='Assistant']         Accessible name of the button.
 * @param {{path: string, label: string, hint?: string}[]} [options.routes=[]]
 * @param {string} [options.homePath]                  Arriving here says "Back on your dashboard".
 * @param {() => string} [options.getPath]             Current path, for click-to-explain. Default location.pathname.
 * @param {string} [options.headingSelector='main h1, h1']  Where to fly on arrival.
 * @param {(viewportWidth: number) => number} [options.bottomOffset]  Gap from the bottom (e.g. above a bottom nav). Default 24.
 * @param {(viewportWidth: number) => number} [options.rightOffset]   Default 24 (16 under 640px).
 * @param {number} [options.size=56]                   Must match --cb-size in CSS.
 * @param {number} [options.hoverDelay=480]            ms the pointer must rest before the buddy moves.
 * @param {{title: string, text: string} | null} [options.hello]  First-visit greeting (once per session).
 * @param {object} [options.text]                      Override built-in phrases (see DEFAULT_TEXT).
 */

const DEFAULT_TEXT = {
  backHome: 'Back on your dashboard',
  backHomeBody: "Hover anything and I'll tell you what's inside.",
  arrived: (label) => `Here's ${label}`,
  arrivedUnknown: 'Here we are',
  arrivedBody: 'Need a hand here? Click me.',
  guideTitle: (label) => (label ? `You're on ${label}` : 'Need a hand?'),
  guideBody: "Hover any button or menu and I'll explain what it does.",
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createCompanionBuddy(options = {}) {
  const opts = {
    mount: document.body,
    label: 'Assistant',
    routes: [],
    homePath: undefined,
    getPath: () => window.location.pathname,
    headingSelector: 'main h1, h1',
    bottomOffset: () => 24,
    rightOffset: (w) => (w >= 640 ? 24 : 16),
    size: 56,
    hoverDelay: 480,
    hello: null,
    ...options,
  };
  const T = { ...DEFAULT_TEXT, ...(options.text || {}) };
  const SIZE = opts.size;

  /* ---------- DOM ---------- */
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'cb-buddy';
  root.setAttribute('aria-label', opts.label);
  root.title = opts.label;
  root.innerHTML =
    '<span class="cb-float"><span class="cb-tilt"><span class="cb-body">' +
    '<span class="cb-antenna"></span>' +
    '<span class="cb-eyes"><span class="cb-eye"><span class="cb-pupil"></span></span>' +
    '<span class="cb-eye"><span class="cb-pupil"></span></span></span>' +
    '<span class="cb-cheek cb-l"></span><span class="cb-cheek cb-r"></span>' +
    '<span class="cb-mouth"></span></span></span></span>';
  const bubble = document.createElement('div');
  bubble.className = 'cb-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  const titleEl = document.createElement('strong');
  const textEl = document.createElement('span');
  bubble.append(titleEl, textEl);
  opts.mount.append(root, bubble);

  const tilt = root.querySelector('.cb-tilt');
  const pupils = Array.from(root.querySelectorAll('.cb-pupil'));
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- state ---------- */
  let pos = { x: 0, y: 0 };
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isOpen = false;
  let thinking = false;
  let busy = false; // showing an arrival message — hover ignored meanwhile
  let away = false; // perched somewhere other than home
  let hoverEl = null;
  let travelToken = 0;
  let raf = 0;
  let disposed = false;
  const mountedAt = performance.now();
  const timers = {};
  const later = (key, fn, ms) => {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(fn, ms);
  };
  const cancel = (key) => clearTimeout(timers[key]);

  const home = () => ({
    x: window.innerWidth - SIZE - opts.rightOffset(window.innerWidth),
    y: window.innerHeight - SIZE - opts.bottomOffset(window.innerWidth),
  });

  function findRoute(path) {
    let best = null;
    for (const r of opts.routes) {
      if ((path === r.path || path.startsWith(`${r.path}/`)) && (!best || r.path.length > best.path.length)) best = r;
    }
    return best;
  }

  /* ---------- movement ---------- */
  function moveTo(p, fast = false) {
    const next = { x: clamp(p.x, 8, window.innerWidth - SIZE - 8), y: clamp(p.y, 8, window.innerHeight - SIZE - 8) };
    const dx = next.x - pos.x;
    const dist = Math.hypot(dx, next.y - pos.y);
    pos = next;
    root.classList.toggle('cb-fast', fast);
    root.style.transform = `translate(${next.x}px, ${next.y}px)`;
    if (reduceMq.matches || dist < 12) return;

    // Lean into the direction of travel, leave a sparkle trail, squash on landing.
    tilt.style.setProperty('--cb-tilt', `${clamp(dx / 25, -14, 14)}deg`);
    root.classList.add('cb-moving');
    const token = ++travelToken;
    const until = performance.now() + (fast ? 450 : 700) * 0.8;
    let last = 0;
    const tick = (t) => {
      if (disposed || token !== travelToken) return;
      if (dist > 120 && t - last > 45) {
        spawnTrail();
        last = t;
      }
      if (t < until) return requestAnimationFrame(tick);
      tilt.style.setProperty('--cb-tilt', '0deg');
      root.classList.remove('cb-moving');
      pulse('cb-land', 350);
    };
    requestAnimationFrame(tick);
  }

  function spawnTrail() {
    const r = root.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'cb-trail';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = Math.random() > 0.5 ? '✦' : '•';
    s.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 20}px`;
    s.style.top = `${r.top + r.height * 0.7}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }

  function pulse(cls, ms) {
    if (reduceMq.matches && cls !== 'cb-blink') return;
    root.classList.remove(cls);
    void root.offsetWidth; // restart the CSS animation
    root.classList.add(cls);
    later(cls, () => root.classList.remove(cls), ms);
  }

  function mood(m, ms) {
    root.classList.remove('cb-happy', 'cb-thinking');
    cancel('mood');
    if (!m) return;
    root.classList.add(m);
    if (ms) later('mood', () => root.classList.remove(m), ms);
  }

  /* ---------- speech bubble ---------- */
  function say(heading, body, at = pos, place = 'side', delay = 0) {
    cancel('bubble');
    bubble.classList.remove('cb-show');
    later(
      'bubble',
      () => {
        titleEl.textContent = heading || '';
        textEl.textContent = body || '';
        bubble.classList.remove('cb-right', 'cb-left', 'cb-above');
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;
        let left;
        let top;
        let side;
        if (place === 'above') {
          side = 'cb-above';
          left = at.x + SIZE - bw;
          top = at.y - bh - 18;
        } else {
          side = at.x + SIZE + 12 + bw < window.innerWidth - 12 ? 'cb-right' : 'cb-left';
          left = side === 'cb-right' ? at.x + SIZE + 12 : at.x - bw - 12;
          top = at.y + SIZE / 2 - bh / 2;
        }
        bubble.style.left = `${clamp(left, 12, window.innerWidth - bw - 12)}px`;
        bubble.style.top = `${clamp(top, 12, window.innerHeight - bh - 12)}px`;
        bubble.classList.add(side);
        requestAnimationFrame(() => bubble.classList.add('cb-show'));
      },
      delay,
    );
  }
  function hush() {
    cancel('bubble');
    bubble.classList.remove('cb-show');
  }

  /* ---------- eyes ---------- */
  function eyeLoop() {
    if (disposed) return;
    if (!root.classList.contains('cb-thinking')) {
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
      pulse('cb-blink', 140);
      blinkLoop();
    }, 2500 + Math.random() * 3500);
  }

  /* ---------- behaviours ---------- */
  function spotFor(el) {
    const r = el.getBoundingClientRect();
    const kind = el.dataset.buddyKind;
    if (kind === 'icon') return { x: r.left + r.width / 2 - SIZE / 2 + 18, y: r.top - SIZE + 6 };
    if (kind === 'row') return { x: r.right + 10, y: r.top + r.height / 2 - SIZE / 2 };
    if (kind === 'below') return { x: r.left + r.width / 2 - SIZE / 2, y: r.bottom + 10 };
    return { x: r.right - SIZE + 8, y: r.top - SIZE + 14 };
  }

  function visit(el) {
    const [heading, body = ''] = (el.dataset.buddyTip || '').split('|');
    moveTo(spotFor(el), away);
    away = true;
    say(heading, body, pos, 'side', reduceMq.matches ? 0 : 380);
  }

  function goHome(fast = false) {
    hush();
    away = false;
    moveTo(home(), fast);
  }

  const onMouseMove = (e) => {
    mouse = { x: e.clientX, y: e.clientY };
  };
  const onMouseOver = (e) => {
    if (!hoverMq.matches) return;
    const el = e.target && e.target.closest ? e.target.closest('[data-buddy-tip]') : null;
    if (el === hoverEl) return;
    hoverEl = el;
    cancel('hover');
    if (busy || isOpen) return;
    if (el) later('hover', () => visit(el), away ? 140 : opts.hoverDelay);
    else if (away) later('hover', () => goHome(), 650);
  };
  // Perched spots are viewport-fixed, so any scroll strands the buddy — send it home.
  const onScroll = () => {
    if (!away || isOpen) return;
    cancel('hover');
    cancel('navDone');
    busy = false;
    goHome(true);
  };
  const onResize = () => {
    if (!away) moveTo(home(), true);
  };

  function arrived(path) {
    if (performance.now() - mountedAt < 1500) return; // ignore redirects right after start
    cancel('hover');
    cancel('nav');
    cancel('navDone');
    if (isOpen) {
      cheer();
      return;
    }
    busy = true;
    hush();
    const started = performance.now();
    const isHome = opts.homePath !== undefined && path === opts.homePath;
    const route = findRoute(path);

    const tryLand = () => {
      if (disposed) return;
      const h1 = document.querySelector(opts.headingSelector);
      if (!h1 && performance.now() - started < 2000) return later('nav', tryLand, 150);
      let target = home();
      let place = 'above';
      if (h1) {
        const range = document.createRange();
        range.selectNodeContents(h1);
        const r = range.getBoundingClientRect();
        if (r.width > 0 && r.top > 40 && r.bottom < window.innerHeight - SIZE) {
          target = { x: r.right + 12, y: r.top + r.height / 2 - SIZE / 2 };
          place = 'side';
        }
      }
      const h1Text = (h1 && h1.textContent ? h1.textContent : '').trim();
      const label = (route && route.label) || (h1Text && h1Text.length <= 40 ? h1Text : null);
      const heading = isHome ? T.backHome : label ? T.arrived(label) : T.arrivedUnknown;
      const body = isHome ? T.backHomeBody : (route && route.hint) || T.arrivedBody;

      moveTo(target);
      away = place === 'side';
      const arrive = reduceMq.matches || place === 'above' ? 0 : 650;
      later('cheer', cheer, arrive);
      say(heading, body, pos, place, arrive + 150);
      later('navDone', () => {
        busy = false;
        goHome();
      }, arrive + 3200);
    };
    later('nav', tryLand, 250);
  }

  function guide(path = opts.getPath()) {
    if (bubble.classList.contains('cb-show') && !away) return hush();
    cancel('hover');
    cancel('nav');
    cancel('navDone');
    busy = false;
    goHome(true);
    pulse('cb-poke', 400);
    mood('cb-happy', 1200);
    const route = findRoute(path);
    say(T.guideTitle(route && route.label), (route && route.hint) || T.guideBody, home(), 'above');
    later('guideOff', () => {
      if (!away) hush();
    }, 6000);
  }

  function cheer() {
    mood('cb-happy', 1400);
    pulse('cb-hop', 700);
  }

  function setOpen(open) {
    isOpen = open;
    cancel('hover');
    root.setAttribute('aria-expanded', String(open));
    if (open) {
      cancel('nav');
      cancel('navDone');
      busy = false;
      goHome(true);
      pulse('cb-poke', 400);
      mood('cb-happy', 1200);
    } else if (!thinking) {
      mood(null);
    }
  }

  function setThinking(next) {
    if (next === thinking) return;
    thinking = next;
    if (next) mood('cb-thinking');
    else cheer();
  }

  const onClick = (e) => (opts.onClick ? opts.onClick(e) : guide());
  root.addEventListener('click', onClick);

  /* ---------- start ---------- */
  root.classList.add('cb-instant');
  pos = { x: home().x, y: window.innerHeight + 20 };
  root.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.classList.remove('cb-instant');
      moveTo(home());
      later('hello', () => {
        cheer();
        if (!opts.hello) return;
        let greeted = false;
        try {
          greeted = sessionStorage.getItem('companionBuddy.greeted') === '1';
          sessionStorage.setItem('companionBuddy.greeted', '1');
        } catch {
          /* storage unavailable — greet anyway */
        }
        if (greeted) return;
        say(opts.hello.title, opts.hello.text, pos, 'above');
        later('helloOff', () => {
          if (!busy && !away) hush();
        }, 4200);
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
    /** The button element (e.g. to focus it). */
    element: root,
    /** Call on every route change in an SPA. */
    arrived,
    /** Explain the current page in a bubble (the default click action). */
    guide,
    /** Say anything: `say('Saved!', 'Your changes are live.')`. */
    say: (heading, body) => say(heading, body, home(), 'above'),
    hush,
    cheer,
    goHome,
    /** Tell the buddy your chat panel is open/closed (it stays home while open). */
    setOpen,
    /** Thinking face while your AI is working; cheers when set back to false. */
    setThinking,
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      Object.values(timers).forEach((t) => clearTimeout(t));
      root.removeEventListener('click', onClick);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
      root.remove();
      bubble.remove();
    },
  };
}
