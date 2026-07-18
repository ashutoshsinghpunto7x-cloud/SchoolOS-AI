import type { EnquiryStage } from '@schoolos/types';

export const STAGE_TONE: Record<EnquiryStage, 'success' | 'warning' | 'danger' | 'neutral'> = {
  new_enquiry: 'neutral',
  contacted: 'neutral',
  follow_up_scheduled: 'warning',
  campus_visit: 'warning',
  application_submitted: 'warning',
  documents_pending: 'warning',
  admission_approved: 'success',
  converted: 'success',
  lost: 'danger',
};

export const STAGE_LABEL: Record<EnquiryStage, string> = {
  new_enquiry: 'New enquiry',
  contacted: 'Contacted',
  follow_up_scheduled: 'Follow-up scheduled',
  campus_visit: 'Campus visit',
  application_submitted: 'Application submitted',
  documents_pending: 'Documents pending',
  admission_approved: 'Admission approved',
  converted: 'Converted',
  lost: 'Lost',
};

// Order mirrors the web app's pipeline (packages/types EnquiryStage lifecycle).
export const STAGE_ORDER: EnquiryStage[] = [
  'new_enquiry',
  'contacted',
  'follow_up_scheduled',
  'campus_visit',
  'application_submitted',
  'documents_pending',
  'admission_approved',
  'converted',
  'lost',
];
