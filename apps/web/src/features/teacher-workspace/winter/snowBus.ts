/** Tiny event bus so any winter component can trigger canvas sparkles without
 *  prop-drilling a ref to <SnowCanvas />. */

export function sparkle(x: number, y: number, ch = '❄', n = 12) {
  window.dispatchEvent(new CustomEvent('tw-burst', { detail: { x, y, ch, n } }));
}

export function sparkleAtElement(el: Element | null, ch = '❄', n = 12) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  sparkle(r.left + r.width / 2, r.top + r.height / 2, ch, n);
}

export function snowstorm() {
  window.dispatchEvent(new CustomEvent('tw-storm'));
}

/** Short haptic tick on phones that support it; silent no-op elsewhere. */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
