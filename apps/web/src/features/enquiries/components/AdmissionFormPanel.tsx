import { useRef, useState } from 'react';
import { Loader2, FileText, Plus, Check, Upload, X, ShieldCheck, ShieldX, RotateCcw } from 'lucide-react';
import type { AdmissionFormPaymentStatus } from '@schoolos/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useAdmissionFormByEnquiry, useIssueAdmissionForm, useUpdateAdmissionFormPayment,
  useRecordAdmissionFormSubmission, useResubmitAdmissionForm, useVerifyAdmissionForm,
  useAddChecklistItem, useRemoveChecklistItem, useUpdateChecklistItem, useUploadChecklistItemFile,
} from '../hooks/useAdmissionForms';

interface AdmissionFormPanelProps {
  enquiryId: string;
}

const PAYMENT_STYLES: Record<AdmissionFormPaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid:    'bg-green-50 text-green-700 border-green-200',
  waived:  'bg-gray-100 text-gray-500 border-gray-200',
};

const VERIFICATION_STYLES: Record<string, string> = {
  not_submitted:        'bg-gray-100 text-gray-500 border-gray-200',
  pending_verification: 'bg-blue-50 text-blue-700 border-blue-200',
  verified:             'bg-green-50 text-green-700 border-green-200',
  rejected:             'bg-red-50 text-red-700 border-red-200',
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const AdmissionFormPanel = ({ enquiryId }: AdmissionFormPanelProps) => {
  const { user } = useAuth();
  const canVerify = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'incharge';

  const { data: form, isLoading } = useAdmissionFormByEnquiry(enquiryId);
  const issueForm = useIssueAdmissionForm();
  const updatePayment = useUpdateAdmissionFormPayment();
  const recordSubmission = useRecordAdmissionFormSubmission();
  const resubmit = useResubmitAdmissionForm();
  const verifyForm = useVerifyAdmissionForm();
  const addChecklistItem = useAddChecklistItem();
  const removeChecklistItem = useRemoveChecklistItem();
  const updateChecklistItem = useUpdateChecklistItem();
  const uploadChecklistItemFile = useUploadChecklistItemFile();

  const [issuing, setIssuing] = useState(false);
  const [formFee, setFormFee] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>;
  }

  if (!form) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-700">Admission Form</h3>
        {issuing ? (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <label className="text-xs font-semibold text-gray-600">Form Fee (₹)</label>
            <input
              type="number" min="0" value={formFee} onChange={(e) => setFormFee(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
            <div className="flex gap-2 justify-end mt-1">
              <button type="button" onClick={() => setIssuing(false)} className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => issueForm.mutate({ enquiryId, formFee: Number(formFee) || 0 }, { onSuccess: () => setIssuing(false) })}
                disabled={issueForm.isPending}
                className="h-8 px-3 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] flex items-center gap-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {issueForm.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                Issue Form
              </button>
            </div>
            {issueForm.isError && <p className="text-xs text-red-600">{issueForm.error.message}</p>}
          </div>
        ) : (
          <button
            type="button" onClick={() => setIssuing(true)}
            className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-600 border border-blue-200"
          >
            <Plus className="w-3.5 h-3.5" /> Issue Admission Form
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-gray-400" /> {form.formNumber}
        </h3>
        <span className="text-xs text-gray-400">Issued {fmtDate(form.dateIssued)}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${PAYMENT_STYLES[form.paymentStatus]}`}>
          Fee: {form.paymentStatus} (₹{form.formFee})
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${VERIFICATION_STYLES[form.verificationStatus]}`}>
          {form.verificationStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Payment */}
      {form.paymentStatus === 'pending' && (
        <div className="flex gap-2">
          <button
            type="button" onClick={() => updatePayment.mutate({ id: form._id, payload: { paymentStatus: 'paid' } })}
            disabled={updatePayment.isPending}
            className="flex-1 h-8 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50"
          >
            Mark Fee Paid
          </button>
          <button
            type="button" onClick={() => updatePayment.mutate({ id: form._id, payload: { paymentStatus: 'waived' } })}
            disabled={updatePayment.isPending}
            className="flex-1 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Waive Fee
          </button>
        </div>
      )}

      {/* Document checklist */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-gray-500">Documents</p>
        {form.documentChecklist.map((item) => (
          <div key={item._id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
            <button
              type="button"
              onClick={() => updateChecklistItem.mutate({ id: form._id, itemId: item._id, payload: { received: !item.received } })}
              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${item.received ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}
            >
              {item.received && <Check className="w-3.5 h-3.5" />}
            </button>
            <span className={`flex-1 text-sm min-w-0 truncate ${item.received ? 'text-gray-700' : 'text-gray-500'}`}>
              {item.documentType}
            </span>
            {item.fileUrl ? (
              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline shrink-0">
                View
              </a>
            ) : (
              <button
                type="button" onClick={() => fileInputs.current[item._id]?.click()}
                disabled={uploadChecklistItemFile.isPending}
                className="text-gray-400 hover:text-blue-600 shrink-0"
                title="Upload scan"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              ref={(el) => { fileInputs.current[item._id] = el; }}
              type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadChecklistItemFile.mutate({ id: form._id, itemId: item._id, file });
                e.target.value = '';
              }}
            />
            <button
              type="button" onClick={() => removeChecklistItem.mutate({ id: form._id, itemId: item._id })}
              className="text-gray-300 hover:text-red-500 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5 mt-1">
          <input
            type="text" value={newDocType} onChange={(e) => setNewDocType(e.target.value)}
            placeholder="Add a document…" className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 text-xs"
          />
          <button
            type="button"
            onClick={() => { if (newDocType.trim()) { addChecklistItem.mutate({ id: form._id, payload: { documentType: newDocType.trim() } }); setNewDocType(''); } }}
            className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Submission / Verification actions */}
      {form.verificationStatus === 'not_submitted' && (
        <button
          type="button" onClick={() => recordSubmission.mutate(form._id)} disabled={recordSubmission.isPending}
          className="h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
        >
          Record Submission
        </button>
      )}

      {form.verificationStatus === 'rejected' && (
        <>
          {form.rejectionReason && <p className="text-xs text-red-600 italic">Rejected: {form.rejectionReason}</p>}
          <button
            type="button" onClick={() => resubmit.mutate(form._id)} disabled={resubmit.isPending}
            className="h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Record Resubmission
          </button>
        </>
      )}

      {form.verificationStatus === 'pending_verification' && canVerify && (
        <div className="flex gap-2">
          <button
            type="button" onClick={() => verifyForm.mutate({ id: form._id, payload: { approve: true } })}
            disabled={verifyForm.isPending}
            className="flex-1 h-9 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Verify
          </button>
          <button
            type="button"
            onClick={() => {
              const reason = window.prompt('Reason for rejecting:');
              if (reason?.trim()) verifyForm.mutate({ id: form._id, payload: { approve: false, rejectionReason: reason.trim() } });
            }}
            disabled={verifyForm.isPending}
            className="flex-1 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <ShieldX className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )}
      {form.verificationStatus === 'verified' && (
        <p className="text-xs text-green-700 font-semibold">
          Verified by {form.verifiedByName} on {fmtDate(form.verifiedAt)}
        </p>
      )}
    </div>
  );
};
