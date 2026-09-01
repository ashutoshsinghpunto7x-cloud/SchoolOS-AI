import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Search, ChevronRight, AlertCircle } from 'lucide-react';
import { usePrincipalPlanOverview, usePlanAlerts } from '../hooks/useAcademicPlan';
import { PlanAlertList } from '../components/PlanAlertList';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500'];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface PrincipalAcademicPlanPageProps {
  /** Where the "teacher" drill-down and back button live — lets the
   *  Coordinator workspace reuse this exact screen at /coordinator/academic-plan
   *  instead of forking it, same basePath convention as EmployeesPage. */
  basePath?: string;
  homePath?: string;
}

/** Level 1 — one profile per teacher, with an overall completion % averaged
 *  across every class+subject Academic Plan they have. Mirrors
 *  PrincipalPlannerPage's structure (Teacher Planner v2) one level deep, but
 *  reads AcademicPlan's day-granular data instead of weekly tasks. */
export function PrincipalAcademicPlanPage({ basePath = '/principal/academic-plan', homePath = '/principal' }: PrincipalAcademicPlanPageProps = {}) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePrincipalPlanOverview();
  const { data: alerts } = usePlanAlerts();
  const [search, setSearch] = useState('');

  const teachers = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const filtered = term ? data.filter((e) => e.teacherName.toLowerCase().includes(term)) : data;

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
        return { teacherId, teacherName: entries[0].teacherName, subjectCount: new Set(withPlan.map((e) => e.subject)).size, overallPercent };
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [data, search]);

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate(homePath)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Academic Plan</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Auto-generated teaching plans — real-time completion across every teacher, class, and subject.</p>

        {(alerts?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Risk alerts</p>
            <PlanAlertList limit={5} />
          </div>
        )}

        <div className="mt-5 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
          />
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <>
              <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
              <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
            </>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load Academic Plan overview</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No teachers found</p>
            </div>
          ) : (
            teachers.map((t) => (
              <button
                key={t.teacherId}
                type="button"
                onClick={() => navigate(`${basePath}/teacher/${t.teacherId}`)}
                className="w-full flex items-center gap-3 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm px-4 py-3.5 text-left hover:bg-gray-50/80 dark:hover:bg-white/10 transition-colors"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${avatarColor(t.teacherId)}`}>
                  <span className="text-sm font-bold text-white">{initials(t.teacherName)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t.teacherName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t.overallPercent === null ? 'No plan generated yet' : `${t.subjectCount} subject${t.subjectCount === 1 ? '' : 's'} · completion`}
                  </p>
                </div>
                {t.overallPercent !== null && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${t.overallPercent}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-white/70 w-9 text-right">{t.overallPercent}%</span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
