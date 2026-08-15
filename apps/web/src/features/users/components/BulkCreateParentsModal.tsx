import { useMemo, useState } from 'react';
import { X, Loader2, Search, CheckSquare, Square, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useBulkCreateParents } from '../hooks/useUsers';
import type { BulkCreateParentsResult } from '@schoolos/types';

interface BulkCreateParentsModalProps {
  onClose: () => void;
}

const DEFAULT_PASSWORD = 'Parent@123';

export const BulkCreateParentsModal = ({ onClose }: BulkCreateParentsModalProps) => {
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [result, setResult] = useState<BulkCreateParentsResult | null>(null);

  const { data, isLoading } = useStudentsPaginated({
    limit: 500,
    class: classFilter || undefined,
    section: sectionFilter || undefined,
    search: search || undefined,
    status: 'active',
  });
  const students = useMemo(() => data?.data ?? [], [data]);

  const { mutateAsync: bulkCreate, isPending } = useBulkCreateParents();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = students.length > 0 && students.every((s) => selected.has(s._id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        students.forEach((s) => next.delete(s._id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        students.forEach((s) => next.add(s._id));
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one student');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await bulkCreate({ studentIds: [...selected], password });
      setResult(res);
      if (res.created.length > 0) {
        toast.success(`${res.created.length} parent login(s) created`);
      } else {
        toast.error('No new logins created — all selected students already have one');
      }
    } catch (err) {
      toast.error('Failed to create parent logins', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const copyResults = () => {
    if (!result) return;
    const lines = result.created.map(
      (c) => `${c.studentName}\t${c.email}\t${c.username}\t${result.password}`
    );
    navigator.clipboard.writeText(
      ['Student\tEmail\tUsername\tPassword', ...lines].join('\n')
    );
    toast.success('Copied to clipboard');
  };

  const downloadCsv = () => {
    if (!result) return;
    const rows = [
      ['Student', 'Login Email', 'Username', 'Password'],
      ...result.created.map((c) => [c.studentName, c.email, c.username, result.password]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parent-logins.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Create Parent Logins</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {result
                ? 'Share these credentials with each family — the password shown here is not stored in plain text and cannot be recovered later.'
                : 'Creates one Parent Workspace login per selected student, all with the same password.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <ResultsView result={result} onCopy={copyResults} onDownload={downloadCsv} onClose={onClose} />
        ) : (
          <>
            {/* Filters */}
            <div className="px-6 pt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or admission no…"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:border-transparent"
                />
              </div>
              <input
                type="text"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                placeholder="Class"
                className="w-full sm:w-28 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:border-transparent"
              />
              <input
                type="text"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                placeholder="Section"
                className="w-full sm:w-28 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:border-transparent"
              />
            </div>

            {/* Student list */}
            <div className="px-6 pt-3 flex-1 overflow-y-auto min-h-[240px]">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm font-bold text-[#5B21B6] mb-2"
                disabled={students.length === 0}
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allSelected ? 'Deselect all' : `Select all (${students.length})`}
              </button>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-16">No students match these filters.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
                  {students.map((s) => (
                    <label
                      key={s._id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(s._id)}
                        onChange={() => toggle(s._id)}
                        className="w-4 h-4 accent-[#5B21B6]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {s.class}-{s.section} · {s.admissionNumber}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Password + submit */}
            <div className="p-6 pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Shared Password <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-base text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:border-transparent mb-1"
              />
              <p className="text-xs text-gray-500 mb-4">
                Every parent login created in this batch gets this same password. Students that already
                have a parent login are skipped automatically.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || selected.size === 0}
                  className="flex-1 h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isPending ? 'Creating…' : `Create ${selected.size || ''} Login${selected.size === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Results view ────────────────────────────────────────────────────────────

const ResultsView = ({
  result,
  onCopy,
  onDownload,
  onClose,
}: {
  result: BulkCreateParentsResult;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}) => (
  <div className="flex-1 overflow-y-auto p-6">
    {result.created.length > 0 && (
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="h-9 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> Copy as table
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="h-9 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>
    )}

    {result.created.length > 0 && (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          Created ({result.created.length}) — password: <span className="font-mono">{result.password}</span>
        </h3>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
              <tr>
                <th className="text-left px-3 py-2">Student</th>
                <th className="text-left px-3 py-2">Login Email</th>
                <th className="text-left px-3 py-2">Username</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.created.map((c) => (
                <tr key={c.studentId}>
                  <td className="px-3 py-2 text-gray-900">{c.studentName}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{c.email}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{c.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {result.skipped.length > 0 && (
      <div className="mb-2">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Skipped ({result.skipped.length})</h3>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {result.skipped.map((s) => (
                <tr key={s.studentId}>
                  <td className="px-3 py-2 text-gray-900">{s.studentName}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <button
      type="button"
      onClick={onClose}
      className="w-full h-12 mt-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white transition-colors"
    >
      Done
    </button>
  </div>
);
