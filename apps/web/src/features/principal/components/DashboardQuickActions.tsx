import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import type { PrincipalTranslationKey } from '@/i18n/principalTranslations';

// Six real, existing routes — capped per the daily-glance design brief.
// No icons here by design; typography, spacing, and hover state carry the UI.
const ACTIONS: { labelKey: PrincipalTranslationKey; path: string }[] = [
  { labelKey: 'quick.attendance', path: '/attendance' },
  { labelKey: 'quick.admissions', path: '/enquiries' },
  { labelKey: 'quick.feeCollection', path: '/fees' },
  { labelKey: 'quick.teachers', path: '/principal/teachers-summary' },
  { labelKey: 'quick.editRequests', path: '/principal/approvals' },
  { labelKey: 'quick.moreInsights', path: '/principal/insights' },
];

export function DashboardQuickActions() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight mb-4">{t('quick.title')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {ACTIONS.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            type="button"
            className="px-4 py-3 rounded-xl border border-black/[0.06] text-sm font-medium text-[#374151] text-left hover:border-[#6D4AFF]/25 hover:bg-[#6D4AFF]/[0.04] hover:text-[#6D4AFF] transition-colors duration-150"
          >
            {t(action.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
