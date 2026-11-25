import { useEffect, useId, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { CompanionConfig } from './companionConfigs';
import './companionBuddy.css';

export const SIRI_ORB_SIZE = 54;

/** Tracks the static bottom offset (in px) so both the orb and its popover stay aligned. */
export function useStaticOrbBottom(config: CompanionConfig): number {
  const [bottom, setBottom] = useState(() =>
    typeof window !== 'undefined' ? config.bottomOffset(window.innerWidth) : 24,
  );

  useEffect(() => {
    const update = () => setBottom(config.bottomOffset(window.innerWidth));
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [config]);

  return bottom;
}

function DualWaveSvg() {
  const uid = useId().replace(/[:]/g, '');
  const maskId = `siri-env-${uid}`;
  const grad1Id = `siri-g1-${uid}`;
  const grad2Id = `siri-g2-${uid}`;
  const glowId = `siri-glow-${uid}`;

  // Smooth repeating 52px-period sine wave (2 periods = 104px so translateX(-52px) loops seamlessly)
  const wave1 =
    'M 0 26 Q 13 15, 26 26 T 52 26 Q 65 15, 78 26 T 104 26';
  const wave2 =
    'M 0 26 Q 13 36, 26 26 T 52 26 Q 65 36, 78 26 T 104 26';

  return (
    <svg className="siri-lines-svg" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        {/* Soft horizontal edge-fade envelope so Siri waves taper smoothly at the circle edges */}
        <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="black" />
          <stop offset="18%" stopColor="white" />
          <stop offset="82%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="52" height="52" fill={`url(#${maskId}-grad)`} />
        </mask>

        {/* Primary Siri cyan-indigo ribbon */}
        <linearGradient id={grad1Id} x1="0" y1="26" x2="104" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="25%" stopColor="#E0F2FE" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="75%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>

        {/* Secondary Siri rose-amber ribbon */}
        <linearGradient id={grad2Id} x1="0" y1="26" x2="104" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="25%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F5B332" />
          <stop offset="75%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Two smooth Siri-style horizontal sine waves */}
      <g className="siri-wave-track" mask={`url(#${maskId})`} filter={`url(#${glowId})`}>
        <g className="siri-wave-slide-1">
          <path
            d={wave1}
            stroke={`url(#${grad1Id})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>
        <g className="siri-wave-slide-2">
          <path
            d={wave2}
            stroke={`url(#${grad2Id})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>
      </g>

      {/* Cross (×) shown when the AI chat box is open */}
      <g className="siri-cross-group">
        <line
          x1="18"
          y1="18"
          x2="34"
          y2="34"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <line
          x1="34"
          y1="18"
          x2="18"
          y2="34"
          stroke="#F5B332"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** Small non-interactive Siri orb badge used inside minimalist assistant headers. */
export const SiriMiniOrb = ({ className }: { className?: string }) => (
  <span className={cn('siri-mini-orb', className)} aria-hidden="true">
    <span className="siri-wave-a" />
    <DualWaveSvg />
    <span className="siri-gloss" />
  </span>
);

interface CompanionBuddyProps {
  config: CompanionConfig;
  /** Whether the assistant panel is currently open. */
  open?: boolean;
  /** Whether the assistant is actively generating a response. */
  thinking?: boolean;
  /** Click handler toggling the assistant panel. */
  onActivate?: () => void;
  label?: string;
}

export const CompanionBuddy = ({
  config,
  open = false,
  thinking = false,
  onActivate,
  label = 'SchoolOS Assistant',
}: CompanionBuddyProps) => {
  const bottom = useStaticOrbBottom(config);
  const style = { '--siri-bottom': `${bottom}px` } as CSSProperties;

  return (
    <button
      type="button"
      data-siri-orb="true"
      onClick={onActivate}
      aria-label={label}
      aria-expanded={onActivate ? open : undefined}
      style={style}
      className={cn('siri-orb-btn', open && 'is-open', thinking && 'is-thinking')}
    >
      <span className="siri-orb-halo" aria-hidden="true" />
      <span className="siri-orb" aria-hidden="true">
        <span className="siri-wave-a" />
        <DualWaveSvg />
        <span className="siri-gloss" />
      </span>
    </button>
  );
};
