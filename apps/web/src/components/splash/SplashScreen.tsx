import { useEffect, useState } from 'react';
import { Users, GraduationCap, Briefcase, BarChart3 } from 'lucide-react';
import { SchoolOSMark } from './SchoolOSMark';

const NAV_ITEMS = [
  { label: 'Students', Icon: Users },
  { label: 'Teachers', Icon: GraduationCap },
  { label: 'Admin', Icon: Briefcase },
  { label: 'Insights', Icon: BarChart3 },
];

interface SplashScreenProps {
  onFinish: () => void;
}

const VISIBLE_MS = 2000;
const FADE_MS = 400;

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), VISIBLE_MS);
    const finishTimer = setTimeout(onFinish, VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#070C18] transition-opacity duration-500 ease-out ${
        isExiting ? 'opacity-0' : 'animate-fade-in opacity-100'
      }`}
      style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Background: dark cityscape suggestion + slow zoom */}
      <div className="absolute inset-0 animate-splash-zoom">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(180deg, rgba(7,12,24,0.65) 0%, rgba(7,12,24,0.85) 55%, rgba(7,12,24,0.98) 100%),
              repeating-linear-gradient(90deg, rgba(148,163,184,0.05) 0px, rgba(148,163,184,0.05) 2px, transparent 2px, transparent 72px),
              repeating-linear-gradient(0deg, rgba(148,163,184,0.04) 0px, rgba(148,163,184,0.04) 2px, transparent 2px, transparent 54px)
            `,
          }}
        />
        {/* vignette */}
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_30%,rgba(7,12,24,0.92)_100%)]" />
        {/* fog near bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#070C18] via-[#070C18]/60 to-transparent" />
      </div>

      {/* Radial spotlight + pulsing glow behind logo */}
      <div className="pointer-events-none absolute left-1/2 top-[40%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/30 blur-[110px] animate-splash-glow" />

      {/* Top-left brand */}
      <div className="absolute left-6 top-6 flex items-center gap-3 sm:left-12 sm:top-10">
        <div className="h-11 w-px bg-blue-500/70" />
        <div className="space-y-1 text-[11px] font-medium uppercase leading-tight tracking-[0.3em] text-slate-300">
          <p>Learn.</p>
          <p>Grow.</p>
          <p>Succeed.</p>
        </div>
      </div>

      {/* Top-right dot grid */}
      <div className="absolute right-6 top-8 grid grid-cols-5 gap-2.5 sm:right-12 sm:top-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-blue-500/60" />
        ))}
      </div>

      {/* Right vertical menu */}
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-9 sm:right-12 md:flex">
        {NAV_ITEMS.map(({ label, Icon }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-slate-400">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[9px] font-medium uppercase tracking-[0.15em]">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom-left concentric circles */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-blue-400/[0.06]"
            style={{ inset: `${i * 40}px` }}
          />
        ))}
        <span className="absolute bottom-8 left-8 h-1.5 w-1.5 rounded-full bg-blue-400/70" />
      </div>

      {/* Center content */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="animate-splash-float">
          <SchoolOSMark />
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
          <span className="text-white">FN</span>
          <span className="bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">IC</span>
        </h1>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          Smart School Management System
        </p>

        <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

        <p className="mt-6 text-sm text-slate-300">
          One Platform. Every Connection.{' '}
          <span className="font-medium text-blue-400">Better Education.</span>
        </p>

        <div className="mt-12 h-9 w-9 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
        <p className="mt-4 text-sm text-slate-400">Loading, please wait&hellip;</p>
      </div>
    </div>
  );
};
