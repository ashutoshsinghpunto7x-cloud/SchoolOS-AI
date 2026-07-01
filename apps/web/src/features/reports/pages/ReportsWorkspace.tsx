import { useNavigate } from 'react-router-dom';
import {
  Users, CalendarCheck, DollarSign, UserPlus, Grid, Calendar,
  Bookmark, ChevronRight, Trash2,
} from 'lucide-react';
import type { ReportCategory, SavedReport } from '@schoolos/types';
import { useSavedReports, useDeleteSavedReport } from '../hooks/useReports';

interface CategoryCard {
  category: ReportCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const CATEGORIES: CategoryCard[] = [
  {
    category: 'students',
    label: 'Students',
    description: 'Enrollment by class, gender, status',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    category: 'attendance',
    label: 'Attendance',
    description: 'Daily trends, class-wise rates',
    icon: CalendarCheck,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    category: 'fees',
    label: 'Fees',
    description: 'Collection trends, outstanding dues',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    category: 'admissions',
    label: 'Admissions',
    description: 'Pipeline, source breakdown, monthly trends',
    icon: UserPlus,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    category: 'timetable',
    label: 'Timetable',
    description: 'Teacher workload, subject distribution',
    icon: Grid,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    category: 'calendar',
    label: 'Calendar',
    description: 'Upcoming events, event type breakdown',
    icon: Calendar,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

const SavedReportRow = ({ report, onDelete }: { report: SavedReport; onDelete: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{report.name}</p>
        <p className="text-xs text-gray-400 capitalize mt-0.5">
          {report.category} · {new Date(report.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() =>
            navigate(`/reports/builder?category=${report.category}&savedId=${report.id}`)
          }
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Run
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export const ReportsWorkspace = () => {
  const navigate = useNavigate();
  const { data: saved, isLoading } = useSavedReports();
  const { mutate: deleteSaved } = useDeleteSavedReport();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore data across students, attendance, fees, admissions, timetable, and calendar.
        </p>
      </div>

      {/* Category cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Analytics Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(({ category, label, description, icon: Icon, color, bg }) => (
            <button
              key={category}
              onClick={() => navigate(`/reports/builder?category=${category}`)}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 text-left transition-all group"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <ChevronRight
                size={16}
                className="text-gray-300 group-hover:text-gray-500 mt-0.5 flex-shrink-0 transition-colors"
              />
            </button>
          ))}
        </div>
      </section>

      {/* Saved reports */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Saved Reports
          </h2>
          {(saved?.length ?? 0) > 3 && (
            <button
              onClick={() => navigate('/reports/saved')}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : !saved?.length ? (
            <div className="px-5 py-10 text-center">
              <Bookmark size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No saved reports yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Open any analytics category and save a report with your filters.
              </p>
            </div>
          ) : (
            <div className="px-5">
              {saved.slice(0, 5).map((r) => (
                <SavedReportRow
                  key={r.id}
                  report={r}
                  onDelete={() => { if (window.confirm('Delete this saved report?')) deleteSaved(r.id); }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
