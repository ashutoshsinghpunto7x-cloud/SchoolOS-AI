import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminOverview } from '../hooks/useAdminOverview';
import type { AdminOverviewData } from '@schoolos/types';

const TOOLS: { label: string; path: string }[] = [
  { label: 'Users & access', path: '/administration/users' },
  { label: 'Roles', path: '/administration/roles' },
  { label: 'Classes', path: '/administration/classes' },
  { label: 'Employees', path: '/admin/employees' },
  { label: 'Payroll', path: '/admin/payroll' },
  { label: 'Staff QR scan', path: '/admin/attendance-qr' },
  { label: 'ID cards', path: '/admin/id-cards' },
  { label: 'Timetable', path: '/timetable' },
  { label: 'Transport', path: '/transport' },
  { label: 'Automation', path: '/administration/automation' },
  { label: 'Recovery requests', path: '/administration/recovery-requests' },
  { label: 'Settings', path: '/settings' },
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
      <h2 className="text-[18px] md:text-[20px] font-bold text-[#1B2A4E] m-0">{children}</h2>
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
    <div className="flex-1 w-full bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-7">
        {/* Greeting */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1 mb-0">Here is how your school is doing today.</p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-[13px] font-semibold text-[#254A9A] border border-[#D5DCEE] rounded-full px-4 py-1.5 bg-white cursor-pointer disabled:opacity-60"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
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

        {/* Administration tools — secondary */}
        <section className="space-y-3">
          <SectionTitle hint="Day-to-day admin">Tools</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {TOOLS.map((t) => (
              <button
                key={t.path}
                type="button"
                onClick={() => navigate(t.path)}
                className={`${card} px-4 py-3 text-left text-[14px] font-medium text-[#1B2A4E] cursor-pointer hover:shadow-md transition-shadow`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
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
