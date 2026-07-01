import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Play, Trash2 } from 'lucide-react';
import type { ReportCategory, SavedReport } from '@schoolos/types';
import { useSavedReports, useDeleteSavedReport } from '../hooks/useReports';

const CATEGORY_COLORS: Record<ReportCategory, { bg: string; text: string }> = {
  students:   { bg: 'bg-blue-50',   text: 'text-blue-600' },
  attendance: { bg: 'bg-green-50',  text: 'text-green-600' },
  fees:       { bg: 'bg-amber-50',  text: 'text-amber-600' },
  admissions: { bg: 'bg-purple-50', text: 'text-purple-600' },
  timetable:  { bg: 'bg-rose-50',   text: 'text-rose-600' },
  calendar:   { bg: 'bg-indigo-50', text: 'text-indigo-600' },
};

const SavedReportCard = ({
  report,
  onRun,
  onDelete,
}: {
  report: SavedReport;
  onRun: () => void;
  onDelete: () => void;
}) => {
  const colors = CATEGORY_COLORS[report.category] ?? { bg: 'bg-gray-50', text: 'text-gray-600' };
  const filterEntries = Object.entries(report.filters ?? {}).filter(([, v]) => v);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Bookmark size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{report.name}</p>
          {report.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{report.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${colors.bg} ${colors.text}`}>
              {report.category}
            </span>
            {filterEntries.length > 0 && (
              <span className="text-[11px] text-gray-400">
                {filterEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Saved {new Date(report.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
        <button
          onClick={onRun}
          className="flex items-center gap-1.5 flex-1 justify-center h-8 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Play size={12} />
          Run Report
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
};

export const SavedReportsPage = () => {
  const navigate = useNavigate();
  const { data: saved, isLoading } = useSavedReports();
  const { mutate: deleteSaved } = useDeleteSavedReport();

  const handleDelete = (report: SavedReport) => {
    if (window.confirm(`Delete "${report.name}"?`)) {
      deleteSaved(report.id);
    }
  };

  const handleRun = (report: SavedReport) => {
    const params = new URLSearchParams({ category: report.category });
    params.set('savedId', report.id);
    navigate(`/reports/builder?${params.toString()}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Saved Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {saved?.length ?? 0} saved report{saved?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
      ) : !saved?.length ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Bookmark size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-600">No saved reports yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Open any category report, apply filters, and save for quick access.
          </p>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Browse Reports
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map((report) => (
            <SavedReportCard
              key={report.id}
              report={report}
              onRun={() => handleRun(report)}
              onDelete={() => handleDelete(report)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
