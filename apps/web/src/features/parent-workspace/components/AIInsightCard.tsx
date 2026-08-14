import { Sparkle } from 'lucide-react';
import type { AIInsight } from '../types';

interface AIInsightCardProps {
  insight: AIInsight;
  childName: string;
  onAsk: () => void;
}

export function AIInsightCard({ insight, childName, onAsk }: AIInsightCardProps) {
  return (
    <section
      aria-labelledby="ai-heading"
      className="rounded-2xl border border-[#E7E4DE] px-6 py-6 sm:px-7 sm:py-7 bg-[#0D0D0D]"
    >
      <div className="flex items-center gap-2">
        <Sparkle className="w-4 h-4 text-[#F5F1EB]" strokeWidth={1.75} />
        <h2 id="ai-heading" className="text-base font-medium text-[#F5F1EB]">
          SchoolOS AI
        </h2>
      </div>

      <p className="text-lg leading-relaxed text-white mt-4">{insight.headline}</p>
      <p className="text-base leading-relaxed text-white/60 mt-2">{insight.recommendation}</p>

      <button
        type="button"
        onClick={onAsk}
        className="text-sm font-medium text-white hover:opacity-70 transition-opacity mt-6 inline-flex items-center gap-1"
      >
        Ask about {childName.split(' ')[0]} →
      </button>
    </section>
  );
}
