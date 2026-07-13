import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../hooks/usePrincipalAssistant';

interface ChatMessageProps {
  message: AssistantMessage;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
        </div>
      )}
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
