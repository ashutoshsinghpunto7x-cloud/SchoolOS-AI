import { Check, Loader2 } from 'lucide-react';
import type { PlanChange } from './plan-assistant.api';
import type { PlanAssistantControls, PlanReply } from './usePlanAssistant';

const VISIBLE_CHANGES = 6;

function dateLabel(key: string): string {
  const monthly = key.length === 7;
  return new Date(`${monthly ? `${key}-01` : key}T00:00:00`).toLocaleDateString(
    undefined,
    monthly ? { month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' },
  );
}

function ChangeRow({ change }: { change: PlanChange }) {
  return (
    <li className="py-1.5 border-t border-[#F1ECE1] first:border-t-0">
      <p className="m-0 text-[11px] font-semibold text-[#7B859D]">
        {dateLabel(change.date)} · {change.label}
      </p>
      <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-[#1B2A4E] break-words whitespace-pre-line">
        {change.before && <span className="line-through text-[#8A93A8] mr-1.5">{change.before}</span>}
        {change.after || <em className="text-[#8A93A8]">removed</em>}
      </p>
    </li>
  );
}

const STATUS_NOTE = {
  applied: 'Saved to the plan',
  cancelled: 'Cancelled, nothing changed',
  replaced: 'Replaced by a newer version',
  failed: 'Not saved',
} as const;

interface PlanReplyCardProps {
  reply: PlanReply;
  controls: PlanAssistantControls;
  /** Whatever the widget does with the reply produced by Apply or Cancel. */
  onFollowUp: (reply: PlanReply) => void;
  onOption: (text: string) => void;
}

export function PlanReplyCard({ reply, controls, onFollowUp, onOption }: PlanReplyCardProps) {
  if (reply.kind === 'text') {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <div className="max-w-[85%] rounded-[16px] rounded-bl-[4px] px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-line bg-white text-[#1B2A4E] border border-[#E8E2D6]">
          {reply.text}
        </div>
        {!!reply.options?.length && (
          <div className="flex flex-wrap gap-1.5">
            {reply.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onOption(option)}
                className="px-3 py-1 rounded-full text-[12px] font-medium bg-white border border-[#E8E2D6] text-[#1B2A4E] hover:bg-[#F5F1E8] transition-colors cursor-pointer text-left"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const status = controls.statuses[reply.id] ?? 'pending';
  const { changes, planLabel } = reply.proposal;
  const rest = changes.slice(VISIBLE_CHANGES);

  return (
    <div className="rounded-2xl bg-white border border-[#E8E2D6] p-3 text-left">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#7B859D]">{planLabel}</p>
      <p className="m-0 mt-1 text-[13px] leading-relaxed text-[#1B2A4E]">{reply.text}</p>

      <ul className="list-none m-0 mt-2 p-0">
        {changes.slice(0, VISIBLE_CHANGES).map((c, i) => (
          <ChangeRow key={`${c.date}-${c.label}-${i}`} change={c} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[12px] font-semibold text-[#254A9A] py-1">
            Show {rest.length} more change{rest.length === 1 ? '' : 's'}
          </summary>
          <ul className="list-none m-0 p-0">
            {rest.map((c, i) => (
              <ChangeRow key={`${c.date}-${c.label}-${i}`} change={c} />
            ))}
          </ul>
        </details>
      )}

      {status === 'pending' || status === 'applying' ? (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={status === 'applying'}
            onClick={async () => {
              const next = await controls.apply(reply.id);
              if (next) onFollowUp(next);
            }}
            className="h-8 px-4 rounded-full bg-[#1B2A4E] text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {status === 'applying' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Apply
          </button>
          <button
            type="button"
            disabled={status === 'applying'}
            onClick={() => {
              const next = controls.cancel(reply.id);
              if (next) onFollowUp(next);
            }}
            className="h-8 px-4 rounded-full border border-[#E8E2D6] bg-white text-[#55607A] text-[12px] font-semibold cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="m-0 mt-2 text-[12px] font-semibold text-[#55607A]">{STATUS_NOTE[status]}</p>
      )}
    </div>
  );
}
