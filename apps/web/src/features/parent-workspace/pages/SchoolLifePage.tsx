import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, CalendarDays, MapPin, Megaphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { PostCard } from '@/features/school-posts/components/PostCard';
import { ACTIVITY_CATEGORY_LABELS, type ActivityCategory } from '@/features/school-posts/types';

const TABS = [
  { id: 'homework', label: 'Homework', icon: BookOpenCheck },
  { id: 'news', label: 'News', icon: Megaphone },
  { id: 'activities', label: 'Activities', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function SchoolLifePage() {
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'homework';
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all');

  const feed = useQuery({
    queryKey: ['parent-feed', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getFeed(activeChild!._id),
    enabled: !!activeChild,
  });

  if (!workspaceLoading && !activeChild) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <EmptyState icon={Sparkles} title="No children linked yet" description="Ask the school office to link your child's profile to this account." />
      </div>
    );
  }

  const data = feed.data;
  const categories = [...new Set((data?.activities ?? []).map((a) => a.category).filter((c): c is ActivityCategory => !!c))];
  // A filter left over from another child may not exist for this one.
  const activeCategory = category !== 'all' && categories.includes(category) ? category : 'all';
  const activities = (data?.activities ?? []).filter((a) => activeCategory === 'all' || a.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <ParentScreenHeader
        title="School Life"
        subtitle={activeChild ? `Homework, news and activities for ${activeChild.name}` : undefined}
        children={workspace?.children}
        activeChild={activeChild}
        onSelectChild={setActiveChildId}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div role="tablist" aria-label="School life" className="grid grid-cols-3 gap-1 p-1 bg-white border border-[#E8E2D6] rounded-2xl">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setParams({ tab: id }, { replace: true })}
              className={cn(
                'h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer',
                tab === id ? 'bg-[#1B2A4E] text-white' : 'text-[#55607A] hover:bg-[#FBF8F3]'
              )}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {(workspaceLoading || feed.isLoading) && <div className="h-40 rounded-2xl bg-[#F1ECE2] animate-pulse" aria-busy="true" />}
        {feed.isError && (
          <p role="alert" className="text-sm text-[#55607A] text-center py-8">Could not load this page. Please try again shortly.</p>
        )}

        {data && tab === 'homework' && (
          data.homework.length === 0
            ? <EmptyState icon={BookOpenCheck} title="No homework yet" description="Homework posted by your child's teachers will appear here." className="py-14" />
            : data.homework.map((p) => <PostCard key={p._id} post={p} />)
        )}

        {data && tab === 'news' && (
          <>
            {data.events.length > 0 && (
              <section aria-labelledby="coming-up" className="bg-white rounded-2xl border border-[#E8E2D6] shadow-xs p-4 sm:p-5">
                <h2 id="coming-up" className="text-base font-bold text-[#1B2A4E] m-0 mb-2">Coming up</h2>
                <ul className="divide-y divide-[#EFEAE0] m-0 p-0 list-none">
                  {data.events.map((e) => (
                    <li key={e._id} className="flex items-start gap-3 py-2.5 last:pb-0">
                      <span className="w-9 h-9 rounded-full bg-[#EEF1F8] flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-[#254A9A]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1B2A4E]">{e.title}</span>
                        <span className="flex items-center gap-1.5 flex-wrap text-xs text-[#55607A] mt-0.5">
                          {e.when}
                          {e.location && (<><span aria-hidden="true">·</span><MapPin className="w-3 h-3" aria-hidden="true" />{e.location}</>)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {data.news.map((p) => <PostCard key={p._id} post={p} />)}
            {data.news.length === 0 && data.events.length === 0 && (
              <EmptyState icon={Megaphone} title="No news yet" description="School announcements will appear here." className="py-14" />
            )}
          </>
        )}

        {data && tab === 'activities' && (
          <>
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter activities">
                {(['all', ...categories] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={activeCategory === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'h-9 px-3.5 shrink-0 rounded-full text-sm font-semibold border cursor-pointer',
                      activeCategory === c ? 'bg-[#254A9A] border-[#254A9A] text-white' : 'bg-white border-[#E8E2D6] text-[#55607A]'
                    )}
                  >
                    {c === 'all' ? 'All' : ACTIVITY_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            )}
            {activities.length === 0
              ? <EmptyState icon={Sparkles} title="No activities yet" description="Class and school activities will appear here." className="py-14" />
              : activities.map((p) => <PostCard key={p._id} post={p} />)}
          </>
        )}
      </main>
    </div>
  );
}

export default SchoolLifePage;
