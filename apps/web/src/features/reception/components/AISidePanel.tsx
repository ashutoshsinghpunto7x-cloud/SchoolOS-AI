// ── Suggestion chip ──────────────────────────────────────────────────────────

const SuggestionChip = ({ label }: { label: string }) => (
  <button
    type="button"
    className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#1B2A4E]
               bg-[#FBF8F3] hover:bg-[#EEF1F8] hover:text-[#254A9A]
               border border-[#E8E2D6] hover:border-[#254A9A]/25
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
    <div className="bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs overflow-hidden font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#E8E2D6]/60">
        <h3 className="text-base font-bold text-[#1B2A4E] leading-tight">AI Assistant</h3>
        <p className="text-xs text-[#55607A]">Ask anything about your school</p>
      </div>

      {/* Suggestions */}
      <div className="px-4 py-4">
        <span className="block text-xs font-semibold text-[#55607A] uppercase tracking-wide mb-3">
          Quick asks
        </span>
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
          className="w-full h-12 rounded-xl bg-[#1B2A4E] hover:bg-[#2C4177] active:bg-[#15223E]
                     flex items-center justify-center
                     text-sm font-semibold text-white
                     transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B2A4E]/50 focus-visible:ring-offset-2"
        >
          Ask AI
        </button>
      </div>
    </div>
  );
};
