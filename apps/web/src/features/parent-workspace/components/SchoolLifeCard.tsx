import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpenCheck, Megaphone, Sparkles } from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { dueStatus, formatDay } from '@/features/school-posts/lib/postDates';

/** Home-screen summary: the latest homework, news and activity, each opening its tab. */
export function SchoolLifeCard({ childId }: { childId: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-feed', childId],
    queryFn: () => parentWorkspaceApi.getFeed(childId),
  });

  const homework = data?.homework[0];
  const news = data?.news[0];
  const activity = data?.activities[0];

  const rows = [
    {
      tab: 'homework', label: 'Homework', icon: BookOpenCheck, tone: 'bg-indigo-50 text-indigo-700',
      title: homework ? `${homework.subject}: ${homework.title}` : 'No homework yet',
      detail: homework?.dueDate ? dueStatus(homework.dueDate).label : undefined,
    },
    {
      tab: 'news', label: 'News', icon: Megaphone, tone: 'bg-amber-50 text-amber-800',
      title: news?.title ?? data?.events[0]?.title ?? 'No news yet',
      detail: news ? undefined : data?.events[0]?.when,
    },
    {
      tab: 'activities', label: 'Activities', icon: Sparkles, tone: 'bg-emerald-50 text-emerald-700',
      title: activity?.title ?? 'No activities yet',
      detail: activity?.activityDate ? formatDay(activity.activityDate) : undefined,
    },
  ];

  return (
    <section aria-labelledby="school-life-heading" className="bg-white rounded-2xl border border-[#E8E2D6] shadow-sm p-4 sm:p-5">
      <h2 id="school-life-heading" className="text-lg font-bold text-[#1B2A4E] m-0">School Life</h2>

      {isError ? (
        <p className="text-sm text-[#55607A] mt-3 mb-0">Could not load homework and news right now.</p>
      ) : (
        <ul className="mt-3 mb-0 p-0 list-none grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {rows.map(({ tab, label, icon: Icon, tone, title, detail }) => (
            <li key={tab} className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/parent/school?tab=${tab}`)}
                className="w-full h-full flex items-center gap-3 p-3 rounded-xl border border-[#EFEAE0] hover:bg-[#FBF8F3] text-left cursor-pointer"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-[#8A93A8]">{label}</span>
                  <span className="block text-sm font-semibold text-[#1B2A4E] truncate">{isLoading ? 'Loading…' : title}</span>
                  {detail && <span className="block text-xs text-[#55607A]">{detail}</span>}
                </span>
                <ArrowRight className="w-4 h-4 text-[#8A93A8] shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
