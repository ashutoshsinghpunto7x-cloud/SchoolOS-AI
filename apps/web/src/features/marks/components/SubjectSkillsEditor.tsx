import { useState } from 'react';
import { ChevronDown, ChevronRight, ListTree, Link2 } from 'lucide-react';
import { SubjectChipEditor } from './SubjectChipEditor';

// Optional per-subject config beyond the plain subject name: a skill
// breakdown (e.g. English -> Literature, Language, Reading, Writing,
// Dictation/Spelling) and/or a timetable alias, for when the subject's
// grading name (e.g. "Mathematics", matching a report-card template row)
// differs from the coarser name its period is actually scheduled under on
// the timetable (e.g. "Maths"). Purely data-driven and generic — works for
// any subject in `subjects`, on any exam, for any class. A subject with
// neither set behaves exactly as before (one mark, matched to the timetable
// by its exact name).

export interface SubjectExtras {
  skills?: string[];
  timetableSubjectName?: string;
}

interface SubjectSkillsEditorProps {
  subjects: string[];
  value: Record<string, SubjectExtras>;
  onChange: (value: Record<string, SubjectExtras>) => void;
}

export const SubjectSkillsEditor = ({ subjects, value, onChange }: SubjectSkillsEditorProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(subjects.filter((s) => (value[s]?.skills?.length ?? 0) > 0 || value[s]?.timetableSubjectName)),
  );

  const toggle = (subject: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject); else next.add(subject);
      return next;
    });
  };

  const patch = (subject: string, extras: Partial<SubjectExtras>) => {
    const next = { ...value };
    const merged: SubjectExtras = { ...next[subject], ...extras };
    if (merged.skills?.length || merged.timetableSubjectName?.trim()) {
      next[subject] = merged;
    } else {
      delete next[subject];
    }
    onChange(next);
  };

  if (subjects.length === 0) {
    return <p className="text-sm text-gray-400">Add subjects above first.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {subjects.map((subject) => {
        const extras = value[subject] ?? {};
        const skills = extras.skills ?? [];
        const isOpen = expanded.has(subject) || skills.length > 0 || !!extras.timetableSubjectName;
        return (
          <div key={subject} className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(subject)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="text-sm font-semibold text-gray-800 flex-1">{subject}</span>
              {skills.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                  <ListTree className="w-3 h-3" /> {skills.length} skills
                </span>
              )}
              {extras.timetableSubjectName && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  <Link2 className="w-3 h-3" /> {extras.timetableSubjectName}
                </span>
              )}
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    Leave empty for a single combined mark. Add 2+ skills to collect one score per skill instead
                    (e.g. Literature, Language, Reading, Writing, Dictation/Spelling) — each is stored and shown on
                    report cards as “{subject} - Skill”.
                  </p>
                  <SubjectChipEditor
                    values={skills}
                    onChange={(v) => patch(subject, { skills: v.length ? v : undefined })}
                    maxItems={10}
                    placeholder="Add skill…"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Timetable period name (if different)</label>
                  <input
                    value={extras.timetableSubjectName ?? ''}
                    onChange={(e) => patch(subject, { timetableSubjectName: e.target.value || undefined })}
                    placeholder={`Leave empty if the timetable also says "${subject}"`}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    e.g. this subject is called “{subject}” for grading, but scheduled on the timetable as “Maths” —
                    needed so the teacher who teaches that period is recognized as allowed to enter these marks.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
