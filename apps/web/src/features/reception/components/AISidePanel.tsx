// ── Suggestion chip ──────────────────────────────────────────────────────────

const SuggestionChip = ({ label }: { label: string }) => (
  <button
    type="button"
    className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-gray-700
               bg-gray-50 hover:bg-[var(--brand-purple-light)]/5 hover:text-[var(--brand-purple-dark)]
               border border-gray-100 hover:border-[var(--brand-purple-light)]/25
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
        <h3 className="text-base font-bold text-gray-900 leading-tight">AI Assistant</h3>
        <p className="text-xs text-gray-400">Ask anything about your school</p>
      </div>

      {/* Suggestions */}
      <div className="px-4 py-4">
        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
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
          className="w-full h-12 rounded-xl bg-[var(--brand-purple-dark)] hover:bg-[var(--brand-purple-hover)] active:bg-[var(--brand-purple-active)]
                     flex items-center justify-center
                     text-sm font-semibold text-white
                     transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple-light)]/50 focus-visible:ring-offset-2"
        >
          Ask AI
        </button>
      </div>
    </div>
  );
};
