import type { CSSProperties } from 'react';

/**
 * Shared between Topbar.tsx (the accountant-dashboard-only purple strip) and
 * AccountantDashboard.tsx's hero card. Both sit directly adjacent in the
 * viewport (Topbar sticky at the top, the hero right below it), but each is a
 * separate DOM box — a plain `background: linear-gradient(...)` restarts its
 * own 0%-100% span per element, so the two independently-drawn gradients
 * visibly seam where they meet instead of reading as one continuous surface.
 *
 * `backgroundAttachment: 'fixed'` anchors the gradient to the viewport rather
 * than to each element's own box, so both elements act as windows onto the
 * *same* gradient plane — the color at the bottom of Topbar continues exactly
 * into the top of the hero, with no seam. `backgroundSize` is set taller than
 * either element individually so the transition stays gradual all the way
 * down, rather than hitting the saturated pink end-stop right at the boundary.
 */
export const ACCOUNTANT_HERO_GRADIENT_STYLE: CSSProperties = {
  background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)',
  backgroundAttachment: 'fixed',
  backgroundSize: '100% 320px',
  backgroundPosition: 'top',
};
