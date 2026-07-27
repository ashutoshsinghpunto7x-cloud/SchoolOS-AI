import { cn } from '@/lib/utils';
import type { Language } from '@/i18n/principalTranslations';

// Two-way segmented toggle — simpler than a sliding pill since both labels
// need to stay legible (English text vs Devanagari script).
export function LanguageTogglePill({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5">
      <button
        type="button"
        onClick={() => onChange('en')}
        className={cn(
          'h-8 px-3.5 rounded-full text-xs font-semibold transition-colors',
          language === 'en' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
        )}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onChange('hi')}
        className={cn(
          'h-8 px-3.5 rounded-full text-xs font-semibold transition-colors',
          language === 'hi' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
        )}
      >
        हिन्दी
      </button>
    </div>
  );
}
