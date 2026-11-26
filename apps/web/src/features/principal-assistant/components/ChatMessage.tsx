import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../hooks/usePrincipalAssistant';
import { ActionPreviewCard } from './ActionPreviewCard';
import { ActionResultCard } from './ActionResultCard';
import { SubstitutionPlan } from '@/features/timetable/components/SubstitutionPlan';

interface ChatMessageProps {
  message: AssistantMessage;
  onEditField?: (messageId: string, key: string, value: unknown) => void;
  onApprove?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
  onQuickReply?: (text: string) => void;
}

export const ChatMessage = ({ message, onEditField, onApprove, onCancel, onQuickReply }: ChatMessageProps) => {
  if (message.type === 'action_preview') {
    return (
      <div className="flex justify-start">
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
      <div className="flex justify-start">
        <ActionResultCard message={message} />
      </div>
    );
  }

  if (message.type === 'substitution_plan') {
    return (
      <div className="flex flex-col gap-1.5 items-stretch">
        <div className="self-start max-w-[85%] rounded-[16px] rounded-bl-[4px] px-3.5 py-2 text-[13px] leading-relaxed bg-white text-[#1B2A4E] border border-[#E8E2D6]">
          {message.content}
        </div>
        <SubstitutionPlan date={message.date} hideWhenEmpty />
      </div>
    );
  }

  const isUser = message.role === 'user';
  const quickReplies = !isUser ? message.quickReplies : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[16px] px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-line',
          isUser
            ? 'bg-[#1B2A4E] text-white rounded-br-[4px]'
            : 'bg-white text-[#1B2A4E] border border-[#E8E2D6] rounded-bl-[4px]',
        )}
      >
        {message.content}
      </div>
      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onQuickReply?.(reply)}
              className="px-3 py-1 rounded-full text-[12px] font-medium bg-white border border-[#E8E2D6] text-[#1B2A4E] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
