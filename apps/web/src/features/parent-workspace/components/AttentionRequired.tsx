import { Receipt, CalendarCheck, BookOpen, FileText } from 'lucide-react';
import type { AttentionItem } from '../types';

const ICON = { fee: Receipt, event: CalendarCheck, academic: BookOpen, document: FileText } as const;

interface AttentionRequiredProps {
  items: AttentionItem[];
  onAction: (item: AttentionItem) => void;
}

export function AttentionRequired({ items, onAction }: AttentionRequiredProps) {
  return (
    <section aria-labelledby="attention-heading" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-7 sm:py-7 h-full">
      <h2 id="attention-heading" className="text-lg font-bold text-gray-900">
        Needs Your Attention
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">You're all caught up.</p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100">
          {items.map((item) => {
            const Icon = ICON[item.kind];
            return (
              <li key={item._id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                <span className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-purple-600" strokeWidth={1.75} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base text-gray-900 truncate">{item.title}</span>
                  <span className="block text-sm text-gray-500 truncate">{item.detail}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAction(item)}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors shrink-0"
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
