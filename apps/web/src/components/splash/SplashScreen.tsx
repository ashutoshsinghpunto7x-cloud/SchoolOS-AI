import { useEffect, useState } from 'react';
import splashBackground from '../../assets/illustrations/Splash-Screen-bg.png';

interface SplashScreenProps {
  onFinish: () => void;
}

const VISIBLE_MS = 2000;
const FADE_MS = 400;

/**
 * Splash-Screen-bg.png is a cropped copy of the designer-provided
 * Splash-Screen.png — the logo, "FNIC" wordmark, tagline, and building are
 * all baked into that image already, so this component just shows it
 * full-bleed instead of redrawing the same content a second time in HTML.
 * The crop removes the bottom strip that in the original held a *static*
 * loading line + "Initializing System..." label — those were placeholder
 * pixels, not a real indicator, so that strip is rebuilt below as an
 * actual animated glow traveling along the line instead of being left as
 * inert decoration.
 */
export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    const exitTimer = setTimeout(() => setIsExiting(true), VISIBLE_MS);
    const finishTimer = setTimeout(onFinish, VISIBLE_MS + FADE_MS);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#03050A] transition-opacity duration-500 ease-out ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* object-contain, no zoom transform: object-cover was cropping/scaling
          the photo differently depending on screen shape, which is what let
          the baked-in tagline drift down into the loading bar's fixed
          position on some screens. Showing the photo at its own proportions,
          uncropped, keeps its content in the same place every time so nothing
          below can ever collide with it. */}
      <img
        src={splashBackground}
        alt="FNIC — Empowering Education, Building Futures"
        className="absolute inset-0 h-full w-full object-contain transition-opacity ease-out"
        style={{ transitionDuration: `${VISIBLE_MS + FADE_MS}ms` }}
      />

      {/* Loading indicator — a glow traveling along a line, replacing the
          source design's static placeholder with a real animation. Anchored
          near the very bottom of the viewport (not the photo's internal
          layout, which shifts as object-cover crops differently per screen
          size) so it never collides with the tagline baked into the photo
          above it. */}
      <div
        className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 transition-opacity ease-out sm:bottom-10"
        style={{ transitionDuration: '900ms', opacity: entered ? 1 : 0 }}
      >
        <div className="relative h-px w-64 overflow-visible bg-white/15 sm:w-80">
          <div
            className="absolute top-1/2 h-1.5 w-16 -translate-x-1/2 -translate-y-1/2 animate-travel rounded-full bg-[#F97316] blur-[3px]"
            style={{ boxShadow: '0 0 16px 4px rgba(249,115,22,0.7)' }}
          />
        </div>
        <p className="text-xs font-medium tracking-[0.2em] text-white/60">Initializing System...</p>
      </div>
    </div>
  );
};
