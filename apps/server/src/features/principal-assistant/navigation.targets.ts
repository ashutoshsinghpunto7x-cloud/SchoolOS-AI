// ── Voice/chat navigation targets ─────────────────────────────────────────────
// Every path here is a real route the principal role can already open (mirrors
// PRINCIPAL_SECTIONS in the web app's AppLauncherModal). The router LLM only
// ever picks an `id` from this list — it never produces a URL — so the client
// can navigate to `path` without trusting model output.

export interface NavigationTarget {
  id: string;
  label: string;
  path: string;
  /** Shown verbatim to the router LLM. Include synonyms, incl. Hindi/Hinglish terms. */
  description: string;
}

export const NAVIGATION_TARGETS: NavigationTarget[] = [
  { id: 'NAV_DASHBOARD', label: 'Dashboard', path: '/principal', description: 'Principal home / dashboard; Hindi: होम, डैशबोर्ड' },
  { id: 'NAV_STUDENTS', label: 'Student Directory', path: '/students', description: 'Student list, student profiles, find a student; Hindi: छात्र, विद्यार्थी, बच्चे' },
  { id: 'NAV_NEW_ADMISSION', label: 'New Admission Form', path: '/students/new', description: 'Admit a new student, new admission form' },
  { id: 'NAV_ENQUIRIES', label: 'Admission Enquiries', path: '/enquiries', description: 'Admission enquiries, leads, follow-ups page; Hindi: पूछताछ, एडमिशन पूछताछ' },
  { id: 'NAV_STUDENT_EDIT_REQUESTS', label: 'Student Record Edit Requests', path: '/principal/approvals', description: 'Student profile / record edit approval requests' },
  { id: 'NAV_COMMUNICATION', label: 'Parent Messaging', path: '/communication', description: 'Communicate with parents / students, announcements' },
  { id: 'NAV_ATTENDANCE', label: 'Attendance', path: '/attendance', description: 'Class attendance registers, mark or view attendance; Hindi: उपस्थिति, हाज़िरी' },
  { id: 'NAV_ATTENDANCE_SCANNER', label: 'Staff QR Scanner', path: '/principal/attendance-scanner', description: 'Staff QR attendance scanner' },
  { id: 'NAV_TEACHERS_TODAY', label: 'Teachers Today', path: '/principal/teachers-summary', description: "Today's teachers present/absent summary page" },
  { id: 'NAV_INSIGHTS', label: 'School Insights', path: '/principal/insights', description: 'Insights, analytics, reports, charts' },
  { id: 'NAV_ACADEMIC_PLAN', label: 'Academic Plan', path: '/principal/academic-plan', description: 'Syllabus tracker, academic plan, chapter progress; Hindi: पाठ्यक्रम, सिलेबस योजना' },
  { id: 'NAV_PLANNER', label: 'Teacher Planner', path: '/principal/planner', description: 'Teacher lesson planner' },
  { id: 'NAV_SCHOOL_TIMETABLE', label: 'School Timetable', path: '/timetable/school', description: 'Master timetable of the whole school; Hindi: टाइमटेबल, समय सारणी' },
  { id: 'NAV_CLASS_TIMETABLE', label: 'Class Timetable', path: '/timetable', description: 'Class period timetable' },
  { id: 'NAV_CALENDAR', label: 'Calendar', path: '/calendar', description: 'School calendar, events, holidays; Hindi: कैलेंडर, छुट्टियाँ' },
  { id: 'NAV_EXAMS', label: 'Exams', path: '/exams', description: 'Exams and unit tests schedule; Hindi: परीक्षा' },
  { id: 'NAV_QUESTION_BANK', label: 'Question Bank', path: '/principal/question-bank-overview', description: 'Question bank overview' },
  { id: 'NAV_MARKS', label: 'Marks & Report Cards', path: '/principal/marks', description: 'Marks entry, results, report cards; Hindi: अंक, रिजल्ट, रिपोर्ट कार्ड' },
  { id: 'NAV_TERM_REPORT_CARDS', label: 'Term Report Cards', path: '/term-report-cards', description: 'Term report cards' },
  { id: 'NAV_REPORT_CARD_TEMPLATES', label: 'Report Card Templates', path: '/report-card-templates', description: 'Report card templates' },
  { id: 'NAV_FEES', label: 'Fee Records', path: '/fees', description: 'Fee records, fee collection page, dues; Hindi: फीस, शुल्क' },
  { id: 'NAV_DISCOUNT_APPROVALS', label: 'Fee Discount Approvals', path: '/principal/discount-approvals', description: 'Fee discount / concession approvals' },
  { id: 'NAV_TEACHERS', label: 'Teacher Directory', path: '/principal/teachers', description: 'Teachers list / directory, staff; Hindi: शिक्षक, टीचर' },
  { id: 'NAV_CLASS_TEACHERS', label: 'Class Teacher Allocation', path: '/principal/class-teachers', description: 'Class teacher allocation' },
  { id: 'NAV_TEACHER_TIMETABLE', label: 'Teacher Timetables', path: '/timetable/teacher-builder', description: 'Teacher timetable builder and workload' },
  { id: 'NAV_RECRUITMENT', label: 'Recruitment & Hiring', path: '/principal/recruitment', description: 'Hiring, recruitment, interviews; Hindi: भर्ती, नियुक्ति' },
  { id: 'NAV_EMPLOYEES', label: 'Employees Directory', path: '/principal/employees', description: 'All employees directory, HR' },
  { id: 'NAV_LEAVE_APPROVALS', label: 'Staff Leave Requests', path: '/principal/leave-approvals', description: 'Staff leave requests / leave approvals (chhutti); Hindi: छुट्टी के अनुरोध, छुट्टी मंज़ूरी' },
  { id: 'NAV_TEST_APPROVALS', label: 'Test Approvals', path: '/principal/test-approvals', description: 'Test paper / mock test approvals, sign-off' },
  { id: 'NAV_TRANSPORT', label: 'Transport', path: '/principal/transport', description: 'Transport, buses, routes, drivers; Hindi: परिवहन, बस' },
  { id: 'NAV_SETTINGS', label: 'School Settings', path: '/settings', description: 'School profile and settings; Hindi: सेटिंग्स' },
  { id: 'NAV_VISITORS', label: 'Visitor Log', path: '/reception/visitors', description: 'Visitor log, gate passes; Hindi: आगंतुक, विज़िटर' },
  { id: 'NAV_FRONT_OFFICE_REPORTS', label: 'Front Office Reports', path: '/reception/reports', description: 'Front office / reception reports' },
  { id: 'NAV_CANDIDATES', label: 'Job Candidates', path: '/reception/candidates', description: 'Job candidates, CVs, resumes' },
  { id: 'NAV_MESSAGES', label: 'Messages', path: '/messages', description: 'Staff messages inbox; Hindi: संदेश' },
  { id: 'NAV_CHANGE_PASSWORD', label: 'Change Password', path: '/principal/change-password', description: 'Change my password' },
];

export function findNavigationTarget(id: string): NavigationTarget | undefined {
  return NAVIGATION_TARGETS.find((t) => t.id === id);
}
