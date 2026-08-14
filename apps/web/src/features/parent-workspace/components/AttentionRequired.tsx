import { Receipt, CalendarCheck, BookOpen, FileText } from 'lucide-react';
import type { AttentionItem } from '../types';

const ICON = { fee: Receipt, event: CalendarCheck, academic: BookOpen, document: FileText } as const;

interface AttentionRequiredProps {
  items: AttentionItem[];
  onAction: (item: AttentionItem) => void;
}

export function AttentionRequired({ items, onAction }: AttentionRequiredProps) {
  return (
    <section aria-labelledby="attention-heading" className="bg-white rounded-2xl border border-[#E7E4DE] px-6 py-6 sm:px-7 sm:py-7">
      <h2 id="attention-heading" className="text-base font-medium text-[#0D0D0D]">
        Needs Your Attention
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-[#6B6B6B] mt-4">You're all caught up.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#E7E4DE]">
          {items.map((item) => {
            const Icon = ICON[item.kind];
            return (
              <li key={item._id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                <span className="w-9 h-9 rounded-full bg-[#F5F1EB] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.75} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base text-[#0D0D0D] truncate">{item.title}</span>
                  <span className="block text-sm text-[#6B6B6B] truncate">{item.detail}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAction(item)}
                  className="text-sm font-medium text-[#A6752F] hover:opacity-70 transition-opacity shrink-0"
                >
                  {item.actionLabel} →
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
