import { IntentDefinition } from './intent-router';
import { peopleAssistantData } from './people.data';
import { studentsAssistantData } from './students.data';
import { staffAssistantData } from './staff.data';
import { opsAssistantData } from './ops.data';
import { moreAssistantData } from './more.data';
import { homeworkAssistantData, buildAlertsReply } from './alerts.data';
import { attendancePeriodData } from './attendance-period.data';
import { AuthContext } from '../../lib/auth-context';

// Name-level and list-style questions. Each description is shown verbatim to the
// router LLM, so it names the phrasings (English / Hindi / Hinglish) it should catch.

const def = (
  id: string,
  description: string,
  fetchData: IntentDefinition<AuthContext, unknown>['fetchData'],
): IntentDefinition<AuthContext, unknown> => ({ id, description, fetchData });

export const peopleIntents: IntentDefinition<AuthContext, unknown>[] = [
  def('DAILY_BRIEFING',
    'A whole-school overview / morning briefing in one answer — "daily briefing", "morning summary", "give me an overview of the school", "aaj ka summary", "good morning".',
    async () => ({})),

  // Attendance by name
  def('ABSENT_TEACHERS_LIST',
    'WHO / the NAMES of teachers or staff absent today — "which teachers are absent", "absent teachers ke naam", "aaj kaun se teacher nahi aaye". (Just a count → TEACHER_ABSENT_COUNT.)',
    peopleAssistantData.getAbsentTeachers),
  def('ABSENT_STUDENTS_LIST',
    'WHO / the NAMES of students absent today, optionally for one class — "which students are absent in class 5", "absent bachon ki list". (Just a count → STUDENT_ABSENT_COUNT.)',
    peopleAssistantData.getAbsentStudents),
  def('STUDENT_LOOKUP',
    'Anything about ONE named student, including a full profile (marks, attendance, fees, parent): marks/score/result in a subject or exam, their attendance, fees due, class or parent — "how many marks did Arav score in Hindi", "Riya ka maths result", "Rohan\'s attendance", "what does Aman owe".',
    peopleAssistantData.getStudentLookup),

  def('CLASS_ATTENDANCE_PERIOD',
    'Attendance of a CLASS / section (or the whole school) over a PERIOD, not just today — "attendance for class 6A", "class 6A attendance last month", "attendance this month", "last 30 days attendance of class 8".',
    attendancePeriodData.getClassAttendancePeriod),

  // Students
  def('TOP_BOTTOM_STUDENTS',
    'Toppers or weakest students, overall or by class / section / subject / exam — "top 5 students in class 10", "who scored lowest in maths", "class 8 ke toppers".',
    studentsAssistantData.getRankedStudents),
  def('FAILED_STUDENTS',
    'Students who FAILED or did not pass, optionally by class / subject / exam — "who failed in science", "fail hone wale bachche class 9".',
    studentsAssistantData.getFailedStudents),
  def('LOW_ATTENDANCE_STUDENTS',
    'Students with low attendance / below a percentage (default 75%) — "students below 75% attendance", "kam attendance wale bachche class 6".',
    studentsAssistantData.getLowAttendanceStudents),
  def('FEE_DEFAULTERS',
    'WHO has not paid fees: defaulter names, biggest dues, overdue fees by class — "fee defaulters", "who hasn\'t paid in class 7", "overdue fees by class". (Totals only → FEE_SUMMARY.)',
    studentsAssistantData.getFeeDefaulters),
  def('FEE_COLLECTION_PERIOD',
    'Fees collected TODAY or THIS MONTH — "today\'s collection", "aaj kitni fees aayi", "this month\'s fee collection".',
    studentsAssistantData.getFeeCollectionByPeriod),
  def('CLASS_STRENGTH_ROSTER',
    'How many students are in a class / section, the class list, or strength of every class — "class 5 strength", "list of class 3-A", "total students in each class".',
    studentsAssistantData.getClassRoster),
  def('BIRTHDAYS_TODAY',
    'Whose birthday is today (students and teachers) — "birthdays today", "aaj kiska birthday hai".',
    studentsAssistantData.getBirthdays),

  // Marks and results
  def('RESULTS_ANALYSIS',
    'Results statistics: class average in a subject, pass percentage per class, which subject has the worst/best results, comparing two exams, which teacher\'s subject has the lowest scores — "class 8 maths average", "pass % of each class", "weakest subject", "compare half yearly and annual", "which teacher\'s results are poor".',
    studentsAssistantData.getResultsAnalysis),

  // Teachers and staff
  def('TEACHERS_ON_LEAVE',
    'Which teachers are on (approved) leave today / tomorrow / a date — "who is on leave tomorrow", "kal kaun chhutti par hai".',
    staffAssistantData.getTeachersOnLeave),
  def('PENDING_LEAVE_REQUESTS',
    'Leave requests waiting for approval — "pending leave requests", "kitni leaves approve karni hain".',
    staffAssistantData.getPendingLeaves),
  def('TEACHER_SCHEDULE',
    'One named teacher\'s timetable or free periods on a day — "Mrs Sharma\'s timetable", "when is Rahul sir free tomorrow".',
    staffAssistantData.getTeacherSchedule),
  def('FREE_TEACHERS_IN_PERIOD',
    'Which teachers are free in a given period — "who is free in period 3", "teen number period mein kaun free hai".',
    staffAssistantData.getFreeTeachers),
  def('SUBSTITUTE_LEADERBOARD',
    'Which teachers took the most substitute / adjustment periods — "who took the most substitute classes".',
    staffAssistantData.getSubstituteLeaderboard),
  def('LATE_STAFF',
    'Staff / teachers who came LATE today — "late arrivals", "kaun late aaya".',
    staffAssistantData.getLateStaff),

  // Academics
  def('SYLLABUS_PROGRESS',
    'Syllabus / academic-plan progress per class, subject or teacher, and which chapters are behind schedule — "syllabus progress class 9", "which teacher is behind", "pichhe chal rahe chapters".',
    opsAssistantData.getSyllabusProgress),
  def('UPCOMING_EXAMS',
    'Upcoming exams and their dates — "when is the next exam", "upcoming exams".',
    opsAssistantData.getUpcomingExams),
  def('EXAMS_MISSING_MARKS',
    'Exams that have started but marks are not entered yet — "which exams have no marks entered", "marks entry pending".',
    opsAssistantData.getExamsMissingMarks),
  def('PENDING_TEST_APPROVALS',
    'Question papers / mock tests waiting for the Principal\'s approval — "pending paper approvals".',
    opsAssistantData.getPendingApprovals),

  // Front office and admissions
  def('VISITORS_TODAY',
    'Visitors today at the front office — "who visited today", "visitors waiting".',
    opsAssistantData.getVisitorsToday),
  def('PENDING_FOLLOW_UPS',
    'Admission enquiry follow-ups that are due or missed — "pending follow-ups", "kisko call karna hai".',
    opsAssistantData.getPendingFollowUps),
  def('PENDING_ADMISSION_FORMS',
    'Admission forms not yet submitted or awaiting verification — "pending admission forms".',
    opsAssistantData.getPendingAdmissionForms),
  def('INTERVIEWS_SCHEDULED',
    'Staff-recruitment interviews coming up — "interviews scheduled", "who is coming for interview".',
    opsAssistantData.getInterviews),
  def('HIRING_POSITIONS',
    'Open hiring positions / candidates per position — "open positions", "hiring status".',
    opsAssistantData.getHiringPositions),

  def('HOMEWORK_STATUS',
    'Homework / school posts: which classes got NO homework today, what was posted today, or the last posts by a named teacher - "which classes have no homework today", "aaj homework kis kis ne diya", "last post by Mrs Sharma".',
    homeworkAssistantData.getHomeworkStatus),
  def('ATTENTION_ALERTS',
    'What needs the Principal attention / is urgent right now - "alerts", "what needs my attention", "kuch urgent hai kya".',
    async (ctx) => ({ alerts: await buildAlertsReply(ctx) })),
  def('TEACHER_PROFILE',
    'A full profile of ONE named teacher: attendance, leaves, substitute periods taken and syllabus progress - "profile of Mrs Sharma", "Rahul sir ki poori report", "how is Mr Verma performing".',
    moreAssistantData.getTeacherProfile),
  def('ATTENDANCE_TREND',
    'Student attendance TREND over the last two weeks and this week vs last week - "attendance trend", "is attendance improving", "pichle hafte se attendance kaisi hai".',
    moreAssistantData.getAttendanceTrend),
  def('FEE_TREND',
    'Fee collection compared with last month, and what was paid yesterday - "fee collection vs last month", "kal kitni fees aayi", "is collection improving".',
    moreAssistantData.getFeeTrend),
  def('BEHAVIOR_SUMMARY',
    'Behavior / discipline records in the last 30 days: students with the most incidents or praise, or ONE named student behavior record — "most behavior incidents this month", "behavior record of Rahul", "anushasan ki report".',
    moreAssistantData.getBehaviorSummary),
  def('TRANSPORT_SUMMARY',
    'Transport: buses, routes, drivers, how many students use each bus, students without transport — "bus wise students", "transport summary", "bus ka route".',
    moreAssistantData.getTransportSummary),
  def('PAYROLL_SUMMARY',
    'Total SALARY for this month, how much is paid vs still pending — "total salary this month", "salary kitni baaki hai".',
    moreAssistantData.getPayrollSummary),
  def('EXPENSE_SUMMARY',
    'Total EXPENSES / spending this month and by category — "how much did we spend this month", "expense by category".',
    moreAssistantData.getExpenseSummary),
  def('STOCK_AND_ASSETS',
    'Low-stock inventory items, assets under repair, and warranty / AMC about to expire — "low stock items", "what is under repair", "warranty expiring".',
    moreAssistantData.getStockAndAssets),
  def('PLAN_COMPLIANCE',
    'Which teachers have NOT ticked / completed the day lessons in the Academic Plan checklist — "who has not ticked the day tasks", "plan completion today", "kis teacher ne aaj ka plan complete nahi kiya".',
    moreAssistantData.getPlanCompliance),

  // Operations
  def('OPEN_MAINTENANCE',
    'Open maintenance / facility requests — "open maintenance requests", "repair tickets pending".',
    opsAssistantData.getOpenMaintenance),
  def('PENDING_PURCHASES_EXPENSES',
    'Purchase requests and expenses waiting for approval — "pending purchase approvals", "expense approvals".',
    opsAssistantData.getPendingPurchasesAndExpenses),
  def('UPCOMING_EVENTS',
    'Upcoming events and holidays — "upcoming events", "next holiday", "is there any function this month".',
    opsAssistantData.getUpcomingEvents),
];
