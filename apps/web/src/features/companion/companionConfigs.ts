import type { UserRole } from '@schoolos/types';
import { PRINCIPAL_SECTIONS } from '@/components/topbar/AppLauncherModal';

// Per-dashboard settings for the companion buddy (CompanionBuddy.tsx).
// `routes` drives two things: what the buddy says when you arrive on a page,
// and the hover tip on any nav item pointing at that path (see buddyTipAttrs).
// Matching is "exact or prefix", longest path wins, so '/teacher/marks' also
// covers '/teacher/marks/6/A/Maths/123'.

export interface CompanionRoute {
  path: string;
  label: string;
  hint?: string;
}

export interface CompanionConfig {
  /** Dashboard home — arriving here says "Back on your dashboard". */
  homePath: string;
  routes: CompanionRoute[];
  /** First-visit greeting body (once per browser session). */
  hello: string;
  /** Gap between the buddy and the bottom of the screen, so it sits above any bottom nav. */
  bottomOffset: (viewportWidth: number) => number;
}

const above = (navBelow: number, breakpoint: number) => (w: number) => (w < breakpoint ? navBelow : 24);

const PRINCIPAL_HINTS: Record<string, string> = {
  '/principal/leave-approvals': 'Open a request to approve or decline it.',
  '/attendance': 'Pick a class to see its register.',
  '/principal/insights': 'Attendance trends across the whole school.',
  '/timetable/school': "The whole school's timetable on one page.",
  '/principal/marks': 'Marks and report cards for every class.',
  '/principal/teachers': 'Every teacher, their classes and subjects.',
  '/enquiries': 'New admission enquiries and follow-ups.',
  '/principal/academic-plan': 'How far each class has got through the syllabus.',
};

const PRINCIPAL: CompanionConfig = {
  homePath: '/principal',
  routes: PRINCIPAL_SECTIONS.flatMap((g) =>
    g.items.map((i) => ({ path: i.path, label: i.label, hint: PRINCIPAL_HINTS[i.path] })),
  ),
  hello: "Hover anything and I'll tell you what's inside. Click me to ask.",
  bottomOffset: above(80, 768), // mobile capsule dock
};

const TEACHER: CompanionConfig = {
  homePath: '/teacher',
  routes: [
    { path: '/teacher', label: 'Home', hint: "Today's classes, attendance to mark and your schedule." },
    { path: '/teacher/classes', label: 'My Classes', hint: 'Open a class to take attendance or see its students.' },
    { path: '/teacher/attendance', label: 'Attendance', hint: 'Mark each student present or absent, then save.' },
    { path: '/teacher/behavior', label: 'Behaviour notes', hint: 'Note good work or concerns for a student.' },
    { path: '/teacher/history', label: 'History', hint: "Attendance and work you've already submitted." },
    { path: '/teacher/timetable', label: 'Timetable', hint: 'Your periods for the week.' },
    { path: '/teacher/messages', label: 'Messages', hint: 'Messages from the principal and staff.' },
    { path: '/teacher/marks', label: 'Marks', hint: 'Enter marks for your exams and tests.' },
    { path: '/teacher/question-bank', label: 'Question Bank', hint: 'Photograph a chapter, then build papers from it.' },
    { path: '/teacher/planner', label: 'Planner', hint: 'Plan which chapters to teach and when.' },
    { path: '/teacher/academic-plan', label: 'Academic Plan', hint: 'Your term plan, week by week.' },
    { path: '/teacher/syllabus-tracker', label: 'Syllabus Tracker', hint: "Tick off chapters as you finish them." },
    { path: '/teacher/worksheet-generator', label: 'Worksheets', hint: 'Make a worksheet for any chapter.' },
    { path: '/teacher/report-cards', label: 'Report Cards', hint: 'Check and finish report cards for your class.' },
    { path: '/teacher/add-student', label: 'Add Student', hint: 'Add a new student to your class.' },
    { path: '/teacher/profile', label: 'My Profile', hint: 'Your details and password.' },
    { path: '/teacher/id-card', label: 'ID Card', hint: 'Your staff ID card.' },
  ],
  hello: 'Ask a question or browse quick answers.',
  bottomOffset: above(80, 768), // mobile capsule dock below md
};

const PARENT: CompanionConfig = {
  homePath: '/parent',
  routes: [
    { path: '/parent', label: 'Home', hint: "Your child's day at a glance." },
    { path: '/parent/academics/report-card', label: 'Report Card', hint: 'Marks and grades for the term.' },
    { path: '/parent/academics', label: 'Academics', hint: 'Marks, report cards and subject progress.' },
    { path: '/parent/attendance', label: 'Attendance', hint: "Your child's attendance, day by day." },
    { path: '/parent/fees', label: 'Fees', hint: "Fees paid and what's still due." },
    { path: '/parent/tests', label: 'Practice Tests', hint: 'Practice tests sent by the school.' },
    { path: '/parent/transport', label: 'Transport', hint: 'Bus route and pickup details.' },
    { path: '/parent/more', label: 'More', hint: 'Profile, settings and school contacts.' },
  ],
  hello: "Tap me any time to ask about your child — attendance, marks or events.",
  bottomOffset: above(88, 1024), // bottom nav below lg
};

const ACCOUNTS_ROUTES: CompanionRoute[] = [
  { path: '/accountant', label: 'Accounts Home', hint: "Today's collections and what needs attention." },
  { path: '/accountant/collect-fee', label: 'Collect Fee', hint: 'Take a fee payment and print the receipt.' },
  { path: '/accountant/pending-fees', label: 'Pending Fees', hint: 'Families with fees still due.' },
  { path: '/accountant/fee-records', label: 'Fee Records', hint: 'Every fee payment received.' },
  { path: '/accountant/fee-structure', label: 'Fee Structure', hint: 'Set the fees for each class.' },
  { path: '/accountant/student-directory', label: 'Students', hint: 'Look up any student and their fee status.' },
  { path: '/accountant/teachers', label: 'Teachers', hint: 'Teacher records and salary details.' },
  { path: '/accountant/teacher-directory', label: 'Teachers', hint: 'Teacher records and salary details.' },
  { path: '/accountant/employees', label: 'Employees', hint: 'Every staff member in one list.' },
  { path: '/accountant/salary', label: 'Salary', hint: 'Monthly salary sheet, with leave deductions.' },
  { path: '/accountant/expenses', label: 'Expenses', hint: 'Record and review school spending.' },
  { path: '/accountant/vendors', label: 'Vendors', hint: 'Suppliers, their bills and payments.' },
  { path: '/accountant/facility-requests', label: 'Facility Requests', hint: 'Repairs and facility needs raised by staff.' },
  { path: '/accountant/reports', label: 'Reports', hint: 'Financial reports and summaries.' },
  { path: '/import', label: 'Data Import', hint: 'Bring in records from a spreadsheet.' },
  { path: '/classes', label: 'Classes', hint: 'Classes and sections in the school.' },
  { path: '/messages', label: 'Messages', hint: 'Messages with staff.' },
];

const ACCOUNTANT: CompanionConfig = {
  homePath: '/accountant',
  routes: ACCOUNTS_ROUTES,
  hello: "Hover any menu and I'll explain it. Click me any time for help on this page.",
  bottomOffset: above(88, 1024),
};

const OPERATIONS: CompanionConfig = {
  homePath: '/operations',
  routes: [
    { path: '/operations', label: 'Operations Home', hint: 'Purchases, stock and facility work at a glance.' },
    { path: '/operations/attendance', label: 'Staff Attendance', hint: "Who's in today, from the QR scanner." },
    { path: '/operations/purchase-requests', label: 'Purchase Requests', hint: 'Requests from staff waiting to be bought.' },
    { path: '/operations/purchase-orders', label: 'Purchase Orders', hint: 'Orders placed with vendors and their status.' },
    { path: '/operations/inventory', label: 'Inventory', hint: "What's in stock and what's running low." },
    { path: '/operations/assets', label: 'Assets', hint: 'School equipment and where it is.' },
    { path: '/operations/facility-requests', label: 'Facility Requests', hint: 'Repairs and maintenance to arrange.' },
    ...ACCOUNTS_ROUTES.filter((r) => r.path !== '/accountant'),
  ],
  hello: 'Search any screen or see quick guidance for this page.',
  bottomOffset: () => 24,
};

const COORDINATOR: CompanionConfig = {
  homePath: '/coordinator',
  routes: [
    { path: '/coordinator', label: 'Dashboard', hint: 'Syllabus and calendar setup at a glance.' },
    { path: '/coordinator/academic-plan', label: 'Academic Plan', hint: 'How far each class has got through the syllabus.' },
    { path: '/coordinator/syllabus', label: 'Syllabus Setup', hint: 'Chapters for every class and subject.' },
    { path: '/coordinator/calendar', label: 'Academic Calendar', hint: 'Term dates, holidays and exam weeks.' },
    { path: '/exams', label: 'Exams', hint: 'Exam and unit test schedules.' },
  ],
  hello: 'Search any screen or see quick guidance for this page.',
  bottomOffset: above(80, 768),
};

// Reception and admin share the school-office shell (left sidebar, /reception home).
const OFFICE: CompanionConfig = {
  homePath: '/reception',
  routes: [
    { path: '/reception', label: 'Front Desk', hint: "Visitors, enquiries and today's front-desk tasks." },
    { path: '/reception/visitors', label: 'Visitor Log', hint: 'Check visitors in and out, and print passes.' },
    { path: '/reception/attendance', label: 'Attendance Records', hint: 'Print attendance registers for any dates.' },
    { path: '/reception/tasks', label: 'Tasks', hint: 'Your front-desk to-do list.' },
    { path: '/reception/follow-ups', label: 'Follow-ups', hint: 'Enquiry calls due today and missed ones.' },
    { path: '/reception/candidates', label: 'Candidates', hint: 'CVs and interview tracking.' },
    { path: '/reception/reports', label: 'Front Office Reports', hint: 'Visitor, enquiry and admission reports.' },
    { path: '/enquiries', label: 'Admissions', hint: 'Admission enquiries and where each family is.' },
    { path: '/students', label: 'Students', hint: 'Every student record.' },
    { path: '/teachers', label: 'Teachers', hint: 'Teacher records.' },
    { path: '/attendance', label: 'Attendance', hint: 'Class attendance registers.' },
    { path: '/fees', label: 'Fees', hint: 'Fee collection and dues.' },
    { path: '/calendar', label: 'Calendar', hint: 'School events and holidays.' },
    { path: '/timetable', label: 'Timetable', hint: 'Class timetables.' },
    { path: '/communication', label: 'Communication', hint: 'Messages to parents and students.' },
    { path: '/messages', label: 'Messages', hint: 'Messages with staff.' },
    { path: '/reports', label: 'Reports', hint: 'School reports you can build and save.' },
    { path: '/classes', label: 'Classes & Sections', hint: 'Set up classes and sections.' },
    { path: '/exams', label: 'Exams', hint: 'Exam and unit test schedules.' },
    { path: '/report-card-templates', label: 'Report Card Templates', hint: 'How report cards are laid out.' },
    { path: '/term-report-cards', label: 'Report Cards', hint: 'Term report cards for every class.' },
    { path: '/teacher-logins', label: 'Teacher Logins', hint: 'Create and reset teacher logins.' },
    { path: '/automation', label: 'Automation', hint: 'Automatic messages and workflows.' },
    { path: '/import', label: 'Data Import', hint: 'Bring in records from a spreadsheet.' },
    { path: '/integrations', label: 'Integrations', hint: 'Connected apps and services.' },
    { path: '/administration', label: 'Administration', hint: 'School-wide settings.' },
    { path: '/transport', label: 'Transport', hint: 'Buses, routes and drivers.' },
    { path: '/admin/employees', label: 'Employees', hint: 'Every staff member in one list.' },
    { path: '/admin/attendance-qr', label: 'Staff Attendance', hint: 'QR attendance for staff.' },
    { path: '/admin/id-cards', label: 'ID Cards', hint: 'Print staff ID cards.' },
    { path: '/admin/qr-management', label: 'QR Management', hint: 'Attendance QR codes.' },
    { path: '/admin/payroll', label: 'Payroll', hint: 'Monthly payroll runs.' },
  ],
  hello: 'Search any screen or see quick guidance for this page.',
  bottomOffset: above(80, 768),
};

/**
 * Which buddy each role gets. Roles left out get none on purpose:
 * driver (used on the road — nothing should pop up) and the internal
 * Ops Center roles (they use their own OpsLayout, not this app shell).
 */
export function companionConfigFor(role: UserRole | undefined | null): CompanionConfig | null {
  switch (role) {
    case 'principal':
    case 'incharge':
      return PRINCIPAL;
    case 'teacher':
      return TEACHER;
    case 'parent':
      return PARENT;
    case 'accountant':
      return ACCOUNTANT;
    case 'operations_manager':
      return OPERATIONS;
    case 'academic_coordinator':
      return COORDINATOR;
    case 'reception':
    case 'admin':
      return OFFICE;
    default:
      return null;
  }
}

export function findCompanionRoute(config: CompanionConfig, path: string): CompanionRoute | null {
  let best: CompanionRoute | null = null;
  for (const r of config.routes) {
    if ((path === r.path || path.startsWith(`${r.path}/`)) && (!best || r.path.length > best.path.length)) best = r;
  }
  return best;
}
