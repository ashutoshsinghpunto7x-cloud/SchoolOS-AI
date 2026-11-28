import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminOverview } from '../hooks/useAdminOverview';
import type { AdminOverviewData } from '@schoolos/types';

const QUICK_LINKS: { label: string; path: string; d: string }[] = [
  { label: 'Users', path: '/administration/users', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Roles', path: '/administration/roles', d: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { label: 'Classes', path: '/administration/classes', d: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
  { label: 'Employees', path: '/admin/employees', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6' },
  { label: 'Payroll', path: '/admin/payroll', d: 'M6 3h12M6 8h12M6 13l7 8M6 13h5a4 4 0 0 0 0-8H6' },
  { label: 'Reception', path: '/reception', d: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6' },
  { label: 'Enquiries', path: '/enquiries', d: 'M3 5h18v12H8l-5 4zM8 10h8M8 13h5' },
  { label: 'Attendance', path: '/attendance', d: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Timetable', path: '/timetable', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  { label: 'Transport', path: '/transport', d: 'M5 4h14v13H5zM5 11h14M8 17v3M16 17v3' },
  { label: 'QR Scan', path: '/admin/attendance-qr', d: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10' },
  { label: 'ID Cards', path: '/admin/id-cards', d: 'M3 5h18v14H3zM7 10h4M7 14h6M15 10h2v4h-2z' },
  { label: 'Automation', path: '/administration/automation', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { label: 'Recovery', path: '/administration/recovery-requests', d: 'M15 7a4 4 0 1 1-7.8 1.2L3 12.4V16h3.6l1.2-1.2H10v-2.2l1.4-1.4A4 4 0 0 1 15 7z' },
  { label: 'Settings', path: '/settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4' },
];

const STAGE_LABEL: Record<string, string> = {
  new_enquiry: 'New enquiry',
  contacted: 'Contacted',
  follow_up_scheduled: 'Follow-up set',
  campus_visit: 'Campus visit',
  application_submitted: 'Applied',
  documents_pending: 'Documents pending',
  admission_approved: 'Approved',
  converted: 'Admitted',
  lost: 'Lost',
};

const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Compact rupee format for big headline numbers: ₹4.2 L, ₹1.3 Cr. */
function inrShort(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(1).replace(/\.0$/, '')} K`;
  return `${sign}₹${Math.round(v)}`;
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[16px] font-bold text-[#1B2A4E] m-0">{children}</h2>
      {hint && <span className="text-[12px] text-[#55607A] text-right">{hint}</span>}
    </div>
  );
}

function Kpi({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-700' : 'text-[#55607A]';
  return (
    <div className={`${card} p-4 md:p-5`}>
      <div className="text-[13px] text-[#55607A]">{label}</div>
      <div className="text-[28px] md:text-[32px] leading-tight font-semibold text-[#1B2A4E] mt-1">{value}</div>
      {sub && <div className={`text-[12px] font-semibold mt-1 ${toneClass}`}>{sub}</div>}
    </div>
  );
}

function monthDelta(now: number, prev: number): { text: string; tone: 'good' | 'bad' | 'neutral' } {
  if (prev <= 0) return { text: now > 0 ? 'First collections on record' : 'Nothing collected yet', tone: 'neutral' };
  const d = Math.round(((now - prev) / prev) * 100);
  if (d === 0) return { text: 'Same as last month', tone: 'neutral' };
  return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}% vs last month`, tone: d > 0 ? 'good' : 'bad' };
}

function Alerts({ alerts, onGo }: { alerts: AdminOverviewData['alerts']; onGo: (p: string) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
        <span className="text-[20px]" aria-hidden="true">✓</span>
        <div className="text-[15px] text-emerald-900 font-medium">All clear — nothing needs your attention right now.</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const crit = a.severity === 'critical';
        return (
          <div
            key={a.id}
            className={`rounded-[14px] border px-4 py-3 flex items-start justify-between gap-3 ${
              crit ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div>
              <div className={`text-[15px] font-bold ${crit ? 'text-red-800' : 'text-amber-900'}`}>{a.title}</div>
              <div className="text-[13px] text-[#55607A] mt-0.5">{a.message}</div>
            </div>
            {a.actionUrl && (
              <button
                type="button"
                onClick={() => onGo(a.actionUrl!)}
                className="shrink-0 text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer"
              >
                Open →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminOverview();
  const firstName = user?.firstName ?? '';

  return (
    <div className="flex-1 w-full font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-7">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">
            Pick up where you left off.{' '}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="text-[13px] font-semibold text-[#D9822B] hover:underline cursor-pointer disabled:opacity-60"
            >
              {isFetching ? 'Refreshing…' : 'Refresh numbers'}
            </button>
          </p>
        </div>

        {/* Quick launch */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-3 sm:gap-x-3">
          {QUICK_LINKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.path)}
              className="group flex flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={q.d} />
                </svg>
              </span>
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className={`${card} p-8 text-center text-[15px] text-[#55607A]`}>Loading your school's numbers…</div>
        )}

        {isError && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-5">
            <div className="text-[15px] font-bold text-red-800">Couldn't load the overview</div>
            <div className="text-[13px] text-red-700 mt-1">{error.message}</div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-[13px] font-semibold text-red-800 underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {data && <Overview data={data} onGo={navigate} />}
      </div>
    </div>
  );
};

function Overview({ data, onGo }: { data: AdminOverviewData; onGo: (p: string) => void }) {
  const { money, growth, people, attention } = data;
  const delta = monthDelta(money.collectedThisMonth, money.collectedLastMonth);
  const net = money.netThisMonth;
  const maxFunnel = Math.max(1, ...growth.funnel.map((f) => f.count));
  const anyTrend = money.trend.some((t) => t.collected > 0 || t.spent > 0);
  const staffPct = people.staffTotal > 0 ? Math.round((people.staffPresentToday / people.staffTotal) * 100) : 0;

  const approvals = [
    { label: 'Leave requests waiting', count: attention.pendingLeaves },
    {
      label: 'Expenses waiting for approval',
      count: attention.pendingExpenses,
      extra: attention.pendingExpenses > 0 ? inr(attention.pendingExpenseAmount) : undefined,
    },
    { label: 'Purchase requests waiting', count: attention.pendingPurchaseRequests },
  ];

  return (
    <>
      {/* Needs attention */}
      <section className="space-y-3">
        <SectionTitle>Needs your attention</SectionTitle>
        <Alerts alerts={data.alerts} onGo={onGo} />
      </section>

      {/* Money */}
      <section className="space-y-3">
        <SectionTitle hint="Fees, salaries and expenses">Money</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi label="Collected this month" value={inrShort(money.collectedThisMonth)} sub={delta.text} tone={delta.tone} />
          <Kpi
            label="Still to collect"
            value={inrShort(money.totalOutstanding)}
            sub={money.overdueCount > 0 ? `${money.overdueCount} overdue` : 'Nothing overdue'}
            tone={money.overdueCount > 0 ? 'warn' : 'good'}
          />
          <Kpi
            label="Left after salaries & expenses"
            value={inrShort(net)}
            sub={net >= 0 ? 'This month so far' : 'Spending is ahead of collection'}
            tone={net >= 0 ? 'good' : 'bad'}
          />
          <Kpi
            label="Fees collected overall"
            value={`${money.collectionRate}%`}
            sub={`${inrShort(money.totalCollected)} of ${inrShort(money.totalCharged)}`}
            tone={money.collectionRate >= 80 ? 'good' : money.collectionRate >= 60 ? 'warn' : 'bad'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${card} p-5 lg:col-span-2`}>
            <div className="text-[15px] font-bold text-[#1B2A4E]">Money in vs money out — last 6 months</div>
            <div className="text-[12px] text-[#55607A] mb-3">Money out = salaries paid + approved expenses</div>
            {anyTrend ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={money.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#55607A' }} tickFormatter={(v: string) => v.split(' ')[0]} />
                    <YAxis tick={{ fontSize: 12, fill: '#55607A' }} tickFormatter={(v: number) => inrShort(v)} width={64} />
                    <Tooltip formatter={(v) => inr(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="collected" name="Fees collected" fill="#254A9A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Salaries + expenses" fill="#D9822B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-[14px] text-[#55607A]">
                No payments or salaries recorded in the last 6 months yet.
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
              <div>
                <div className="text-[#55607A]">Salaries paid</div>
                <div className="font-semibold text-[#1B2A4E]">{inr(money.salaryPaidThisMonth)}</div>
              </div>
              <div>
                <div className="text-[#55607A]">Salaries still due</div>
                <div className="font-semibold text-[#1B2A4E]">{inr(money.salaryPendingThisMonth)}</div>
              </div>
              <div>
                <div className="text-[#55607A]">Other expenses</div>
                <div className="font-semibold text-[#1B2A4E]">{inr(money.expensesThisMonth)}</div>
              </div>
            </div>
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[15px] font-bold text-[#1B2A4E]">Classes with most dues</div>
            <div className="text-[12px] text-[#55607A] mb-2">Only fees already past their due date</div>
            {money.topDefaulterClasses.length === 0 ? (
              <div className="py-6 text-center text-[14px] text-emerald-700 font-medium">No dues pending 🎉</div>
            ) : (
              money.topDefaulterClasses.map((c) => (
                <div
                  key={`${c.class}-${c.section}`}
                  className="flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/70"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[#1B2A4E]">
                      Class {c.class}
                      {c.section ? `-${c.section}` : ''}
                    </div>
                    <div className="text-[12px] text-[#55607A]">{c.students} student{c.students === 1 ? '' : 's'}</div>
                  </div>
                  <div className="text-[14px] font-bold text-red-600">{inr(c.balance)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Growth */}
      <section className="space-y-3">
        <SectionTitle hint="Students and admissions">Growth</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi label="Students" value={String(growth.activeStudents)} sub={`${growth.newStudentsThisMonth} joined this month`} tone="good" />
          <Kpi label="New enquiries this month" value={String(growth.enquiriesThisMonth)} sub={`${growth.enquiriesTotal} in total`} />
          <Kpi
            label="Admitted this month"
            value={String(growth.convertedThisMonth)}
            sub={growth.convertedThisMonth > 0 ? 'Enquiries turned into students' : 'None yet this month'}
            tone={growth.convertedThisMonth > 0 ? 'good' : 'neutral'}
          />
          <Kpi
            label="Follow-ups overdue"
            value={String(growth.pendingFollowUps)}
            sub={growth.pendingFollowUps > 0 ? 'Parents waiting for a call' : 'Everyone is followed up'}
            tone={growth.pendingFollowUps > 0 ? 'warn' : 'good'}
          />
        </div>

        <div className={`${card} p-5`}>
          <div className="text-[15px] font-bold text-[#1B2A4E] mb-3">Admissions pipeline</div>
          {growth.enquiriesTotal === 0 ? (
            <div className="py-4 text-[14px] text-[#55607A]">No enquiries recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {growth.funnel.map((f) => (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="w-[130px] sm:w-[160px] shrink-0 text-[13px] text-[#1B2A4E]">{STAGE_LABEL[f.stage] ?? f.stage}</div>
                  <div className="flex-1 h-[10px] rounded-full bg-[#F3EEE3] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.stage === 'lost' ? 'bg-red-400' : f.stage === 'converted' ? 'bg-emerald-500' : 'bg-[#254A9A]'}`}
                      style={{ width: `${Math.round((f.count / maxFunnel) * 100)}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-[13px] font-semibold text-[#1B2A4E]">{f.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* People & running of the school */}
      <section className="space-y-3">
        <SectionTitle hint="Today">People &amp; running of the school</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi
            label="Student attendance today"
            value={people.attendanceMarkedToday ? `${people.attendanceTodayRate}%` : '—'}
            sub={people.attendanceMarkedToday ? `${people.attendanceWeeklyRate}% this week` : 'Not marked yet today'}
            tone={!people.attendanceMarkedToday ? 'neutral' : people.attendanceTodayRate >= 85 ? 'good' : people.attendanceTodayRate >= 75 ? 'warn' : 'bad'}
          />
          <Kpi
            label="Teachers present"
            value={`${people.teachersPresentToday}/${people.teachersTotal}`}
            sub={people.teachersTotal > 0 && people.teachersPresentToday === 0 ? 'No check-ins yet' : 'Checked in today'}
          />
          <Kpi label="All staff present" value={`${people.staffPresentToday}/${people.staffTotal}`} sub={`${staffPct}% checked in`} />
          <Kpi
            label="Waiting for a decision"
            value={String(attention.pendingLeaves + attention.pendingExpenses + attention.pendingPurchaseRequests)}
            sub="Leaves, expenses, purchases"
            tone={attention.pendingLeaves + attention.pendingExpenses + attention.pendingPurchaseRequests > 0 ? 'warn' : 'good'}
          />
        </div>

        <div className={`${card} p-5`}>
          <div className="text-[15px] font-bold text-[#1B2A4E] pb-1">Pending approvals</div>
          {approvals.map((a) => (
            <div key={a.label} className="flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/70">
              <span className="text-[14px] text-[#1B2A4E]">{a.label}</span>
              <span className="flex items-center gap-2">
                {a.extra && <span className="text-[12px] text-[#55607A]">{a.extra}</span>}
                <span
                  className={`min-w-7 h-7 px-2.5 rounded-full text-[12px] font-bold flex items-center justify-center ${
                    a.count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-[#F3EEE3] text-[#55607A]'
                  }`}
                >
                  {a.count}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
