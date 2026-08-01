import { useParams } from 'react-router-dom';
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react';
import { useVerifyTermReportCard } from '../hooks/useTermReportCard';

const PROMOTION_LABEL: Record<string, string> = {
  promoted: 'Promoted to Next Class',
  not_promoted: 'Detained',
  pending: 'Result Awaited',
};

export function VerifyTermReportCardPage() {
  const { token = '' } = useParams();
  const { data, isLoading, isError } = useVerifyTermReportCard(token);

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-7 h-7 text-[#1C2B4A] animate-spin" />
            <p className="text-sm text-gray-500">Verifying…</p>
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-base font-bold text-gray-900">Invalid or Unrecognized Report Card</p>
            <p className="text-sm text-gray-500">This QR code could not be verified against SchoolOS AI records.</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Verified by SchoolOS AI</p>
            <p className="text-xl font-bold text-gray-900 mt-2">{data.studentName}</p>
            <p className="text-sm text-gray-500 mt-1">Class {data.class} – {data.section}</p>

            <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-left">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">Academic Year</span>
                <span className="text-xs font-semibold text-gray-900">{data.academicYear}</span>
              </div>
              {data.overallGrade && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-gray-400">Overall Grade</span>
                  <span className="text-xs font-semibold text-gray-900">{data.overallGrade}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">Status</span>
                <span className="text-xs font-semibold text-gray-900">{PROMOTION_LABEL[data.promotionStatus] ?? data.promotionStatus}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">Issued On</span>
                <span className="text-xs font-semibold text-gray-900">
                  {new Date(data.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-6">This is a digital authenticity check only and does not display full academic records.</p>
          </>
        )}
      </div>
    </div>
  );
}
