import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
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

// ── Collect Fee: Class → Section → Name search, then straight into the ledger ──
// This is one continuous flow with the Student Ledger page, not a separate
// search feature — selecting a student here navigates directly into their
// ledger, where the accountant reviews history and collects payment.

export function FeeCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectStudentId = searchParams.get('studentId');

  // Deep link support (?studentId=…): skip the search entirely.
  useEffect(() => {
    if (preselectStudentId) navigate(`/accountant/student-ledger/${preselectStudentId}`, { replace: true });
  }, [preselectStudentId, navigate]);

  const [classInput, setClassInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const classRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    classRef.current?.focus();
  }, []);

  // As soon as both Class and Section have something typed, fetch that
  // class+section's students and show them — no need to press Enter first.
  const canSearch = classInput.trim().length > 0 && sectionInput.trim().length > 0;
  const { data, isLoading } = useStudentsPaginated(
    canSearch
      ? { class: classInput.trim(), section: sectionInput.trim().toUpperCase(), status: 'active', limit: 200 }
      : {},
  );

  const students = useMemo(() => sortByRoll(data?.data ?? []), [data]);
  const filtered = useMemo(() => {
    const q = nameInput.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.fullName.toLowerCase().includes(q)
      || s.admissionNumber.toLowerCase().includes(q)
      || (s.rollNumber ?? '').toLowerCase().includes(q));
  }, [students, nameInput]);

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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Class</label>
            <input
              ref={classRef}
              type="text"
              value={classInput}
              onChange={(e) => {
                const v = e.target.value;
                setClassInput(v ? v.charAt(0).toUpperCase() + v.slice(1) : v);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && classInput.trim()) { e.preventDefault(); sectionRef.current?.focus(); } }}
              placeholder="e.g. 10 or Nursery"
              className={fieldCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Section</label>
            <input
              ref={sectionRef}
              type="text"
              value={sectionInput}
              onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && sectionInput.trim()) { e.preventDefault(); nameRef.current?.focus(); } }}
              placeholder="e.g. A"
              maxLength={5}
              className={fieldCls}
            />
          </div>
        </div>

        {canSearch && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Student Name</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setFocusedIndex(-1); }}
                onKeyDown={handleNameKeyDown}
                placeholder="Type to filter by name, roll no. or admission no."
                className={`${fieldCls} pl-10`}
              />
            </div>
          </div>
        )}

        {canSearch && (
          <div className="space-y-1.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />
              ))
            ) : !filtered.length ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">No students found</p>
                <p className="text-xs text-slate-400 mt-1">Check the class and section, then try again.</p>
              </div>
            ) : (
              filtered.map((s, idx) => (
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
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
