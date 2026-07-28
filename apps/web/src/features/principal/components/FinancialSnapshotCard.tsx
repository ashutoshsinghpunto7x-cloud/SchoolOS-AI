import { useNavigate } from 'react-router-dom';
import { Wallet, AlertTriangle, FileWarning, PieChart } from 'lucide-react';
import type { FeeCollectionSummary } from '@schoolos/types';
import { useLanguage } from '@/context/LanguageContext';

interface FinancialSnapshotCardProps {
  data?: FeeCollectionSummary;
  isLoading?: boolean;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// One clean card replacing the separate Overdue Fee Payments / Fee Collection
// cards. There's no "collected today" figure in the system yet (fees are
// aggregated cumulatively, not per-day) — Collected/Outstanding/Overdue/Rate
// below are all real, cumulative numbers rather than a fabricated daily one.
export function FinancialSnapshotCard({ data, isLoading }: FinancialSnapshotCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const collectionRate = data && data.totalCharged > 0
    ? Math.round((data.totalCollected / data.totalCharged) * 100)
    : 0;

  const tiles = data
    ? [
        { label: t('financial.collected'), value: formatCurrency(data.totalCollected), icon: Wallet },
        { label: t('financial.outstanding'), value: formatCurrency(data.totalOutstanding), icon: AlertTriangle },
        {
          label: t('financial.overdueRecords'),
          value: String(data.overdueCount),
          danger: data.overdueCount > 0,
          icon: FileWarning,
        },
        { label: t('financial.collectionRate'), value: `${collectionRate}%`, icon: PieChart },
      ]
    : [];

  return (
    <button
      type="button"
      onClick={() => navigate('/fees')}
      className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-[288px] flex flex-col text-left hover:border-[#6D4AFF]/20 transition-colors"
    >
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('financial.title')}</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-4">{t('financial.subtitle')}</p>

      <div className="flex-1 grid grid-cols-2 gap-3 content-center">
        {isLoading || !data ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)
        ) : (
          tiles.map((tile) => (
            <div key={tile.label} className="px-1 flex items-start gap-2.5">
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5 ${
                  tile.danger ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#6D4AFF]/8 text-[#6D4AFF]'
                }`}
              >
                <tile.icon className="w-4 h-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <p className="text-[11px] font-medium text-[#6B7280] truncate">{tile.label}</p>
                <p className={`text-xl font-semibold mt-0.5 truncate ${tile.danger ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                  {tile.value}
                </p>
              </span>
            </div>
          ))
        )}
      </div>
    </button>
  );
}
