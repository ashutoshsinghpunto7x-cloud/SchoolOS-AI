import { BookOpenCheck, Megaphone, Sparkles, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_CATEGORY_LABELS, type SchoolPost, type SchoolPostKind } from '../types';
import { dueStatus, formatDay } from '../lib/postDates';
import { PostPhotos } from './PostPhotos';

export const KIND_STYLE: Record<SchoolPostKind, { label: string; icon: LucideIcon; chip: string }> = {
  homework: { label: 'Homework', icon: BookOpenCheck, chip: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  news:     { label: 'News', icon: Megaphone, chip: 'bg-amber-50 text-amber-900 border-amber-200' },
  activity: { label: 'Activity', icon: Sparkles, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const DUE_TONE = {
  soon: 'bg-amber-100 text-amber-900',
  later: 'bg-[#EEF1F8] text-[#254A9A]',
  past: 'bg-gray-100 text-gray-500',
};

const audience = (post: SchoolPost): string =>
  post.classes.length === 0 ? 'Whole school' : post.classes.map((c) => `${c.class}-${c.section}`).join(', ');

interface PostCardProps {
  post: SchoolPost;
  /** Staff list shows who the post went to; parents don't need it. */
  showAudience?: boolean;
  onDelete?: () => void;
}

export function PostCard({ post, showAudience = false, onDelete }: PostCardProps) {
  const { label, icon: Icon, chip } = KIND_STYLE[post.kind];
  const due = post.kind === 'homework' && post.dueDate ? dueStatus(post.dueDate) : null;
  const posted = new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <article className="bg-white rounded-2xl border border-[#E8E2D6] shadow-xs p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border', chip)}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {post.kind === 'homework' ? post.subject : post.kind === 'activity' && post.category ? ACTIVITY_CATEGORY_LABELS[post.category] : label}
          </span>
          {due && <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', DUE_TONE[due.tone])}>{due.label}</span>}
          {post.activityDate && <span className="text-xs font-semibold text-[#55607A]">{formatDay(post.activityDate)}</span>}
        </div>
        {onDelete && post.canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${post.title}`}
            className="w-9 h-9 -mt-1.5 -mr-1.5 shrink-0 rounded-lg flex items-center justify-center text-[#8A93A8] hover:text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#1B2A4E] mt-2.5 mb-0">{post.title}</h3>
      {post.description && <p className="text-sm text-[#55607A] mt-1 mb-0 whitespace-pre-line">{post.description}</p>}

      <PostPhotos postId={post._id} photoIds={post.photoIds} title={post.title} />

      <p className="text-xs text-[#8A93A8] mt-3 mb-0">
        {post.createdByName} · {posted}
        {showAudience && ` · ${audience(post)}`}
      </p>
    </article>
  );
}
