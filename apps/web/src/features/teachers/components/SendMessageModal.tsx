import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useSendMessageToTeachers } from '@/features/notifications/hooks/useNotifications';

interface Props {
  teachers: { _id: string; fullName: string }[];
  onClose: () => void;
}

export function SendMessageModal({ teachers, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const { mutateAsync, isPending, error, data } = useSendMessageToTeachers();
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    await mutateAsync({ teacherIds: teachers.map((t) => t._id), title: title.trim(), message: message.trim() });
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">Message Teachers</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800">Message sent!</p>
            <p className="text-xs text-gray-400 mt-1">
              Delivered to {data?.sent ?? 0} of {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}.
              {!!data?.skipped.length && ' Some teachers have no linked login account and were skipped.'}
            </p>
            <button onClick={onClose} className="mt-5 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Sending to {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}: {teachers.map((t) => t.fullName).join(', ')}
            </p>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Staff meeting reminder"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message…"
                rows={4}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error instanceof Error ? error.message : 'Failed to send'}
              </div>
            )}

            <button
              type="button"
              disabled={!title.trim() || !message.trim() || isPending}
              onClick={handleSend}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isPending ? 'Sending…' : 'Send Message'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
