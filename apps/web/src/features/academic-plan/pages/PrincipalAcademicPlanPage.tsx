import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Search, ChevronDown, AlertCircle, CalendarDays, BookOpen, Clock } from 'lucide-react';
import { usePrincipalPlanOverview, usePlanAlerts } from '../hooks/useAcademicPlan';
import { sumPeriods } from '../components/PeriodCounts';
import { PlanAlertList } from '../components/PlanAlertList';

const classLabel = (e: { class: string; section?: string }) => (e.section ? `${e.class}-${e.section}` : e.class);

/** Big circular completion ring — grey track, orange progress arc. */
function CompletionRing({ percent }: { percent: number | null }) {
  const size = 150;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = percent ?? 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-[#EDE8E3] dark:text-white/10" />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F97316" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[34px] font-bold text-gray-900 dark:text-white tracking-tight">{pct}%</span>
    </div>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-11 pl-4 pr-10 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 dark:text-white text-sm font-semibold text-gray-800 cursor-pointer">
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function PeriodStat({ label, p }: { label: string; p?: { done: number; total: number } }) {
  return (
    <div className="flex-1 text-center px-3 first:pl-0 last:pr-0">
      <p className="text-[11px] text-gray-500 dark:text-white/50">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{!p || p.total === 0 ? '—' : `${p.done}/${p.total}`}</p>
    </div>
  );
}

interface PrincipalAcademicPlanPageProps {
  /** Where the "teacher" drill-down and back button live — lets the
   *  Coordinator workspace reuse this exact screen at /coordinator/academic-plan
   *  instead of forking it, same basePath convention as EmployeesPage. */
  basePath?: string;
  homePath?: string;
}

/** Level 1 — one ring card per teacher, with an overall completion % averaged
 *  across every class+subject Academic Plan they have. Reads AcademicPlan's
 *  day-granular data (completion + today/week/month ticked-lesson counts). */
export function PrincipalAcademicPlanPage({ basePath = '/principal/academic-plan', homePath = '/principal' }: PrincipalAcademicPlanPageProps = {}) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePrincipalPlanOverview();
  const { data: alerts } = usePlanAlerts();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [cls, setCls] = useState('');
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const subjects = useMemo(() => [...new Set((data ?? []).map((e) => e.subject))].sort(), [data]);
  const classes = useMemo(
    () => [...new Set((data ?? []).map(classLabel))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [data],
  );

  const teachers = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const filtered = data.filter((e) =>
      (!term || e.teacherName.toLowerCase().includes(term)) &&
      (!subject || e.subject === subject) &&
      (!cls || classLabel(e) === cls));

    const byTeacher = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const list = byTeacher.get(entry.teacherId) ?? [];
      list.push(entry);
      byTeacher.set(entry.teacherId, list);
    }

    return [...byTeacher.entries()]
      .map(([teacherId, entries]) => {
        const withPlan = entries.filter((e) => e.hasPlan && e.totalDays > 0);
        const totalDays = withPlan.reduce((sum, e) => sum + e.totalDays, 0);
        const completedDays = withPlan.reduce((sum, e) => sum + e.completedDays, 0);
        const overallPercent = totalDays === 0 ? null : Math.round((completedDays / totalDays) * 100);
        return { teacherId, teacherName: entries[0].teacherName, subjectCount: new Set(withPlan.map((e) => e.subject)).size, overallPercent, periods: sumPeriods(withPlan) };
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [data, search, subject, cls]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDF8F3] dark:bg-transparent pb-24">
      <div className="px-5 sm:px-8 pt-6 pb-4 max-w-6xl mx-auto relative z-10">
        <button onClick={() => navigate(homePath)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[34px] sm:text-[44px] font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">Academic Plan</h1>
            <p className="text-base text-gray-500 dark:text-white/40 mt-2">Auto-generated teaching plans — real-time completion across every teacher, class, and subject.</p>
          </div>
          <div className="flex items-center gap-2 h-11 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white shadow-sm dark:bg-white/5 text-sm font-semibold text-gray-800 dark:text-white">
            <CalendarDays className="w-4 h-4" /> {monthLabel}
          </div>
        </div>

        {(alerts?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Risk alerts</p>
            <PlanAlertList limit={5} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher…"
              className="w-full h-11 pl-11 pr-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 dark:text-white text-sm"
            />
          </div>
          <FilterSelect value={subject} onChange={setSubject}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect value={cls} onChange={setCls}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>
        </div>

        {isLoading ? (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 rounded-3xl bg-white/60 animate-pulse" />)}
          </div>
        ) : isError ? (
          <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load Academic Plan overview</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No teachers found</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {teachers.map((t) => (
              <button
                key={t.teacherId}
                type="button"
                onClick={() => navigate(`${basePath}/teacher/${t.teacherId}`)}
                className="flex flex-col items-center text-center rounded-3xl p-2 transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <CompletionRing percent={t.overallPercent} />
                <p className="mt-5 text-xl font-bold text-gray-900 dark:text-white">{t.teacherName}</p>
                {t.overallPercent === null ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 bg-[#F1EBE4] rounded-full px-4 py-1.5">
                    <Clock className="w-3.5 h-3.5" /> No plan generated yet
                  </span>
                ) : (
                  <>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-700 bg-[#F1EBE4] rounded-full px-4 py-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {t.subjectCount} Subject{t.subjectCount === 1 ? '' : 's'}
                    </span>
                    <div className="mt-5 flex items-stretch divide-x divide-gray-300/70 dark:divide-white/10">
                      <PeriodStat label="Today" p={t.periods.today} />
                      <PeriodStat label="This Week" p={t.periods.week} />
                      <PeriodStat label="This Month" p={t.periods.month} />
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* decorative orange wave, bottom-right */}
      <svg aria-hidden className="pointer-events-none absolute bottom-0 right-0 w-[420px] max-w-[60%] h-auto" viewBox="0 0 420 140" fill="none">
        <path d="M0 140 C 120 130 230 70 420 20 L420 140 Z" fill="#FED7AA" opacity="0.7" />
        <path d="M120 140 C 230 130 330 90 420 60 L420 140 Z" fill="#FB923C" />
      </svg>
    </div>
  );
}
