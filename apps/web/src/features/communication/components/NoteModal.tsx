import { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteModalProps {
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}

export const NoteModal = ({ onClose, onSave }: NoteModalProps) => {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!note.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await onSave(note.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <h2 className="flex-1 text-base font-bold text-gray-900">Add Note</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Textarea */}
        <div className="px-6 py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder="Write your note here…"
            autoFocus
            className={cn(
              'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50',
              'text-sm text-gray-800 leading-relaxed resize-none',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400',
              'placeholder:text-gray-400 transition-colors'
            )}
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !note.trim()}
            className={cn(
              'flex-1 h-12 rounded-xl flex items-center justify-center gap-2',
              'text-sm font-bold text-white transition-colors',
              'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Note'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
