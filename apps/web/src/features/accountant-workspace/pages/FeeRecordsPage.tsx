import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, AlertCircle, Users } from 'lucide-react';
import { useClassFeeSummary } from '../hooks/useAccountantWorkspace';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Browse by Class: roll-ordered roster with overall balance per student ──────

const STATUS_PILL_CLASS: Record<'paid' | 'due' | 'no_records', string> = {
  paid:       'bg-emerald-100 text-emerald-800',
  due:        'bg-amber-100 text-amber-800',
  no_records: 'bg-gray-100 text-gray-500',
};

const STATUS_PILL_LABEL: Record<'paid' | 'due' | 'no_records', string> = {
  paid: 'Paid', due: 'Due', no_records: 'No records',
};

function BrowseByClass() {
  const navigate = useNavigate();
  const [classInput, setClassInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const { data, isLoading, isError } = useClassFeeSummary(classInput, sectionInput);

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <input
          type="text"
          value={classInput}
          onChange={(e) => setClassInput(e.target.value)}
          placeholder="Class (e.g. 10)"
          className="w-32 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <input
          type="text"
          value={sectionInput}
          onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
          placeholder="Section (e.g. A)"
          maxLength={10}
          className="w-32 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {!classInput.trim() || !sectionInput.trim() ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Enter a class and section</p>
          <p className="text-xs text-gray-400 mt-1">Students will be listed in roll number order with their overall fee balance.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> Couldn't load this class.
        </div>
      ) : !data?.students.length ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No students found in Class {classInput}-{sectionInput}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
          {data.students.map((s) => (
            <button
              key={s.studentId}
              onClick={() => navigate(`/accountant/student-ledger/${s.studentId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                {s.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.fullName}</p>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_PILL_CLASS[s.status])}>
                    {STATUS_PILL_LABEL[s.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Roll {s.rollNumber || '—'} · {s.admissionNumber}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-800">{fmt(s.totalPaid)} paid</p>
                <p className={cn('text-xs font-semibold', s.status === 'due' ? 'text-amber-600' : 'text-gray-400')}>
                  {s.status === 'due' ? `${fmt(s.balance)} due` : s.status === 'no_records' ? 'No fee records' : 'Fully paid'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FeeRecordsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Fee Records</h1>
          <p className="text-xs text-gray-500">Browse students by class to view their fee records</p>
        </div>
        <button
          onClick={() => navigate('/accountant/student-ledger')}
          className="h-9 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 shrink-0"
        >
          Student Ledger
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        <BrowseByClass />
      </div>
    </div>
  );
}
