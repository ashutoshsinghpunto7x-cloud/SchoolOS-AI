import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../hooks/usePrincipalAssistant';
import { ActionPreviewCard } from './ActionPreviewCard';
import { ActionResultCard } from './ActionResultCard';

interface ChatMessageProps {
  message: AssistantMessage;
  onEditField?: (messageId: string, key: string, value: unknown) => void;
  onApprove?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}

const AssistantAvatar = () => (
  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
  </div>
);

export const ChatMessage = ({ message, onEditField, onApprove, onCancel }: ChatMessageProps) => {
  if (message.type === 'action_preview') {
    return (
      <div className="flex gap-2.5 justify-start">
        <AssistantAvatar />
        <ActionPreviewCard
          message={message}
          onEditField={onEditField ?? (() => {})}
          onApprove={onApprove ?? (() => {})}
          onCancel={onCancel ?? (() => {})}
        />
      </div>
    );
  }

  if (message.type === 'action_result') {
    return (
      <div className="flex gap-2.5 justify-start">
        <AssistantAvatar />
        <ActionResultCard message={message} />
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <AssistantAvatar />}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
        )}
      >
        {message.content}
      </div>
    </div>
  );
};
