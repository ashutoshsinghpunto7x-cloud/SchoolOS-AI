import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useOpsSchools } from '../hooks/useOpsData';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsSchoolRow } from '../api/opsApi';

const COLUMNS: DataTableColumn<OpsSchoolRow>[] = [
  {
    key: 'school',
    header: 'School',
    render: (r) => (
      <Link to={`/ops/schools/${r.schoolId}`} className="font-medium text-[#3B82F6] hover:underline">
        {r.schoolName}
      </Link>
    ),
  },
  { key: 'students', header: 'Students', render: (r) => r.studentCount.toLocaleString(), align: 'right' },
  { key: 'teachers', header: 'Teachers', render: (r) => r.teacherCount.toLocaleString(), align: 'right' },
  { key: 'active', header: 'Active (15m)', render: (r) => r.activeUsers15m, align: 'right' },
  {
    key: 'attendance',
    header: 'Attendance Today',
    render: (r) => (
      <StatusBadge
        status={r.attendanceRatePercent >= 90 ? 'healthy' : r.attendanceRatePercent >= 75 ? 'warning' : 'critical'}
        label={`${r.attendanceRatePercent}%`}
      />
    ),
  },
  {
    key: 'fees',
    header: 'Fee Collection Today',
    render: (r) => `₹${r.feeCollectedTodayRupees.toLocaleString('en-IN')}`,
    align: 'right',
  },
  {
    key: 'lastActivity',
    header: 'Last Activity',
    render: (r) => (r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : '—'),
  },
];

export function OpsSchoolsPage() {
  const { data, isLoading, isError } = useOpsSchools();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load school data.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Schools</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">Showing {data.length} school{data.length === 1 ? '' : 's'}</p>
      </div>
      <DataTable columns={COLUMNS} rows={data} rowKey={(r) => r.schoolId} emptyMessage="No schools found." />
    </div>
  );
}
