import { AlertTriangle, Loader2 } from 'lucide-react';
import { usePendingAcknowledgment, useAcknowledgeMessage } from '../hooks/useInternalMessages';

// Renders a full-screen blocking modal whenever the signed-in user has an
// unacknowledged HIGH priority message from the principal. Nothing else on
// the dashboard is interactable until "Acknowledged" is pressed for every
// pending message — intentionally modal, not a toast, per the spec.
export function HighPriorityMessageGate() {
  const { data: pending } = usePendingAcknowledgment();
  const acknowledge = useAcknowledgeMessage();

  if (!pending || pending.length === 0) return null;

  const message = pending[0];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">High Priority Message</p>
            <p className="text-xs text-gray-400">From {message.senderName}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">{message.subject}</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed mb-6">{message.body}</p>

        {pending.length > 1 && (
          <p className="text-xs text-gray-400 mb-4">
            {pending.length - 1} more high-priority message{pending.length - 1 !== 1 ? 's' : ''} waiting after this one.
          </p>
        )}

        <button
          onClick={() => acknowledge.mutate(message._id)}
          disabled={acknowledge.isPending}
          className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-base font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {acknowledge.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Acknowledged
        </button>
      </div>
    </div>
  );
}
