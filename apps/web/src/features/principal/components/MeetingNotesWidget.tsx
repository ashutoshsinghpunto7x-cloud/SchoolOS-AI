import { useState } from 'react';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import {
  loadMeetingNotes,
  saveMeetingNotes,
  noteDateTime,
  type MeetingNote,
} from '../utils/meetingNotes.storage';

// Local date, not UTC — toISOString() shifts to UTC and can land on the wrong
// day for timezones ahead of UTC (e.g. IST), silently defaulting the picker
// to "yesterday" and making a same-day note look already in the past.
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function countdownParts(ms: number) {
  const clamped = Math.max(0, ms);
  const days = Math.floor(clamped / 86_400_000);
  const hrs = Math.floor((clamped % 86_400_000) / 3_600_000);
  const mins = Math.floor((clamped % 3_600_000) / 60_000);
  const secs = Math.floor((clamped % 60_000) / 1000);
  return { days, hrs, mins, secs };
}

// The principal's own scratch list for meetings / personal tasks / reminders —
// not tied to the school Calendar. The nearest upcoming entry gets a live
// countdown so nothing on a busy day gets forgotten.
export function MeetingNotesWidget({ now }: { now: Date }) {
  const [notes, setNotes] = useState<MeetingNote[]>(() => loadMeetingNotes());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');

  const upcoming = notes
    .filter((n) => noteDateTime(n).getTime() >= now.getTime() - 60_000)
    .sort((a, b) => noteDateTime(a).getTime() - noteDateTime(b).getTime());

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  function addNote() {
    if (!title.trim() || !date || !time) return;
    const next = [...notes, { id: crypto.randomUUID(), title: title.trim(), date, time }];
    setNotes(next);
    saveMeetingNotes(next);
    setTitle('');
    setTime('');
    setAdding(false);
  }

  function removeNote(id: string) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    saveMeetingNotes(next);
  }

  return (
    <div className="bg-white/10 rounded-xl p-3 flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-bold text-white/70 uppercase tracking-wide">Meetings & Reminders</p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white transition-colors"
          title="Note a meeting, task, or reminder with a date and time"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-lg p-2.5 flex flex-col gap-1.5 border border-gray-100">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Parent meeting, Submit report…"
            className="h-8 px-2 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-[#A855F7]"
          />
          <div className="flex gap-1.5">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 h-8 px-2 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-[#A855F7]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-24 h-8 px-2 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-[#A855F7]"
            />
          </div>
          <button
            type="button"
            onClick={addNote}
            className="h-8 rounded-md bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white text-xs font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      )}

      {!next ? (
        <p className="text-sm text-white/60 px-1 py-2">Nothing scheduled — tap + to add one.</p>
      ) : (
        <>
          {/* Nearest upcoming — with live countdown */}
          <div className="bg-white/10 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <CalendarClock className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{next.title}</p>
              <p className="text-[11px] text-white/60 mb-1">
                {noteDateTime(next).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {next.time}
              </p>
              {(() => {
                const { days, hrs, mins, secs } = countdownParts(noteDateTime(next).getTime() - now.getTime());
                return (
                  <div className="flex items-center gap-2.5 tabular-nums">
                    {[['D', days], ['H', hrs], ['M', mins], ['S', secs]].map(([label, v]) => (
                      <div key={label as string}>
                        <p className="text-sm font-bold text-white leading-none">{String(v).padStart(2, '0')}</p>
                        <p className="text-[9px] text-white/50 font-semibold">{label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => removeNote(next.id)}
              className="text-white/40 hover:text-red-300 shrink-0"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rest of the list */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto overscroll-contain">
              {rest.map((n) => (
                <div key={n.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                    <p className="text-[10px] text-white/50">
                      {noteDateTime(n).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {n.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNote(n.id)}
                    className="text-white/40 hover:text-red-300 shrink-0"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
