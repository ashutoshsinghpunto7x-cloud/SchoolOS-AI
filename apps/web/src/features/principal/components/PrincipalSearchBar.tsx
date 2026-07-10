import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GraduationCap, Users, LayoutGrid } from 'lucide-react';
import { useStudentList } from '@/features/students/hooks/useStudents';
import { useTeacherList } from '@/features/teachers/hooks/useTeachers';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';

// Debounces the raw keystrokes so the two autocomplete endpoints (students,
// teachers) aren't hit on every character — classes are a small, already-
// cached list, so those are just filtered client-side.
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function PrincipalSearchBar() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(query, 250);
  const active = debounced.trim().length >= 2;

  const { data: students } = useStudentList(active ? debounced : undefined);
  const { data: teachers } = useTeacherList(active ? debounced : undefined);
  const { data: classes } = useSchoolClasses();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matchedClasses = active
    ? (classes ?? [])
        .flatMap((c) => c.sections.map((s) => ({ id: `${c._id}-${s}`, name: c.name, section: s })))
        .filter((c) => `${c.name} ${c.section}`.toLowerCase().includes(debounced.toLowerCase()))
        .slice(0, 5)
    : [];

  const studentResults = (students ?? []).slice(0, 5);
  const teacherResults = (teachers ?? []).slice(0, 5);
  const hasResults = studentResults.length > 0 || teacherResults.length > 0 || matchedClasses.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search students, teachers, classes…"
        className="w-full h-10 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] focus:bg-white transition-colors"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 pointer-events-none">
        ⌘K
      </span>

      {open && active && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[320px] bg-white rounded-2xl border border-gray-100 shadow-[0_16px_48px_rgba(0,0,0,0.14)] p-2 max-h-96 overflow-y-auto">
          {!hasResults ? (
            <p className="text-sm text-gray-400 text-center py-6">No matches for "{debounced}"</p>
          ) : (
            <>
              {studentResults.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Students</p>
                  {studentResults.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => { navigate(`/students/${s._id}`); setOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#A855F7]/5 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-3.5 h-3.5 text-[#5B21B6]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                        <p className="text-[11px] text-gray-400">Class {s.class} – {s.section}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {teacherResults.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Teachers</p>
                  {teacherResults.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => { navigate(`/teachers/${t._id}`); setOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#A855F7]/5 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#5B21B6]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.fullName}</p>
                        <p className="text-[11px] text-gray-400">{t.department || 'Teacher'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {matchedClasses.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Classes</p>
                  {matchedClasses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { navigate('/students'); setOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#A855F7]/5 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                        <LayoutGrid className="w-3.5 h-3.5 text-[#5B21B6]" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">Class {c.name} – {c.section}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
