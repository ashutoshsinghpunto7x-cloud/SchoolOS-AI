import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useAdmissionsReport, useRecruitmentReport, useVisitorReport } from '../hooks/useFrontOfficeReports';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 9 — one page, three tabs (Admissions / Recruitment / Visitors),
// each a stat-tile row + charts, matching the SRD's own UI description.

type Tab = 'admissions' | 'recruitment' | 'visitors';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="h-56">{children}</div>
    </div>
  );
}

function AdmissionsTab({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, isLoading } = useAdmissionsReport({ dateFrom, dateTo });
  if (isLoading || !data) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-orange-600" /></div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Inquiries" value={data.totalInquiries} />
        <StatTile label="Conversion Rate" value={`${data.conversionRate}%`} />
        <StatTile label="Forms Issued" value={data.formFunnel.issued} />
        <StatTile label="Forms Verified" value={data.formFunnel.verified} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Admission Trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.admissionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#EA580C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Source Effectiveness">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sourceEffectiveness.map((s) => ({ ...s, source: s.source.replace('_', ' ') }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="source" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#93C5FD" name="Total" />
              <Bar dataKey="converted" fill="#5B21B6" name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Counselor Performance</h3>
        {data.counselorPerformance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No leads assigned to a counselor in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                <th className="py-2">Counselor</th><th className="py-2">Leads</th><th className="py-2">Converted</th><th className="py-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.counselorPerformance.map((c) => (
                <tr key={c.counsellor} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-900">{c.counsellor}</td>
                  <td className="py-2 text-gray-600">{c.leadsAssigned}</td>
                  <td className="py-2 text-gray-600">{c.converted}</td>
                  <td className="py-2 text-gray-600">{c.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RecruitmentTab({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, isLoading } = useRecruitmentReport({ dateFrom, dateTo });
  if (isLoading || !data) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-orange-600" /></div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="CVs Received" value={data.cvsReceived} />
        <StatTile label="Interviews Conducted" value={data.interviewsConducted} />
        <StatTile label="Hiring Rate" value={`${data.hiringRate}%`} />
        <StatTile label="Avg. Time to Hire" value={data.avgTimeToHireDays != null ? `${data.avgTimeToHireDays}d` : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="CVs by Position">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.cvsByPosition} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="position" width={110} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#EA580C" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Interviewer Scoring Consistency</h3>
          {data.interviewerConsistency.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No feedback submitted in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                  <th className="py-2">Interviewer</th><th className="py-2">Avg Score</th><th className="py-2">Variance</th><th className="py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.interviewerConsistency.map((c) => (
                  <tr key={c.interviewer} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{c.interviewer}</td>
                    <td className="py-2 text-gray-600">{c.avgScore}</td>
                    <td className={`py-2 font-semibold ${c.scoreVariance > 4 ? 'text-amber-600' : 'text-gray-600'}`}>{c.scoreVariance}</td>
                    <td className="py-2 text-gray-600">{c.feedbackCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitorsTab({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, isLoading } = useVisitorReport({ dateFrom, dateTo });
  if (isLoading || !data) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-orange-600" /></div>;

  const totalVisitors = data.dailyVisitors.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Visitors" value={totalVisitors} />
        <StatTile label="Avg. Visit Duration" value={data.avgVisitDurationMinutes != null ? `${data.avgVisitDurationMinutes}m` : '—'} />
        <StatTile label="Most Visited" value={data.mostVisitedStaff[0]?.staff ?? '—'} />
        <StatTile label="Top Purpose" value={data.purposeBreakdown[0]?.purpose.replace('_', ' ') ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily Visitors">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.dailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Visiting Hours">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peakVisitingHours.map((h) => ({ ...h, hourLabel: `${h.hour}:00` }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hourLabel" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Most Visited Staff</h3>
          <ul className="flex flex-col gap-1.5">
            {data.mostVisitedStaff.map((m) => (
              <li key={m.staff} className="flex justify-between text-sm"><span className="text-gray-700">{m.staff}</span><span className="font-semibold text-gray-900">{m.count}</span></li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Purpose Breakdown</h3>
          <ul className="flex flex-col gap-1.5">
            {data.purposeBreakdown.map((p) => (
              <li key={p.purpose} className="flex justify-between text-sm"><span className="text-gray-700 capitalize">{p.purpose.replace('_', ' ')}</span><span className="font-semibold text-gray-900">{p.count}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function FrontOfficeReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('admissions');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/reception')} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-gray-900">Front Office Reports</h1>
          <p className="text-sm text-gray-500">Admissions, recruitment, and visitor analytics — defaults to this month</p>
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 mb-5">
        {([
          { key: 'admissions', label: 'Admissions' },
          { key: 'recruitment', label: 'Recruitment' },
          { key: 'visitors', label: 'Visitors' },
        ] as const).map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 h-9 rounded-md text-sm font-semibold transition-colors ${tab === t.key ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'admissions' && <AdmissionsTab dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} />}
      {tab === 'recruitment' && <RecruitmentTab dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} />}
      {tab === 'visitors' && <VisitorsTab dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} />}
    </div>
  );
}
