import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, LayoutGrid } from 'lucide-react';
import { useStudentList } from '@/features/students/hooks/useStudents';
import { useTeacherList } from '@/features/teachers/hooks/useTeachers';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { FNIC_SECTIONS } from '@/components/topbar/AppLauncherModal';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(query, 200);
  const active = debounced.trim().length >= 1;

  const { data: students } = useStudentList(debounced.trim().length >= 2 ? debounced : undefined);
  const { data: teachers } = useTeacherList(debounced.trim().length >= 2 ? debounced : undefined);
  const { data: classes } = useSchoolClasses();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const qLower = debounced.trim().toLowerCase();

  const matchedPages = active
    ? FNIC_SECTIONS.flatMap((group) =>
        group.items
          .filter(
            (it) =>
              it.label.toLowerCase().includes(qLower) ||
              it.id.toLowerCase().includes(qLower) ||
              group.title.toLowerCase().includes(qLower)
          )
          .map((it) => ({ ...it, groupTitle: group.title }))
      ).slice(0, 6)
    : [];

  const matchedClasses =
    debounced.trim().length >= 2
      ? (classes ?? [])
          .flatMap((c) => c.sections.map((s) => ({ id: `${c._id}-${s}`, name: c.name, section: s })))
          .filter((c) => `${c.name} ${c.section}`.toLowerCase().includes(qLower))
          .slice(0, 4)
      : [];

  const studentResults = (students ?? []).slice(0, 4);
  const teacherResults = (teachers ?? []).slice(0, 4);
  const hasResults =
    matchedPages.length > 0 ||
    studentResults.length > 0 ||
    teacherResults.length > 0 ||
    matchedClasses.length > 0;

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matchedPages.length > 0) {
      navigate(`/principal?page=${matchedPages[0].id}`);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-[640px] mx-auto px-2">
      <div className="h-[48px] rounded-full bg-[#F3EEE3] flex items-center px-5 gap-3 border border-transparent focus-within:border-[#E8E2D6]/80 focus-within:bg-white transition-all shadow-inner">
        <svg
          className="w-[18px] h-[18px] text-[#55607A] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          id="global-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDownInput}
          placeholder="Search students, teachers, classes, exams..."
          className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1B2A4E] placeholder:text-[#55607A]/80 font-normal"
        />
        <kbd className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/70 text-[10px] font-bold text-[#55607A] border border-[#E8E2D6]">
          ⌘K
        </kbd>
      </div>

      {open && active && (
        <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-50 bg-white rounded-2xl border border-[#E8E2D6] shadow-[0_16px_48px_rgba(27,42,78,0.14)] p-2.5 max-h-96 overflow-y-auto">
          {!hasResults ? (
            <p className="text-sm text-[#55607A] text-center py-5">No matches for "{debounced}"</p>
          ) : (
            <>
              {matchedPages.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-[#55607A] uppercase tracking-wider">
                    Modules &amp; Screens
                  </p>
                  {matchedPages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        navigate(`/principal?page=${p.id}`);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F3EEE3] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1B2A4E] truncate">{p.label}</p>
                        <p className="text-[11px] text-[#55607A]">{p.groupTitle}</p>
                      </div>
                      {p.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#D9822B] text-white shrink-0">
                          {p.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {studentResults.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-[#55607A] uppercase tracking-wider">
                    Students
                  </p>
                  {studentResults.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        navigate(`/students/${s._id}`);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#EEF1F8] text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#EEF1F8] flex items-center justify-center shrink-0 text-[#254A9A]">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1B2A4E] truncate">{s.fullName}</p>
                        <p className="text-[11px] text-[#55607A]">
                          Class {s.class} – {s.section}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {teacherResults.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-[#55607A] uppercase tracking-wider">
                    Teachers
                  </p>
                  {teacherResults.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => {
                        navigate(`/teachers/${t._id}`);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#EEF1F8] text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#EEF1F8] flex items-center justify-center shrink-0 text-[#254A9A]">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1B2A4E] truncate">{t.fullName}</p>
                        <p className="text-[11px] text-[#55607A]">{t.department || 'Faculty'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {matchedClasses.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-bold text-[#55607A] uppercase tracking-wider">
                    Classes
                  </p>
                  {matchedClasses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        navigate('/principal?page=attendance_class');
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#EEF1F8] text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#EEF1F8] flex items-center justify-center shrink-0 text-[#254A9A]">
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-[#1B2A4E]">
                        Class {c.name} – {c.section}
                      </p>
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
