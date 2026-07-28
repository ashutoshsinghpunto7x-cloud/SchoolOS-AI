import { CheckCircle2 } from 'lucide-react';
import type { AssistantMessage } from '../hooks/usePrincipalAssistant';

type ActionResultMessage = Extract<AssistantMessage, { type: 'action_result' }>;

export const ActionResultCard = ({ message }: { message: ActionResultMessage }) => (
  <div className="max-w-[92%] flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
    <div className="text-sm text-emerald-900">
      <p>{message.summary}</p>
      {typeof message.notifiedCount === 'number' && (
        <p className="text-xs text-emerald-700 mt-0.5">Notified {message.notifiedCount} teacher{message.notifiedCount === 1 ? '' : 's'}.</p>
      )}
    </div>
  </div>
);
