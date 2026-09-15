import { useState } from 'react';
import { ChevronDown, ChevronRight, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubjectChipEditor } from './SubjectChipEditor';

// Optional per-subject skill breakdown (e.g. English -> Literature, Language,
// Reading, Writing, Dictation/Spelling). Purely data-driven and generic —
// works for any subject in `subjects`, on any exam, for any class. A subject
// with no skills configured here behaves exactly as before (one mark).
//
// A subject needs at least 2 skills to count as "split" — 0 or 1 just means
// "not configured", same as leaving it alone.

interface SubjectSkillsEditorProps {
  subjects: string[];
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
}

export const SubjectSkillsEditor = ({ subjects, value, onChange }: SubjectSkillsEditorProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(subjects.filter((s) => (value[s]?.length ?? 0) > 0)),
  );

  const toggle = (subject: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject); else next.add(subject);
      return next;
    });
  };

  const setSkills = (subject: string, skills: string[]) => {
    const next = { ...value };
    if (skills.length > 0) next[subject] = skills; else delete next[subject];
    onChange(next);
  };

  if (subjects.length === 0) {
    return <p className="text-sm text-gray-400">Add subjects above first.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {subjects.map((subject) => {
        const skills = value[subject] ?? [];
        const isOpen = expanded.has(subject) || skills.length > 0;
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
            </button>
            {isOpen && (
              <div className={cn('px-3.5 pb-3.5 pt-1 border-t border-gray-100')}>
                <p className="text-xs text-gray-400 mb-2">
                  Leave empty for a single combined mark. Add 2+ skills to collect one score per skill instead
                  (e.g. Literature, Language, Reading, Writing, Dictation/Spelling) — each is stored and shown on
                  report cards as “{subject} - Skill”.
                </p>
                <SubjectChipEditor
                  values={skills}
                  onChange={(v) => setSkills(subject, v)}
                  maxItems={10}
                  placeholder="Add skill…"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
