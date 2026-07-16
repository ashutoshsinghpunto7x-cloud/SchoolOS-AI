import { Link } from 'react-router-dom';
import { Upload, ArrowRight } from 'lucide-react';
import { useImportSessions } from '../hooks/useImport';
import { ImportStatusBadge } from '../components/ImportStatusBadge';

const IMPORT_TYPES = [
  { type: 'students',   label: 'Students',   description: 'Roll numbers, names, class, guardian info' },
  { type: 'teachers',   label: 'Teachers',   description: 'Profiles, subjects, experience' },
  { type: 'fees',       label: 'Fee Records', description: 'Pending/paid fees, due dates' },
  { type: 'admissions', label: 'Admissions', description: 'Enquiry pipeline and lead data' },
  { type: 'attendance', label: 'Attendance History', description: 'Backfill past attendance from registers' },
] as const;

export function ImportDashboard() {
  const { data: recentData, isLoading } = useImportSessions({ limit: 5 });
  const recent = recentData?.data ?? [];

  const completed = recent.filter((s) => s.status === 'completed').length;
  const processing = recent.filter((s) => s.status === 'processing').length;
  const failed = recent.filter((s) => s.status === 'failed').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
          <p className="text-sm text-gray-500 mt-1">Onboard data from existing systems into FNIC</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/import/history"
            className="flex items-center px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            History
          </Link>
          <Link
            to="/import/templates"
            className="flex items-center px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Templates
          </Link>
        </div>
      </div>

      {/* Stats — neutral, no color coding */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xl font-bold text-gray-900">{completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xl font-bold text-gray-900">{processing}</p>
          <p className="text-xs text-gray-500">Processing</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xl font-bold text-gray-900">{failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
      </div>

      {/* Import types */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Start a New Import</h2>
        <div className="grid grid-cols-2 gap-4">
          {IMPORT_TYPES.map(({ type, label, description }) => (
            <Link
              key={type}
              to={`/import/upload?type=${type}`}
              className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Recent Imports</h2>
          <Link to="/import/history" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No imports yet
            </div>
          ) : (
            recent.map((s) => (
              <Link
                key={s._id}
                to={`/import/sessions/${s._id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">{s.importType}</p>
                  <p className="text-xs text-gray-500">{s.originalFileName} · {s.totalRows} rows</p>
                </div>
                <div className="flex items-center gap-3">
                  <ImportStatusBadge status={s.status} />
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
