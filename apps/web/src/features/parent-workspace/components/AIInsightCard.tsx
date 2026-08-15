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
      className="rounded-2xl px-5 py-5 sm:px-7 sm:py-7 bg-gradient-to-br from-[#5B21B6] to-[#7C3AED] shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Sparkle className="w-4 h-4 text-white" strokeWidth={1.75} />
        <h2 id="ai-heading" className="text-base font-bold text-white">
          SchoolOS AI
        </h2>
      </div>

      <p className="text-lg leading-relaxed text-white mt-4">{insight.headline}</p>
      <p className="text-base leading-relaxed text-white/70 mt-2">{insight.recommendation}</p>

      <button
        type="button"
        onClick={onAsk}
        className="text-sm font-semibold text-white hover:text-white/80 transition-colors mt-6 inline-flex items-center gap-1"
      >
        Ask about {childName.split(' ')[0]} →
      </button>
    </section>
  );
}
