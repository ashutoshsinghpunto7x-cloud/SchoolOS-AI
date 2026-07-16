import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, RefreshCw } from 'lucide-react';
import type {
  ReportCategory,
  ReportFilters,
  ReportAnalyticsData,
  StudentAnalytics,
  AttendanceAnalytics,
  FeeAnalytics,
  AdmissionsAnalytics,
  TimetableAnalytics,
  CalendarAnalytics,
} from '@schoolos/types';
import { useAnalytics, useSavedReports } from '../hooks/useReports';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { SaveReportModal } from '../components/SaveReportModal';
import { ExportMenu, exportToCSV } from '../components/ExportMenu';
import { MiniBar, MiniBarList } from '../components/MiniBar';
import { TrendSparkline } from '../components/TrendSparkline';
import { ReportDataTable } from '../components/ReportDataTable';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  students: 'Students',
  attendance: 'Attendance',
  fees: 'Fees',
  admissions: 'Admissions',
  timetable: 'Timetable',
  calendar: 'Calendar',
};

const VALID_CATEGORIES: ReportCategory[] = [
  'students', 'attendance', 'fees', 'admissions', 'timetable', 'calendar',
];

// ─── Section wrapper ────────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
    <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    {children}
  </div>
);

const StatCard = ({
  label, value, color = 'text-gray-900', bg = 'bg-gray-50',
}: { label: string; value: string | number; color?: string; bg?: string }) => (
  <div className={`p-4 rounded-2xl border border-gray-100 ${bg}`}>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

// ─── Category renderers ──────────────────────────────────────────────────────────
const StudentsView = ({ data }: { data: StudentAnalytics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Section title="Enrollment by Class">
      <MiniBarList items={data.byClass} color="bg-[#5B21B6]" />
    </Section>
    <Section title="Gender Breakdown">
      <div className="space-y-2.5">
        {data.byGender.map((g) => (
          <MiniBar key={g.label} label={g.label} value={g.count} max={data.summary.total || 1} color="bg-[#5B21B6]" />
        ))}
      </div>
    </Section>
    <Section title="Status Breakdown">
      <div className="space-y-2.5">
        {data.byStatus.map((s) => (
          <MiniBar
            key={s.label}
            label={s.label}
            value={s.count}
            max={data.summary.total || 1}
            color={s.label === 'active' ? 'bg-[#5B21B6]' : 'bg-gray-400'}
          />
        ))}
      </div>
    </Section>
    <Section title="Monthly Trend">
      <TrendSparkline
        data={data.monthlyTrend.map((m) => ({ month: m.month, count: m.count }))}
        valueKey="count"
        color="#5B21B6"
        showLabels
      />
    </Section>
    <div className="col-span-full">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Students" value={data.summary.total} />
        <StatCard label="Active" value={data.summary.active} />
        <StatCard label="New This Month" value={data.summary.newThisMonth} />
      </div>
    </div>
  </div>
);

const AttendanceView = ({ data }: { data: AttendanceAnalytics }) => {
  const total = data.summary.total || 1;
  const rate = total > 0 ? Math.round((data.summary.present / total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Present" value={data.summary.present} />
        <StatCard label="Absent" value={data.summary.absent} color="text-red-600" bg="bg-red-50" />
        <StatCard label="Late" value={data.summary.late} />
        <StatCard label="Attendance Rate" value={`${rate}%`} />
      </div>
      <Section title="Daily Rate Trend">
        <TrendSparkline
          data={data.dailyTrend.map((d) => ({ date: d.date, rate: d.rate }))}
          valueKey="rate"
          color="#5B21B6"
          showLabels
        />
      </Section>
      <Section title="Class-wise Attendance">
        <ReportDataTable
          columns={[
            { key: 'class', label: 'Class' },
            { key: 'section', label: 'Section' },
            { key: 'rate', label: 'Rate (%)', align: 'right', render: (v) => `${Number(v).toFixed(1)}%` },
            { key: 'present', label: 'Present', align: 'right' },
            { key: 'absent', label: 'Absent', align: 'right' },
            { key: 'late', label: 'Late', align: 'right' },
          ]}
          data={data.byClass as unknown as Record<string, unknown>[]}
        />
      </Section>
    </div>
  );
};

const FeesView = ({ data }: { data: FeeAnalytics }) => {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const s = data.summary;
  const rate = s.totalCharged > 0 ? Math.round((s.totalCollected / s.totalCharged) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Charged" value={fmt(s.totalCharged)} />
        <StatCard label="Collected" value={fmt(s.totalCollected)} />
        <StatCard label="Outstanding" value={fmt(s.totalOutstanding)} color="text-red-600" bg="bg-red-50" />
        <StatCard label="Collection Rate" value={`${rate}%`} />
      </div>
      <Section title="Monthly Collection Trend">
        <TrendSparkline
          data={data.monthlyTrend.map((m) => ({ month: m.month, collected: m.collected }))}
          valueKey="collected"
          color="#5B21B6"
          showLabels
        />
      </Section>
      <Section title="By Fee Head">
        <div className="space-y-2.5">
          {data.byHead.map((fh) => (
            <MiniBar
              key={fh.label}
              label={fh.label}
              value={fh.collected}
              max={s.totalCollected || 1}
              color="bg-[#5B21B6]"
              formatted={fmt(fh.collected)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

const AdmissionsView = ({ data }: { data: AdmissionsAnalytics }) => {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Applications" value={s.total} />
        <StatCard label="New This Month" value={s.newThisMonth} />
        <StatCard label="Converted This Month" value={s.convertedThisMonth} />
        <StatCard label="Pending Follow-up" value={s.pendingFollowUp} />
        <StatCard label="Conversion Rate" value={`${s.conversionRate.toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="By Stage">
          <MiniBarList items={data.byStage} color="bg-[#5B21B6]" />
        </Section>
        <Section title="By Source">
          <MiniBarList items={data.bySource} color="bg-gray-500" />
        </Section>
      </div>
      <Section title="Monthly Applications Trend">
        <TrendSparkline
          data={data.monthlyTrend.map((m) => ({ month: m.month, count: m.count }))}
          valueKey="count"
          color="#5B21B6"
          showLabels
        />
      </Section>
    </div>
  );
};

const TimetableView = ({ data }: { data: TimetableAnalytics }) => {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Published" value={s.published} />
        <StatCard label="Draft" value={s.draft} />
        <StatCard label="Archived" value={s.archived} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Teacher Workload">
          <ReportDataTable
            columns={[
              { key: 'teacherName', label: 'Teacher' },
              { key: 'entriesCount', label: 'Entries', align: 'right' },
            ]}
            data={data.teacherWorkload as unknown as Record<string, unknown>[]}
            searchPlaceholder="Search teacher…"
          />
        </Section>
        <Section title="Subject Distribution">
          <MiniBarList items={data.subjectDistribution} color="bg-[#5B21B6]" />
        </Section>
      </div>
    </div>
  );
};

const CalendarView = ({ data }: { data: CalendarAnalytics }) => {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="This Month" value={s.thisMonthCount} />
        <StatCard label="Upcoming" value={s.upcomingCount} />
        <StatCard label="Total Published" value={s.totalPublished} />
      </div>
      <Section title="By Event Type">
        <MiniBarList items={data.byType} color="bg-[#5B21B6]" />
      </Section>
      {data.upcoming.length > 0 && (
        <Section title="Upcoming Events">
          <div className="space-y-2">
            {data.upcoming.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{ev.title}</span>
                <span className="text-xs text-gray-400">{new Date(ev.startDate).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// ─── CSV flattening ─────────────────────────────────────────────────────────────
const flattenForCSV = (report: ReportAnalyticsData): Record<string, unknown>[] => {
  switch (report.category) {
    case 'students':
      return report.data.byClass.map((r) => ({ class: r.label, count: r.count }));
    case 'attendance':
      return report.data.byClass as unknown as Record<string, unknown>[];
    case 'fees':
      return report.data.byHead.map((r) => ({
        feeHead: r.label, collected: r.collected, total: r.total,
      }));
    case 'admissions':
      return report.data.bySource.map((r) => ({ source: r.label, count: r.count }));
    case 'timetable':
      return report.data.teacherWorkload as unknown as Record<string, unknown>[];
    case 'calendar':
      return report.data.byType.map((r) => ({ type: r.label, count: r.count }));
    default:
      return [];
  }
};

// ─── Main page ──────────────────────────────────────────────────────────────────
export const ReportBuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawCat = searchParams.get('category') ?? 'students';
  const savedId = searchParams.get('savedId') ?? undefined;
  const category: ReportCategory = VALID_CATEGORIES.includes(rawCat as ReportCategory)
    ? (rawCat as ReportCategory)
    : 'students';

  const { data: savedList } = useSavedReports();
  const savedReport = savedId ? savedList?.find((r) => r.id === savedId) : undefined;

  const [filters, setFilters] = useState<ReportFilters>({});
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { data, isLoading, isFetching, refetch, error } = useAnalytics(category, filters);

  useEffect(() => {
    setFilters(savedReport?.filters ?? {});
  }, [category, savedReport?.id]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = flattenForCSV(data);
    exportToCSV(rows, `${category}-report-${new Date().toISOString().slice(0, 10)}`);
  };

  const renderData = () => {
    if (!data) return null;
    switch (data.category) {
      case 'students':   return <StudentsView data={data.data as StudentAnalytics} />;
      case 'attendance': return <AttendanceView data={data.data as AttendanceAnalytics} />;
      case 'fees':       return <FeesView data={data.data as FeeAnalytics} />;
      case 'admissions': return <AdmissionsView data={data.data as AdmissionsAnalytics} />;
      case 'timetable':  return <TimetableView data={data.data as TimetableAnalytics} />;
      case 'calendar':   return <CalendarView data={data.data as CalendarAnalytics} />;
      default:           return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{CATEGORY_LABELS[category]} Report</h1>
          {savedReport && (
            <p className="text-xs text-[#5B21B6] mt-0.5">Running: {savedReport.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void refetch(); }}
            disabled={isFetching}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={`text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <ExportMenu onExportCSV={handleExportCSV} disabled={!data} />
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!data}
            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-white bg-[#5B21B6] rounded-xl hover:bg-[#4C1D95] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Bookmark size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <ReportFiltersBar
          filters={filters}
          onChange={setFilters}
          showClass={category === 'attendance' || category === 'students'}
          showAcademicYear={category === 'timetable'}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading analytics…</div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600 font-medium">Failed to load data</p>
          <p className="text-xs text-gray-400 mt-1">{error.message}</p>
          <button onClick={() => void refetch()} className="mt-3 text-xs text-[#5B21B6] hover:underline">
            Retry
          </button>
        </div>
      ) : (
        renderData()
      )}

      {showSaveModal && (
        <SaveReportModal
          category={category}
          filters={filters}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
};
