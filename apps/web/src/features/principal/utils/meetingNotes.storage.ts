// Principal's own meeting/task notes for the Daily Command Centre — deliberately
// separate from the school Calendar/Events system: this is a personal scratch
// list (title + date + time) purely so a countdown can remind the principal
// what's next, not a school-wide event needing audience/type/attachments.
// Persisted client-side only (localStorage), same pattern as the existing
// Reminders feature.

export interface MeetingNote {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", 24h
}

const KEY = 'schoolos.principal.meetingNotes';

export function loadMeetingNotes(): MeetingNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MeetingNote[]) : [];
  } catch {
    return [];
  }
}

export function saveMeetingNotes(notes: MeetingNote[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function noteDateTime(note: MeetingNote): Date {
  return new Date(`${note.date}T${note.time}`);
}
