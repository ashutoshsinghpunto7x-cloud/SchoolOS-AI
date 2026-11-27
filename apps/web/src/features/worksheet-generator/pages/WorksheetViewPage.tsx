import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { useWorksheet, useDeleteWorksheet, useUpdateWorksheet } from '../hooks/useWorksheetGenerator';
import { PrintPortal } from '@/components/exam-paper/PrintPortal';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { WorksheetDocument } from '../components/WorksheetDocument';
import type { QuestionDifficulty } from '@schoolos/types';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EditableQuestion { questionText: string; difficulty: QuestionDifficulty; estimatedTimeMinutes: number }

export function WorksheetViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);

  const { data: worksheet, isLoading } = useWorksheet(id);
  const { data: schoolSettings } = useSchoolSettings();
  const deleteWorksheet = useDeleteWorksheet();
  const updateWorksheet = useUpdateWorksheet(id);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editQuestions, setEditQuestions] = useState<EditableQuestion[]>([]);

  function startEdit() {
    if (!worksheet) return;
    setEditTitle(worksheet.title);
    setEditQuestions(worksheet.questions.map((q) => ({ questionText: q.questionText, difficulty: q.difficulty, estimatedTimeMinutes: q.estimatedTimeMinutes })));
    setEditing(true);
  }

  async function handleSaveEdit() {
    try {
      await updateWorksheet.mutateAsync({ title: editTitle, questions: editQuestions });
      toast.success('Worksheet updated');
      setEditing(false);
    } catch (err) {
      toast.error('Could not save changes', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleDelete() {
    try {
      await deleteWorksheet.mutateAsync(id);
      toast.success('Worksheet deleted');
      navigate(-1);
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (isLoading || !worksheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        <Loader2 className="w-6 h-6 text-[#254A9A] animate-spin" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] dark:bg-transparent pb-24">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3">
          <button onClick={() => setEditing(false)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
            <X className="w-4 h-4" /> Cancel
          </button>
          <p className="flex-1 text-sm font-bold text-gray-900">Edit Worksheet</p>
          <button
            type="button" onClick={handleSaveEdit} disabled={updateWorksheet.isPending}
            className="h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            {updateWorksheet.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">
          <input
            value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm font-semibold"
          />
          {editQuestions.map((q, i) => (
            <div key={i} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-gray-400">Q{i + 1}</p>
              <textarea
                value={q.questionText}
                onChange={(e) => setEditQuestions((prev) => prev.map((p, pi) => (pi === i ? { ...p, questionText: e.target.value } : p)))}
                rows={2} className="w-full text-sm text-gray-800 dark:text-white/80 border border-gray-200 dark:border-white/10 dark:bg-transparent rounded-lg p-2 resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={q.difficulty}
                  onChange={(e) => setEditQuestions((prev) => prev.map((p, pi) => (pi === i ? { ...p, difficulty: e.target.value as QuestionDifficulty } : p)))}
                  className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{labelize(d)}</option>)}
                </select>
                <input
                  type="number" min={0} value={q.estimatedTimeMinutes}
                  onChange={(e) => setEditQuestions((prev) => prev.map((p, pi) => (pi === i ? { ...p, estimatedTimeMinutes: Number(e.target.value) || 0 } : p)))}
                  placeholder="Minutes" className="h-8 w-24 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                />
                <span className="text-[11px] text-gray-400">minute(s)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const worksheetDocument = <WorksheetDocument worksheet={worksheet} schoolSettings={schoolSettings} />;

  return (
    <div className="min-h-screen bg-[#F0F1F5] dark:bg-transparent">
      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="flex-1 min-w-0 truncate text-sm font-bold text-gray-900">{worksheet.title}</p>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{labelize(worksheet.worksheetType)}</span>
        <button type="button" onClick={startEdit} className="h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button type="button" onClick={() => setPrinting(true)} className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button type="button" onClick={handleDelete} disabled={deleteWorksheet.isPending} className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="py-8 overflow-x-auto">
        <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>{worksheetDocument}</div>
      </div>

      {printing && (
        <PrintPortal onDone={() => setPrinting(false)}>{worksheetDocument}</PrintPortal>
      )}
    </div>
  );
}
