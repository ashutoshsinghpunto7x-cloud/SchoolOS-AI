import { useEffect, useState } from 'react';
import fnicLogo from '../../assets/illustrations/fnic-logo.jpg';

interface SplashScreenProps {
  onFinish: () => void;
}

const FADE_MS = 200;

/**
 * Previously rendered a designer-provided 1.2MB baked photo
 * (Splash-Screen-bg.png) full-bleed. That image was the single biggest
 * contributor to first-paint latency, so the same visual — logo, "FNIC"
 * wordmark, tagline — is rebuilt here as plain HTML/CSS using only the
 * 28KB logo photo, which loads instantly.
 *
 * No artificial hold: it used to force a fixed 2s+ display regardless of
 * how fast the app was actually ready, purely for branding. It now fades
 * out as soon as it has painted one frame — just long enough to avoid a
 * blank flash, nothing more.
 */
export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntered(true);
        setIsExiting(true);
      });
    });
    const finishTimer = setTimeout(onFinish, FADE_MS);
    return () => {
      cancelAnimationFrame(raf1);
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
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center transition-opacity ease-out"
        style={{ transitionDuration: '300ms', opacity: entered ? 1 : 0.6 }}
      >
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white ring-2 ring-orange-500/70 shadow-[0_0_60px_rgba(249,115,22,0.35)] sm:h-36 sm:w-36">
          <img src={fnicLogo} alt="FNIC Logo" className="h-20 w-20 object-contain sm:h-28 sm:w-28" />
        </div>

        <div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            <span className="text-white">FNI</span>
            <span className="text-[#F97316]">C</span>
          </h1>
          <p className="mt-2 text-xs font-medium tracking-[0.35em] text-white/60 sm:text-sm">
            SCHOOL MANAGEMENT SYSTEM
          </p>
        </div>

        <div className="h-px w-16 bg-[#F97316]" />

        <p className="text-sm text-white/80 sm:text-base">
          Empowering Education.
          <br />
          <span className="text-[#F97316]">Building Futures.</span>
        </p>
      </div>

      {/* Loading indicator — a glow traveling along a line. */}
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
        <p className="text-xs font-medium tracking-[0.2em] text-white/60">Loading...</p>
      </div>
    </div>
  );
};
