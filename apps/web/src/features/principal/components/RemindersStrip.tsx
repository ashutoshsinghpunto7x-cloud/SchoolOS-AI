import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MeetingNotesWidget } from './MeetingNotesWidget';
import { loadMeetingNotes, noteDateTime } from '../utils/meetingNotes.storage';
import { useLanguage } from '@/context/LanguageContext';

function countdownLabel(ms: number): string {
  const clamped = Math.max(0, ms);
  const hrs = Math.floor(clamped / 3_600_000);
  const mins = Math.floor((clamped % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// A full-width collapsible strip for the principal's own meeting/reminder
// notes (see MeetingNotesWidget) — collapsed by default showing just the
// count and the nearest one's countdown, expanding in place to the full
// add/remove list. Purely a presentation wrapper; MeetingNotesWidget still
// owns the actual notes data (localStorage-backed).
export function RemindersStrip() {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(() => loadMeetingNotes());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const upcoming = useMemo(
    () =>
      notes
        .filter((n) => noteDateTime(n).getTime() >= now.getTime() - 60_000)
        .sort((a, b) => noteDateTime(a).getTime() - noteDateTime(b).getTime()),
    [notes, now],
  );

  if (upcoming.length === 0 && !expanded) return null;

  const next = upcoming[0];

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-[#111827] shrink-0">
            {t('reminders.title')} ({upcoming.length})
          </span>
          {next && (
            <span className="text-sm font-medium text-[#F59E0B] truncate">
              {next.title} {t('reminders.startsIn')} {countdownLabel(noteDateTime(next).getTime() - now.getTime())}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#6B7280] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6B7280] shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <MeetingNotesWidget now={now} variant="onLight" onChange={() => setNotes(loadMeetingNotes())} />
        </div>
      )}
    </div>
  );
}
