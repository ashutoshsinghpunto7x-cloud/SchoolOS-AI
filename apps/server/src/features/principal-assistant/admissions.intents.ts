import { IntentDefinition } from './intent-router';
import { admissionsAssistantData } from './admissions.data';
import { AuthContext } from '../../lib/auth-context';

// ── Admissions intent registry ────────────────────────────────────────────────
// Sibling to fees.intents.ts's fee registry — same shape, same router in
// intent-router.ts. See admissions.data.ts for the fetchers.

export const admissionsIntents: IntentDefinition<AuthContext, unknown>[] = [
  {
    id: 'TODAYS_ENQUIRIES',
    description: 'New admission enquiries received today — e.g. "today\'s enquiries", "new admissions today".',
    fetchData: admissionsAssistantData.getTodaysEnquiries,
  },
  {
    id: 'PENDING_FOLLOWUPS',
    description: 'Admission enquiries with a follow-up due today or overdue — e.g. "pending follow-ups", "admission follow-ups", "open admission follow-ups".',
    fetchData: admissionsAssistantData.getPendingFollowUps,
  },
  {
    id: 'DOCUMENTS_PENDING',
    description: 'Admission enquiries stuck waiting on documents from the parent — e.g. "documents pending", "which admissions are missing documents".',
    fetchData: admissionsAssistantData.getDocumentsPending,
  },
  {
    id: 'ADMISSION_STATUS',
    description: 'Overall admission pipeline/funnel status — e.g. "admission status", "how is admissions doing", "admission pipeline overview".',
    fetchData: admissionsAssistantData.getAdmissionStatus,
  },
];
