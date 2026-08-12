// Server-local copy of MODULE_CATALOG from packages/types/src/index.ts.
// Duplicated rather than imported at runtime because the server's dev
// process (tsx watch) resolves the `@schoolos/types` bare specifier through
// apps/server/tsconfig.json's `paths` entry, which (pre-existing, unrelated
// to this feature) points at the package's declaration file — fine for
// type-checking, but a runtime import through it yields no values in dev.
// Production (`node dist/server.js`) isn't affected by this, but keeping one
// small duplicated copy here means this feature never depends on that
// resolution path at all. If MODULE_CATALOG changes in packages/types,
// mirror the change here too.
export interface ServerModuleCatalogEntry {
  key: string;
  label: string;
}

export const MODULE_CATALOG: ServerModuleCatalogEntry[] = [
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers Directory' },
  { key: 'teacher-logins', label: 'Teacher Logins' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'fees', label: 'Fees' },
  { key: 'timetable', label: 'Timetable' },
  { key: 'enquiries', label: 'Admissions / Enquiries' },
  { key: 'calendar', label: 'Calendar & Events' },
  { key: 'communication', label: 'Communication' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'automation', label: 'Automation' },
  { key: 'import', label: 'Data Import' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'administration', label: 'Administration' },
  { key: 'exams', label: 'Exam Configuration' },
  { key: 'report-card-templates', label: 'Report Card Templates' },
  { key: 'report-cards', label: 'Report Cards' },
  { key: 'classes', label: 'Classes & Sections' },
  { key: 'reception', label: 'Reception Desk' },
  { key: 'employees-hr', label: 'Employees & ID Cards' },
  { key: 'staff-attendance-qr', label: 'Staff Attendance (QR)' },
  { key: 'payroll', label: 'Payroll & Salary' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'accountant-reports', label: 'Accountant Reports' },
  { key: 'principal-approvals', label: 'Principal Approvals' },
  { key: 'principal-insights', label: 'Principal Insights' },
  { key: 'marks', label: 'Marks Entry' },
  { key: 'question-bank', label: 'Question Bank' },
  { key: 'worksheet-generator', label: 'Worksheet Generator' },
  { key: 'planner', label: 'Teacher Planner' },
  { key: 'syllabus-tracker', label: 'Syllabus Tracker' },
];

export const MODULE_CATALOG_KEYS: string[] = MODULE_CATALOG.map((m) => m.key);
