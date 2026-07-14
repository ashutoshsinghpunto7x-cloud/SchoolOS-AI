import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';

// ── Suggestion chip ──────────────────────────────────────────────────────────

const SuggestionChip = ({ label }: { label: string }) => (
  <button
    type="button"
    className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-gray-700
               bg-gray-50 hover:bg-[#A855F7]/5 hover:text-[#5B21B6]
               border border-gray-100 hover:border-[#A855F7]/25
               transition-colors duration-150 font-medium"
  >
    {label}
  </button>
);

// ── AISidePanel ──────────────────────────────────────────────────────────────

export const AISidePanel = () => {
  const suggestions = [
    "Who hasn't paid fees this month?",
    "Schedule follow-up for Class 5",
    "Draft admission message for WhatsApp",
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#A855F7]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#5B21B6]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">AI Assistant</h3>
            <p className="text-xs text-gray-400">Ask anything about your school</p>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Quick asks
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <SuggestionChip key={s} label={s} />
          ))}
        </div>
      </div>

      {/* Ask button */}
      <div className="px-4 pb-5">
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3f1a94]
                     flex items-center justify-center gap-2
                     text-sm font-semibold text-white
                     transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/50 focus-visible:ring-offset-2"
        >
          Ask AI
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
