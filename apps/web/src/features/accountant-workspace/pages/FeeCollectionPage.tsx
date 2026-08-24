import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useStudentsPaginated, useStudent } from '@/features/students/hooks/useStudents';
import { useStudentFees } from '@/features/fees/hooks/useFees';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { ProcessFeePaymentView } from '../components/ProcessFeePaymentView';
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

// ── Fee Collection sub-view: fetches the selected student's fee records and
// hands off to the shared payment grid. Kept separate so the deep-link path
// (?studentId=…) and the in-page search selection both go through it. ──────

function FeeCollectionForStudent({ student, onBack }: { student: Student; onBack: () => void }) {
  const { data: feeRecords, isLoading, isError, refetch } = useStudentFees(student._id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#5B21B6] animate-spin" />
      </div>
    );
  }

  if (isError || !feeRecords) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-gray-600">Could not load this student's fee records.</p>
        <button onClick={onBack} className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <ProcessFeePaymentView
      student={student}
      feeRecords={feeRecords}
      onBack={onBack}
      onPaid={() => void refetch()}
    />
  );
}

// ── Collect Fee: flexible student finder — search by name / roll no. /
// admission no. / parent phone (any of these narrows live as you type), or
// just browse a Class + Section without typing a name at all. Selecting a
// student opens the fee collection grid directly, in place. ────────────────

export function FeeCollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectStudentId = searchParams.get('studentId');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Deep link support (?studentId=…): fetch and open that student directly.
  const { data: preselectStudent } = useStudent(preselectStudentId ?? '');
  useEffect(() => {
    if (preselectStudent) setSelectedStudent(preselectStudent);
  }, [preselectStudent]);

  const { data: classes, isLoading: classesLoading } = useSchoolClasses();

  const [nameInput, setNameInput] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  // Parent-name filter: 'father' / 'mother' restrict the typed text to match
  // only that parent's name field, instead of the student's own name/roll/
  // admission/phone. Toggling the same one again turns it back off.
  const [parentFilter, setParentFilter] = useState<'father' | 'mother' | null>(null);

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

  const filtered = useMemo(() => {
    let list = data?.data ?? [];
    // When a parent filter is active and text has been typed, narrow the
    // (already broad, server-matched) result set down to students whose
    // father/mother name actually contains the typed text — the student's
    // own name/roll/admission/phone stop counting as a match.
    const query = nameInput.trim();
    if (parentFilter && query) {
      const q = query.toLowerCase();
      list = list.filter((s) => {
        const field = parentFilter === 'father' ? s.fatherName : s.motherName;
        return (field ?? '').toLowerCase().includes(q);
      });
    }
    return sortByRoll(list);
  }, [data, parentFilter, nameInput]);

  function openStudent(s: Student) {
    setSelectedStudent(s);
  }

  function closeStudent() {
    setSelectedStudent(null);
    if (preselectStudentId) setSearchParams({}, { replace: true });
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

  if (selectedStudent) {
    return <FeeCollectionForStudent student={selectedStudent} onBack={closeStudent} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
        <h1 className="text-base lg:text-lg font-bold text-slate-900">Collect Fee</h1>
        <p className="text-xs lg:text-sm text-slate-400 mt-0.5">Find a student to collect their fee payment.</p>
      </div>

      <div className="px-4 lg:px-8 py-6 w-full space-y-4">
        {/* Search + parent-name toggle + class/section, all in one row on
            wider screens so the row uses the full width instead of leaving
            the rest of the screen blank; stacks on narrow/mobile widths. */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Search by name, roll no., admission no. or phone
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                <input
                  ref={nameRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setFocusedIndex(-1); }}
                  onKeyDown={handleNameKeyDown}
                  placeholder={
                    parentFilter === 'father'
                      ? "Type the father's name…"
                      : parentFilter === 'mother'
                      ? "Type the mother's name…"
                      : "Type a name, roll no., admission no. or parent's phone number…"
                  }
                  className={`${fieldCls} pl-10 lg:h-14 lg:text-base`}
                />
              </div>

              {/* F / M — filter the typed text to just that parent's name */}
              <button
                type="button"
                onClick={() => { setParentFilter((f) => (f === 'father' ? null : 'father')); setFocusedIndex(-1); }}
                title="Search by father's name"
                aria-pressed={parentFilter === 'father'}
                className={`shrink-0 w-11 h-11 lg:w-14 lg:h-14 rounded-full border flex items-center justify-center font-bold text-sm lg:text-base transition-colors ${
                  parentFilter === 'father'
                    ? 'bg-[#1E293B] border-[#1E293B] text-white'
                    : 'bg-white border-gray-300 text-slate-500 hover:border-[#1E293B]/40'
                }`}
              >
                F
              </button>
              <button
                type="button"
                onClick={() => { setParentFilter((f) => (f === 'mother' ? null : 'mother')); setFocusedIndex(-1); }}
                title="Search by mother's name"
                aria-pressed={parentFilter === 'mother'}
                className={`shrink-0 w-11 h-11 lg:w-14 lg:h-14 rounded-full border flex items-center justify-center font-bold text-sm lg:text-base transition-colors ${
                  parentFilter === 'mother'
                    ? 'bg-[#1E293B] border-[#1E293B] text-white'
                    : 'bg-white border-gray-300 text-slate-500 hover:border-[#1E293B]/40'
                }`}
              >
                M
              </button>
            </div>
          </div>

          <div className="flex gap-3 lg:w-[420px] lg:shrink-0">
            <div className="flex-1">
              <label className="block text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); setFocusedIndex(-1); }}
                className={`${selectCls} lg:h-14 lg:text-base`}
              >
                <option value="">{classesLoading ? 'Loading…' : 'All classes'}</option>
                {classes?.map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => { setSelectedSection(e.target.value); setFocusedIndex(-1); }}
                disabled={!selectedClass}
                className={`${selectCls} lg:h-14 lg:text-base`}
              >
                <option value="">All sections</option>
                {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {canSearch && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 lg:h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
              ))
            ) : !filtered.length ? (
              <div className="col-span-full bg-white rounded-xl border border-gray-200 p-6 lg:p-10 text-center">
                <p className="text-sm lg:text-base font-semibold text-slate-700">No students found</p>
                <p className="text-xs lg:text-sm text-slate-400 mt-1">
                  {parentFilter
                    ? `Try a different ${parentFilter}'s name, or check the class and section.`
                    : 'Try a different name/phone number, or check the class and section.'}
                </p>
              </div>
            ) : (
              <>
                <p className="col-span-full text-[11px] lg:text-sm text-slate-400 px-1">
                  {filtered.length} student{filtered.length === 1 ? '' : 's'} found
                </p>
                {filtered.map((s, idx) => (
                  <button
                    key={s._id}
                    onClick={() => openStudent(s)}
                    className={`w-full flex items-center gap-3 rounded-xl border shadow-sm px-4 py-3 lg:px-5 lg:py-4 hover:border-[#1E293B]/30 hover:shadow-md transition-all text-left ${
                      idx === focusedIndex
                        ? 'bg-[#5B21B6]/5 border-[#5B21B6]/40 ring-2 ring-[#5B21B6]/20'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-[#1E293B]/10 flex items-center justify-center text-[#1E293B] font-bold text-xs lg:text-sm shrink-0">
                      {initials(s.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 truncate">{s.fullName}</p>
                      <p className="text-xs lg:text-sm text-slate-400 truncate">
                        Roll {s.rollNumber || '—'} · Class {s.class}-{s.section} · {s.admissionNumber}
                        {s.parentPhone ? ` · ${s.parentPhone}` : ''}
                      </p>
                      {parentFilter && (
                        <p className="text-xs lg:text-sm text-slate-400 truncate">
                          {parentFilter === 'father' ? `Father: ${s.fatherName || '—'}` : `Mother: ${s.motherName || '—'}`}
                        </p>
                      )}
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
