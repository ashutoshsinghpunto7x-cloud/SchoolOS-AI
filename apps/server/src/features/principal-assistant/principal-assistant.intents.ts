import { IntentDefinition } from './intent-router';
import { principalAssistantData } from './principal-assistant.data';
import { AuthContext } from '../../lib/auth-context';

// ── Attendance intent registry (Phase 2) ──────────────────────────────────────
// Each intent maps a natural-language question shape to the narrowest backend
// fetch that can answer it. Adding a new domain later (Fees, Students, ...)
// means adding a sibling *.intents.ts file with the same shape — the router
// in intent-router.ts does not change.

export const attendanceIntents: IntentDefinition<AuthContext, unknown>[] = [
  {
    id: 'ATTENDANCE_SUMMARY',
    description: "A full overview of today's attendance — e.g. \"today's attendance\", \"attendance summary\", \"give me today's attendance report\".",
    fetchData: principalAssistantData.getFullSummary,
  },
  {
    id: 'STUDENT_PRESENT_COUNT',
    description: 'How many students are present today.',
    fetchData: principalAssistantData.getStudentCounts,
  },
  {
    id: 'STUDENT_ABSENT_COUNT',
    description: 'How many students are absent today.',
    fetchData: principalAssistantData.getStudentCounts,
  },
  {
    id: 'ATTENDANCE_PERCENTAGE',
    description: "Today's overall student attendance percentage/rate.",
    fetchData: principalAssistantData.getStudentCounts,
  },
  {
    id: 'TEACHER_ATTENDANCE',
    description: "Today's teacher attendance overview (present/total).",
    fetchData: principalAssistantData.getTeacherCounts,
  },
  {
    id: 'TEACHER_ABSENT_COUNT',
    description: 'How many teachers are absent today.',
    fetchData: principalAssistantData.getTeacherCounts,
  },
  {
    id: 'HIGHEST_ATTENDANCE_CLASS',
    description: 'Which class/section has the highest attendance today (e.g. "best attendance").',
    fetchData: principalAssistantData.getClassExtremes,
  },
  {
    id: 'LOWEST_ATTENDANCE_CLASS',
    description: 'Which class/section has the lowest attendance today.',
    fetchData: principalAssistantData.getClassExtremes,
  },
];
