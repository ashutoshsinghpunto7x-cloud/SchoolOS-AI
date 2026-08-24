import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import type { Student } from '@schoolos/types';

function sortByRoll(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const an = parseInt(a.rollNumber ?? '', 10);
    const bn = parseInt(b.rollNumber ?? '', 10);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    if (!isNaN(an)) return -1;
    if (!isNaN(bn)) return 1;
    return (a.rollNumber ?? '').localeCompare(b.rollNumber ?? '');
  });
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const fieldCls =
  'w-full h-12 px-3.5 rounded-xl border border-gray-300 bg-white text-sm text-slate-800 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E293B]/15 focus:border-[#1E293B]/40';

const selectCls =
  'w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm text-slate-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#1E293B]/15 focus:border-[#1E293B]/40 disabled:opacity-50';

// ── Collect Fee: flexible student finder — search by name / roll no. /
// admission no. / parent phone (any of these narrows live as you type), or
// just browse a Class + Section without typing a name at all. Selecting a
// student navigates straight into their ledger, where the accountant
// reviews history and collects payment. ────────────────────────────────────

export function FeeCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectStudentId = searchParams.get('studentId');

  // Deep link support (?studentId=…): skip the search entirely.
  useEffect(() => {
    if (preselectStudentId) navigate(`/accountant/student-ledger/${preselectStudentId}`, { replace: true });
  }, [preselectStudentId, navigate]);

  const { data: classes, isLoading: classesLoading } = useSchoolClasses();

  const [nameInput, setNameInput] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const sections = useMemo(
    () => classes?.find((c) => c.name === selectedClass)?.sections ?? [],
    [classes, selectedClass],
  );

  // A search fires as soon as EITHER a name/roll/admission/phone is typed,
  // OR a class is picked — so an accountant can either type straight into
  // the name box, or browse a whole class/section and refine by typing a
  // letter at a time, in any order.
  const canSearch = nameInput.trim().length > 0 || !!selectedClass;
  const { data, isLoading } = useStudentsPaginated(
    canSearch
      ? {
          ...(nameInput.trim() ? { search: nameInput.trim() } : {}),
          ...(selectedClass ? { class: selectedClass } : {}),
          ...(selectedSection ? { section: selectedSection } : {}),
          status: 'active',
          limit: 200,
        }
      : {},
  );

  const filtered = useMemo(() => sortByRoll(data?.data ?? []), [data]);

  function openStudent(s: Student) {
    navigate(`/accountant/student-ledger/${s._id}`);
  }

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filtered.length) {
      e.preventDefault();
      openStudent(filtered[focusedIndex]);
    }
  }, [filtered, focusedIndex]);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-base font-bold text-slate-900">Collect Fee</h1>
        <p className="text-xs text-slate-400 mt-0.5">Find a student to open their ledger and collect payment.</p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Search by name, roll no., admission no. or phone</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={nameRef}
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setFocusedIndex(-1); }}
              onKeyDown={handleNameKeyDown}
              placeholder="Type a name, roll no., admission no. or parent's phone number…"
              className={`${fieldCls} pl-10`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); setFocusedIndex(-1); }}
              className={selectCls}
            >
              <option value="">{classesLoading ? 'Loading…' : 'All classes'}</option>
              {classes?.map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => { setSelectedSection(e.target.value); setFocusedIndex(-1); }}
              disabled={!selectedClass}
              className={selectCls}
            >
              <option value="">All sections</option>
              {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
        </div>

        {canSearch && (
          <div className="space-y-1.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />
              ))
            ) : !filtered.length ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">No students found</p>
                <p className="text-xs text-slate-400 mt-1">Try a different name/phone number, or check the class and section.</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-400 px-1">{filtered.length} student{filtered.length === 1 ? '' : 's'} found</p>
                {filtered.map((s, idx) => (
                  <button
                    key={s._id}
                    onClick={() => openStudent(s)}
                    className={`w-full flex items-center gap-3 rounded-xl border shadow-sm px-4 py-3 hover:border-[#1E293B]/30 hover:shadow-md transition-all text-left ${
                      idx === focusedIndex
                        ? 'bg-[#5B21B6]/5 border-[#5B21B6]/40 ring-2 ring-[#5B21B6]/20'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1E293B]/10 flex items-center justify-center text-[#1E293B] font-bold text-xs shrink-0">
                      {initials(s.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-slate-400">
                        Roll {s.rollNumber || '—'} · Class {s.class}-{s.section} · {s.admissionNumber}
                        {s.parentPhone ? ` · ${s.parentPhone}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
