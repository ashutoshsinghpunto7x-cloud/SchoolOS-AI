import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SubjectSnapshot } from '../types';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, steady: Minus } as const;

export function SubjectProgress({ subject, note, percent, trend }: SubjectSnapshot) {
  const TrendIcon = TREND_ICON[trend];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-base text-[#0D0D0D]">{subject}</p>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{note}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendIcon
            className={`w-3.5 h-3.5 ${trend === 'down' ? 'text-red-600' : trend === 'up' ? 'text-emerald-600' : 'text-[#6B6B6B]'}`}
            strokeWidth={2}
          />
          <span className="text-base tabular-nums text-[#0D0D0D]">{percent}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[#F5F1EB] mt-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0D0D0D] transition-all duration-500"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${subject} progress`}
        />
      </div>
    </div>
  );
}
