import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useGenerateLessonPlan, useSaveLessonPlan } from '../hooks/useLessonPlanner';
import type { LessonPlanContent } from '@schoolos/types';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm';
const labelCls = 'text-xs font-semibold uppercase tracking-wide text-gray-400';

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={labelCls}>{label}</span>
        <button type="button" onClick={() => onChange([...items, ''])} className="text-xs font-semibold text-[#6D4AFF] flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
              className={inputCls}
            />
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonPlanGeneratePage() {
  const { cls = '', subject = '' } = useParams();
  const [searchParams] = useSearchParams();
  const chapterName = searchParams.get('chapterName') ?? '';
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [content, setContent] = useState<LessonPlanContent | null>(null);

  const generate = useGenerateLessonPlan();
  const save = useSaveLessonPlan();

  async function handleGenerate() {
    try {
      const result = await generate.mutateAsync({ class: cls, subject, chapterName, topic: topic || undefined, durationMinutes });
      setContent(result);
    } catch (err) {
      toast.error('Could not generate the lesson plan', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateField<K extends keyof LessonPlanContent>(key: K, value: LessonPlanContent[K]) {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!content) return;
    try {
      const plan = await save.mutateAsync({ class: cls, subject, chapterName, topic: topic || undefined, durationMinutes, ...content });
      toast.success('Lesson plan saved');
      navigate(`/teacher/lesson-planner/plan/${plan._id}`);
    } catch (err) {
      toast.error('Could not save the lesson plan', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">{chapterName} — Class {cls} {subject}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Topic (optional)</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis" className={`${inputCls} mt-1`} />
          </div>
          <div className="w-32">
            <label className={labelCls}>Minutes</label>
            <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={`${inputCls} mt-1`} />
          </div>
        </div>

        <button
          type="button" onClick={handleGenerate} disabled={generate.isPending}
          className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {content ? 'Regenerate' : 'Generate Lesson Plan'}
        </button>

        {content && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Learning Objective</label>
              <textarea value={content.objective} onChange={(e) => updateField('objective', e.target.value)} rows={2} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Introduction</label>
              <textarea value={content.introduction} onChange={(e) => updateField('introduction', e.target.value)} rows={2} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Explanation</label>
              <textarea value={content.explanation} onChange={(e) => updateField('explanation', e.target.value)} rows={4} className={`${inputCls} mt-1`} />
            </div>
            <ListEditor label="Activities" items={content.activities} onChange={(v) => updateField('activities', v)} />
            <ListEditor label="Examples" items={content.examples} onChange={(v) => updateField('examples', v)} />
            <ListEditor label="Questions" items={content.questions} onChange={(v) => updateField('questions', v)} />
            <div>
              <label className={labelCls}>Homework</label>
              <textarea value={content.homework} onChange={(e) => updateField('homework', e.target.value)} rows={2} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Assessment</label>
              <textarea value={content.assessment} onChange={(e) => updateField('assessment', e.target.value)} rows={2} className={`${inputCls} mt-1`} />
            </div>

            <button
              type="button" onClick={handleSave} disabled={save.isPending}
              className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Lesson Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
