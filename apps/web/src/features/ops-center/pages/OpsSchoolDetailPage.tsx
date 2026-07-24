import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useOpsSchoolDetail } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { OpsAuditLogEntry, OpsSecurityEvent } from '../api/opsApi';
import { SEVERITY_TO_STATUS, SECURITY_TYPE_LABEL } from '../lib/securityEvent';

const ACTIVITY_COLUMNS: DataTableColumn<OpsAuditLogEntry>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
  { key: 'user', header: 'User', render: (r) => r.userDisplayName },
  { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
  { key: 'resource', header: 'Resource', render: (r) => r.resource },
];

const SECURITY_COLUMNS: DataTableColumn<OpsSecurityEvent>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
  { key: 'risk', header: 'Risk', render: (r) => <StatusBadge status={SEVERITY_TO_STATUS[r.severity]} label={r.severity} /> },
  { key: 'type', header: 'Type', render: (r) => SECURITY_TYPE_LABEL[r.type] },
  { key: 'detail', header: 'Detail', render: (r) => r.message },
];

export function OpsSchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { data, isLoading, isError } = useOpsSchoolDetail(schoolId ?? '');

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load school detail.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/ops/schools" className="text-xs text-[#98A2B3] hover:text-[#F4F6F8]">
          ← Back to Schools
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[#F4F6F8]">{data.schoolName}</h1>
        <p className="mt-1 text-sm text-[#98A2B3] font-mono">{data.schoolId}</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Overview</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Students" value={data.studentCount.toLocaleString()} />
          <MetricCard label="Teachers" value={data.teacherCount.toLocaleString()} />
          <MetricCard label="Active (15m)" value={data.activeUsers15m} />
          <MetricCard
            label="Attendance Today"
            value={`${data.attendanceRatePercent}%`}
            accent={data.attendanceRatePercent < 75 ? '#EF4444' : undefined}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-2">
          <MetricCard label="Fee Collected Today" value={`₹${data.feeCollectedTodayRupees.toLocaleString('en-IN')}`} />
          <MetricCard
            label="Last Activity"
            value={data.lastActivityAt ? new Date(data.lastActivityAt).toLocaleString() : '—'}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Last 7 Days</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#232D38] bg-[#121922]">
          <table className="w-full min-w-[500px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#232D38]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Attendance</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Fee Collected</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((row) => (
                <tr key={row.date} className="border-b border-[#232D38] last:border-0">
                  <td className="px-4 py-2 text-[#F4F6F8]">{row.date}</td>
                  <td className="px-4 py-2 text-right text-[#F4F6F8]">{row.attendanceRatePercent}%</td>
                  <td className="px-4 py-2 text-right text-[#F4F6F8]">₹{row.feeCollectedRupees.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent Activity</h2>
        <DataTable
          columns={ACTIVITY_COLUMNS}
          rows={data.recentActivity}
          rowKey={(r) => r._id}
          emptyMessage="No recent activity for this school."
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent Security Events</h2>
        <DataTable
          columns={SECURITY_COLUMNS}
          rows={data.recentSecurityEvents}
          rowKey={(r) => r.id}
          emptyMessage="No security events for this school."
        />
      </section>
    </div>
  );
}
