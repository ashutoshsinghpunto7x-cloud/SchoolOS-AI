import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PrincipalAdmissionStats } from '@schoolos/types';
import { useLanguage } from '@/context/LanguageContext';
import { useEnquiries } from '@/features/enquiries/hooks/useEnquiries';

interface AdmissionAssistantCardProps {
  data?: PrincipalAdmissionStats;
  isLoading?: boolean;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Descriptive-only admission funnel assistant — today's enquiries, pending
// follow-ups, and documents-pending all reuse the existing GET /enquiries
// endpoint with query filters (today's-enquiries needed one small additive
// createdAfter/createdBefore filter on that endpoint); admission status /
// completed-this-month reuse data.admissions already in usePrincipalDashboard().
export function AdmissionAssistantCard({ data, isLoading }: AdmissionAssistantCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const today = useMemo(() => todayString(), []);

  const { data: todaysEnquiries, isLoading: todaysLoading } = useEnquiries({ createdAfter: today, limit: 5 });
  const { data: followUps, isLoading: followUpsLoading } = useEnquiries({
    followUpBefore: today,
    limit: 20,
    sortBy: 'followUpDate',
    sortOrder: 'asc',
  });
  const { data: docsPending, isLoading: docsLoading } = useEnquiries({ stage: 'documents_pending', limit: 5 });

  const pendingFollowUpCount = (followUps?.data ?? []).filter(
    (e) => e.stage !== 'converted' && e.stage !== 'lost',
  ).length;

  const loading = isLoading || todaysLoading || followUpsLoading || docsLoading;

  const tiles = [
    { label: t('admissionAssistant.todaysEnquiries'), value: todaysEnquiries?.meta.total ?? 0 },
    { label: t('admissionAssistant.pendingFollowUps'), value: pendingFollowUpCount },
    { label: t('admissionAssistant.documentsPending'), value: docsPending?.meta.total ?? 0 },
    { label: t('admissionAssistant.completedThisMonth'), value: data?.convertedThisMonth ?? 0 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('admissionAssistant.title')}</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-3">{t('admissionAssistant.subtitle')}</p>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={() => navigate('/enquiries')}
              className="flex flex-col items-start px-2.5 py-2 rounded-xl hover:bg-black/[0.02] transition-colors text-left"
            >
              <span className="text-[10px] font-medium text-[#6B7280]">{tile.label}</span>
              <span className="text-lg font-semibold text-[#111827] tabular-nums">{tile.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
