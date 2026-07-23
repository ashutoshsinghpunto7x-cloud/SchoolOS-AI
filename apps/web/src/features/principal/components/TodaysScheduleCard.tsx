import { useMemo, useState, useEffect } from 'react';
import { MeetingNotesWidget } from './MeetingNotesWidget';
import { heroGradient } from '@/theme/brand';
import type { PrincipalUpcomingEvent } from '@schoolos/types';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface TodaysScheduleCardProps {
  upcomingEvents?: PrincipalUpcomingEvent[];
}

export function TodaysScheduleCard({ upcomingEvents }: TodaysScheduleCardProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todaysEvents = useMemo(
    () => (upcomingEvents ?? []).filter((e) => e.startDate.slice(0, 10) === todayStr()),
    [upcomingEvents],
  );

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-3 h-full flex flex-col gap-2">
      {todaysEvents.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-20 overflow-y-auto shrink-0">
          {todaysEvents.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-black/[0.02]">
              <span className="text-xs font-semibold text-[#374151] truncate flex-1">{e.title}</span>
              {!e.isAllDay && e.startTime && <span className="text-[11px] text-[#6B7280] shrink-0">{e.startTime}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 rounded-xl overflow-y-auto overscroll-contain" style={{ background: heroGradient }}>
        <MeetingNotesWidget now={now} />
      </div>
    </div>
  );
}
