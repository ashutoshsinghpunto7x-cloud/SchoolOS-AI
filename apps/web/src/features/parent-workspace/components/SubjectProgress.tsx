import type { CSSProperties } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SubjectSnapshot } from '../types';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, steady: Minus } as const;

function subjectPalette(percent: number) {
  if (percent >= 85) {
    return {
      fill: '#059669',
      track: '#D1FAE5',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (percent >= 70) {
    return {
      fill: '#2563EB',
      track: '#DBEAFE',
      pill: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }
  if (percent >= 50) {
    return {
      fill: '#D97706',
      track: '#FEF3C7',
      pill: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }
  return {
    fill: '#E11D48',
    track: '#FFE4E6',
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
  };
}

export function SubjectProgress({ subject, note, percent, trend }: SubjectSnapshot) {
  const TrendIcon = TREND_ICON[trend];
  const palette = subjectPalette(percent);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold text-[#1B2A4E] truncate m-0">{subject}</p>
          <p className="text-xs sm:text-sm text-[#55607A] mt-0.5 m-0">{note}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${palette.pill}`}
          >
            <TrendIcon className="w-3 h-3" strokeWidth={2.2} aria-hidden="true" />
            {percent}%
          </span>
        </div>
      </div>
      <progress
        value={percent}
        max={100}
        aria-label={`${subject}: ${percent}%`}
        className="pw-progress w-full h-2 mt-2.5 block"
        style={
          {
            '--pw-fill': palette.fill,
            '--pw-track': palette.track,
          } as CSSProperties
        }
      />
    </div>
  );
}
