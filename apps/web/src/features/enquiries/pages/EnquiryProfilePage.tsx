import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Pencil, Trash2, Phone, Mail,
  Calendar, User, Tag, ChevronDown, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEnquiry, useUpdateEnquiryStage, useDeleteEnquiry } from '../hooks/useEnquiries';
import { StageBadge, STAGE_LABEL, STAGE_ORDER } from '../components/StageBadge';
import { SourceBadge } from '../components/SourceBadge';
import { EnquiryNotesPanel } from '../components/EnquiryNotesPanel';
import { ConvertToStudentModal } from '../components/ConvertToStudentModal';
import type { EnquiryStage } from '@schoolos/types';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

interface InfoRowProps { label: string; value?: string | null; icon?: React.ReactNode }
const InfoRow = ({ label, value, icon }: InfoRowProps) => (
  <div className="flex gap-2">
    {icon && <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>}
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-semibold">{value || '—'}</p>
    </div>
  </div>
);

export const EnquiryProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: enquiry, isLoading } = useEnquiry(id!);
  const { mutate: updateStage, isPending: stagePending } = useUpdateEnquiryStage(id!);
  const { mutate: deleteEnquiry, isPending: deletePending } = useDeleteEnquiry();

  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-gray-500">Enquiry not found.</p>
        <button
          type="button"
          onClick={() => navigate('/enquiries')}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to Admissions CRM
        </button>
      </div>
    );
  }

  const isConverted = enquiry.stage === 'converted';
  const availableStages = STAGE_ORDER.filter((s) => s !== enquiry.stage && s !== 'converted');
  const followUpOverdue = enquiry.followUpDate ? new Date(enquiry.followUpDate) < new Date() : false;

  function handleStageChange(stage: EnquiryStage) {
    setShowStageMenu(false);
    updateStage({ stage });
  }

  function handleDelete() {
    deleteEnquiry(id!, {
      onSuccess: () => navigate('/enquiries'),
    });
  }

  return (
    <div className="px-6 py-6 max-w-screen-lg mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/enquiries')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Admissions CRM
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — profile */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{enquiry.studentName}</h1>
                <p className="text-sm text-gray-500 mt-1">Class {enquiry.interestedClass}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <StageBadge stage={enquiry.stage} size="md" showDot />
                  <SourceBadge source={enquiry.source} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate(`/enquiries/${id}/edit`)}
                  className="h-9 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50
                             flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>

                {!isConverted && (
                  <>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowStageMenu((v) => !v)}
                        disabled={stagePending}
                        className="h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200
                                   flex items-center gap-1.5 text-sm font-semibold text-blue-600
                                   transition-colors disabled:opacity-50"
                      >
                        {stagePending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ChevronDown className="w-4 h-4" />}
                        Move Stage
                      </button>
                      {showStageMenu && (
                        <div className="absolute right-0 top-10 z-20 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 overflow-hidden">
                          <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Move to stage
                          </p>
                          {availableStages.map((stage) => (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => handleStageChange(stage)}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors',
                                stage === 'lost' ? 'text-red-600' : 'text-gray-700',
                              )}
                            >
                              {STAGE_LABEL[stage]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConvert(true)}
                      className="h-9 px-4 rounded-xl bg-green-600 hover:bg-green-700
                                 flex items-center gap-1.5 text-sm font-bold text-white transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      Convert
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deletePending}
                    className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100
                               text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {isConverted && enquiry.conversionData && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 font-semibold">
                  Converted on {fmtDateTime(enquiry.conversionData.convertedAt)}
                </p>
                {enquiry.conversionData.studentId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/students/${enquiry.conversionData!.studentId}`)}
                    className="ml-auto text-sm font-bold text-green-700 hover:underline"
                  >
                    View Student →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Contact & Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="Parent / Guardian" value={enquiry.parentName} icon={<User className="w-4 h-4" />} />
              <InfoRow label="Mobile" value={enquiry.parentPhone} icon={<Phone className="w-4 h-4" />} />
              {enquiry.parentEmail && (
                <InfoRow label="Email" value={enquiry.parentEmail} icon={<Mail className="w-4 h-4" />} />
              )}
              {enquiry.alternatePhone && (
                <InfoRow label="Alternate Mobile" value={enquiry.alternatePhone} icon={<Phone className="w-4 h-4" />} />
              )}
              <InfoRow
                label="Follow-up Date"
                icon={<Calendar className={cn('w-4 h-4', followUpOverdue ? 'text-red-500' : '')} />}
                value={
                  enquiry.followUpDate
                    ? `${fmtDate(enquiry.followUpDate)}${followUpOverdue ? ' (overdue)' : ''}`
                    : undefined
                }
              />
              {enquiry.assignedCounsellor && (
                <InfoRow label="Counsellor" value={enquiry.assignedCounsellor} icon={<User className="w-4 h-4" />} />
              )}
              {enquiry.tags.length > 0 && (
                <div className="sm:col-span-2 flex gap-2 flex-wrap items-start">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {enquiry.tags.map((tag) => (
                      <span key={tag}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {enquiry.remarks && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 font-medium mb-1">Remarks</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{enquiry.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stage history */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Stage History</h2>
            <div className="flex flex-col gap-3">
              {enquiry.stageHistory.slice().reverse().map((entry, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-100" />
                    {i < enquiry.stageHistory.length - 1 && (
                      <div className="w-0.5 h-5 bg-gray-200" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{STAGE_LABEL[entry.stage]}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(entry.changedAt)}</p>
                    {entry.remarks && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">{entry.remarks}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
          <EnquiryNotesPanel enquiryId={id!} />
        </div>
      </div>

      {/* Convert modal */}
      {showConvert && (
        <ConvertToStudentModal
          enquiry={enquiry}
          onClose={() => setShowConvert(false)}
          onSuccess={(studentId) => navigate(`/students/${studentId}`)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Enquiry?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will soft-delete the enquiry for <strong>{enquiry.studentName}</strong>.
              It can be recovered by an administrator.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePending}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700
                           flex items-center justify-center gap-2 text-sm font-bold text-white
                           transition-colors disabled:opacity-50"
              >
                {deletePending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
