import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus, Loader2, Newspaper, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { schoolPostsApi } from '../api/school-posts.api';
import { shrinkPhoto } from '../lib/shrinkPhoto';
import { KIND_STYLE, PostCard } from '../components/PostCard';
import {
  ACTIVITY_CATEGORY_LABELS,
  MAX_POST_PHOTOS,
  type ActivityCategory,
  type PostClass,
  type PostTargets,
  type SchoolPost,
  type SchoolPostKind,
} from '../types';

const field =
  'w-full h-11 px-3 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#1B2A4E] outline-none focus:border-[#254A9A] focus:ring-2 focus:ring-[#254A9A]/15';
const labelCls = 'block text-sm font-semibold text-[#1B2A4E] mb-1.5';
const keyOf = (c: PostClass) => `${c.class}|${c.section}`;

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Photo {
  blob: Blob;
  preview: string;
}

function PostForm({ targets }: { targets: PostTargets }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<SchoolPostKind>(targets.kinds[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wholeSchool, setWholeSchool] = useState(targets.canPostSchoolWide);
  const [selected, setSelected] = useState<string[]>([]);
  const [homeworkClass, setHomeworkClass] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('academic');
  const [activityDate, setActivityDate] = useState(todayIso);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [formError, setFormError] = useState('');
  const [posted, setPosted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  // Homework needs a subject, so only classes where the teacher teaches one qualify.
  const homeworkClasses = useMemo(() => targets.classes.filter((c) => c.subjects.length > 0), [targets]);
  const chosenHomeworkClass = homeworkClasses.find((c) => keyOf(c) === homeworkClass);

  const create = useMutation({
    mutationFn: schoolPostsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['school-posts'] });
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setTitle('');
      setDescription('');
      setPosted(true);
    },
  });

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setFormError('');
    const room = MAX_POST_PHOTOS - photos.length;
    if (files.length > room) setFormError(`You can add up to ${MAX_POST_PHOTOS} photos.`);
    try {
      const added = await Promise.all(
        [...files].slice(0, room).map(async (file) => {
          const blob = await shrinkPhoto(file);
          return { blob, preview: URL.createObjectURL(blob) };
        })
      );
      setPhotos((current) => [...current, ...added]);
    } catch (err) {
      setFormError((err as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPosted(false);
    setFormError('');
    const classes =
      kind === 'homework'
        ? chosenHomeworkClass
          ? [chosenHomeworkClass]
          : []
        : wholeSchool
          ? []
          : targets.classes.filter((c) => selected.includes(keyOf(c)));

    if (title.trim().length < 3) return setFormError('Add a title of at least 3 characters.');
    if (kind === 'homework' && (!chosenHomeworkClass || !subject || !dueDate)) {
      return setFormError('Choose the class, subject and due date.');
    }
    if (kind !== 'homework' && !wholeSchool && classes.length === 0) return setFormError('Choose at least one class.');
    if (kind === 'activity' && !activityDate) return setFormError('Choose the activity date.');

    create.mutate({
      kind,
      title: title.trim(),
      description: description.trim(),
      classes: classes.map((c) => ({ class: c.class, section: c.section })),
      subject: kind === 'homework' ? subject : undefined,
      dueDate: kind === 'homework' ? dueDate : undefined,
      category: kind === 'activity' ? category : undefined,
      activityDate: kind === 'activity' ? activityDate : undefined,
      photos: photos.map((p) => p.blob),
    });
  };

  const error = formError || (create.error as Error | null)?.message;

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-[#E8E2D6] shadow-xs p-4 sm:p-6 space-y-4">
      <div role="tablist" aria-label="Type of post" className="flex gap-2">
        {targets.kinds.map((k) => {
          const { icon: Icon, label } = KIND_STYLE[k];
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => { setKind(k); setPosted(false); setFormError(''); create.reset(); }}
              className={cn(
                'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border cursor-pointer',
                kind === k ? 'bg-[#1B2A4E] border-[#1B2A4E] text-white' : 'bg-white border-[#E8E2D6] text-[#55607A] hover:bg-[#FBF8F3]'
              )}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {kind === 'homework' && (
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="post-class" className={labelCls}>Class</label>
            <select id="post-class" className={field} value={homeworkClass} onChange={(e) => { setHomeworkClass(e.target.value); setSubject(''); }}>
              <option value="">Choose class</option>
              {homeworkClasses.map((c) => <option key={keyOf(c)} value={keyOf(c)}>{c.class}-{c.section}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="post-subject" className={labelCls}>Subject</label>
            <select id="post-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!chosenHomeworkClass}>
              <option value="">Choose subject</option>
              {chosenHomeworkClass?.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="post-due" className={labelCls}>Due date</label>
            <input id="post-due" type="date" className={field} min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      )}

      {kind === 'activity' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="post-category" className={labelCls}>Type of activity</label>
            <select id="post-category" className={field} value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
              {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="post-date" className={labelCls}>Date of activity</label>
            <input id="post-date" type="date" className={field} value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="post-title" className={labelCls}>Title</label>
        <input
          id="post-title"
          className={field}
          maxLength={200}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setPosted(false); }}
          placeholder={kind === 'homework' ? 'e.g. Exercise 4.2, questions 1 to 8' : kind === 'news' ? 'e.g. Winter timings from Monday' : 'e.g. Inter-house science exhibition'}
        />
      </div>

      <div>
        <label htmlFor="post-details" className={labelCls}>Details <span className="font-normal text-[#8A93A8]">(optional)</span></label>
        <textarea
          id="post-details"
          className={cn(field, 'h-auto py-2.5 resize-y')}
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {kind !== 'homework' && (
        <fieldset>
          <legend className={labelCls}>Who should see it</legend>
          <div className="flex flex-wrap gap-2">
            {targets.canPostSchoolWide && (
              <button
                type="button"
                aria-pressed={wholeSchool}
                onClick={() => { setWholeSchool(true); setSelected([]); }}
                className={cn('h-9 px-3.5 rounded-full text-sm font-semibold border cursor-pointer', wholeSchool ? 'bg-[#254A9A] border-[#254A9A] text-white' : 'bg-white border-[#E8E2D6] text-[#55607A]')}
              >
                Whole school
              </button>
            )}
            {targets.classes.map((c) => {
              const on = !wholeSchool && selected.includes(keyOf(c));
              return (
                <button
                  key={keyOf(c)}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setWholeSchool(false);
                    setSelected((s) => (s.includes(keyOf(c)) ? s.filter((k) => k !== keyOf(c)) : [...s, keyOf(c)]));
                  }}
                  className={cn('h-9 px-3.5 rounded-full text-sm font-semibold border cursor-pointer', on ? 'bg-[#254A9A] border-[#254A9A] text-white' : 'bg-white border-[#E8E2D6] text-[#55607A]')}
                >
                  {c.class}-{c.section}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <span className={labelCls}>Photos <span className="font-normal text-[#8A93A8]">(up to {MAX_POST_PHOTOS})</span></span>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E8E2D6]">
              <img src={p.preview} alt={`Selected photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => { URL.revokeObjectURL(p.preview); setPhotos((all) => all.filter((x) => x !== p)); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX_POST_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#D9D1C0] text-[#55607A] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold hover:bg-[#FBF8F3] cursor-pointer"
            >
              <ImagePlus className="w-5 h-5" aria-hidden="true" />
              Add
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files)} />
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-600 m-0">{error}</p>}
      {posted && (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700 m-0">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Posted. Parents can see it now.
        </p>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#1B2A4E] hover:bg-[#254A9A] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
      >
        {create.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {create.isPending ? 'Posting…' : 'Post to parents'}
      </button>
    </form>
  );
}

/** Where staff post homework, school news and activities that parents see. */
export function SchoolPostsPage() {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<SchoolPost | null>(null);
  const targets = useQuery({ queryKey: ['school-posts', 'targets'], queryFn: schoolPostsApi.getTargets });
  const posts = useQuery({ queryKey: ['school-posts', 'list'], queryFn: () => schoolPostsApi.list() });

  const remove = useMutation({
    mutationFn: (id: string) => schoolPostsApi.remove(id),
    onSuccess: () => {
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['school-posts'] });
    },
  });

  const canPostHomework = targets.data?.kinds.includes('homework');
  const noClasses = targets.data && !targets.data.canPostSchoolWide && targets.data.classes.length === 0;

  return (
    <div className="flex-1 w-full font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1B2A4E] tracking-tight m-0">
            {canPostHomework ? 'Homework & Activities' : 'School News & Activities'}
          </h1>
          <p className="text-sm sm:text-base text-[#55607A] mt-1 mb-0">What you post here appears on the parent dashboard right away.</p>
        </div>

        {targets.isLoading && <div className="h-72 rounded-2xl bg-[#F1ECE2] animate-pulse" aria-busy="true" />}
        {targets.error && <p role="alert" className="text-sm font-medium text-red-600">{(targets.error as Error).message}</p>}
        {noClasses && <EmptyState icon={Newspaper} title="No classes yet" description="Ask the office to add you to a class timetable, then you can post for it." className="py-10" />}
        {targets.data && !noClasses && <PostForm targets={targets.data} />}

        <section aria-labelledby="posted-heading" className="space-y-3">
          <h2 id="posted-heading" className="text-lg font-bold text-[#1B2A4E] m-0">Posted</h2>
          {posts.isLoading && <div className="h-28 rounded-2xl bg-[#F1ECE2] animate-pulse" aria-busy="true" />}
          {posts.error && <p role="alert" className="text-sm font-medium text-red-600">{(posts.error as Error).message}</p>}
          {posts.data?.length === 0 && <p className="text-sm text-[#55607A]">Nothing posted yet.</p>}
          {posts.data?.map((p) => <PostCard key={p._id} post={p} showAudience onDelete={() => setToDelete(p)} />)}
        </section>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete this post?"
          description={`Parents will no longer see "${toDelete.title}".`}
          confirmLabel="Delete"
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(toDelete._id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
