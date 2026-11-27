// FAQ content for the teacher assistant. Plain data so wording can be edited
// without touching the widget. `path` adds an "Open <page>" button to an answer.
// `keywords` are extra words (and Hindi/Hinglish spellings) used to match typed questions.

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  path?: string;
  pathLabel?: string;
  keywords?: string[];
}

export const FAQ_CATEGORIES = ['Attendance', 'Marks & Report Cards', 'Planning & Syllabus', 'Question Bank', 'Account & Help'] as const;

export const TEACHER_FAQ: FaqItem[] = [
  {
    id: 'mark-attendance',
    category: 'Attendance',
    question: 'How do I mark attendance?',
    answer:
      "Open Attendance (or pick a class from My Classes), choose the class and mark each student as present, absent or late, then save. Parents of absent students can be notified automatically.",
    path: '/teacher/attendance',
    pathLabel: 'Attendance',
    keywords: ['present', 'absent', 'roll call', 'hazri', 'upasthiti', 'register'],
  },
  {
    id: 'edit-attendance',
    category: 'Attendance',
    question: 'I marked attendance wrongly. Can I change it?',
    answer:
      "Same-day attendance can be corrected until the cut-off time your principal has set. Past dates are view-only for teachers — ask your principal to correct an older day.",
    keywords: ['edit', 'change', 'correct', 'mistake', 'galat', 'cutoff', 'cut-off', 'past'],
  },
  {
    id: 'past-attendance',
    category: 'Attendance',
    question: 'Where can I see attendance I already submitted?',
    answer: 'History keeps every attendance register you have submitted. Open a date to see who was present or absent.',
    path: '/teacher/history',
    pathLabel: 'History',
    keywords: ['previous', 'old', 'submitted', 'record'],
  },
  {
    id: 'behaviour',
    category: 'Attendance',
    question: 'How do I record a behaviour note for a student?',
    answer: 'Open Behaviour notes, pick the student, choose whether it is good work or a concern, add a short note and save.',
    path: '/teacher/behavior',
    pathLabel: 'Behaviour notes',
    keywords: ['behavior', 'discipline', 'concern', 'remark', 'conduct'],
  },
  {
    id: 'enter-marks',
    category: 'Marks & Report Cards',
    question: 'How do I enter marks for an exam?',
    answer:
      "Open Marks, choose the class, section, subject and exam, then type each student's marks and save.",
    path: '/teacher/marks',
    pathLabel: 'Marks',
    keywords: ['exam', 'test', 'unit test', 'result', 'score', 'number', 'ank', 'marks entry', 'enter marks', 'fill marks', 'entry'],
  },
  {
    id: 'marks-photo',
    category: 'Marks & Report Cards',
    question: 'Can I fill marks from a photo or by speaking?',
    answer:
      "Yes. The Marks entry screen can fill marks from a photo of your marks sheet or from your voice. Always check the numbers it fills in before saving.",
    path: '/teacher/marks',
    pathLabel: 'Marks',
    keywords: ['photo', 'picture', 'camera', 'voice', 'speak', 'dictate', 'scan', 'ai'],
  },
  {
    id: 'report-cards',
    category: 'Marks & Report Cards',
    question: 'How do I check and finish report cards?',
    answer:
      "Report Cards shows your class's cards. Once marks for all subjects are in, open a student's card to review it. Anything missing shows what is still to be entered.",
    path: '/teacher/report-cards',
    pathLabel: 'Report Cards',
    keywords: ['report card', 'result card', 'term', 'grade', 'print'],
  },
  {
    id: 'add-student',
    category: 'Marks & Report Cards',
    question: 'How do I add a new student to my class?',
    answer: 'Open Add Student and fill in the details — just a full name is enough to start taking attendance. Roll number, date of birth and phone can be added later.',
    path: '/teacher/add-student',
    pathLabel: 'Add Student',
    keywords: ['new student', 'admission', 'enroll', 'register student'],
  },
  {
    id: 'make-plan',
    category: 'Planning & Syllabus',
    question: 'How do I plan what to teach?',
    answer:
      "Open Academic Plan, pick the class and subject, then tap Generate my plan. It builds a day-by-day plan from the syllabus, school calendar and exam dates.",
    path: '/teacher/academic-plan',
    pathLabel: 'Academic Plan',
    keywords: ['plan', 'lesson', 'chapters', 'schedule', 'duration', 'yojana'],
  },
  {
    id: 'academic-plan',
    category: 'Planning & Syllabus',
    question: 'Where is my term plan, week by week?',
    answer:
      "Academic Plan shows your term. The Week tab lists each day (holidays included) and the Month tab gives a quick roll-up of every week — tap a week to jump into it.",
    path: '/teacher/academic-plan',
    pathLabel: 'Academic Plan',
    keywords: ['week', 'month', 'calendar', 'term plan', 'holiday'],
  },
  {
    id: 'lesson-completed',
    category: 'Planning & Syllabus',
    question: 'How do I mark a chapter as completed?',
    answer: 'Open Academic Plan, pick the class and subject, and tap Completed on each lesson once you have taught it. The Syllabus progress bar updates as you go.',
    path: '/teacher/academic-plan',
    pathLabel: 'Academic Plan',
    keywords: ['complete', 'finished', 'done', 'progress', 'chapter', 'syllabus'],
  },
  {
    id: 'timetable',
    category: 'Planning & Syllabus',
    question: 'Where can I see my timetable?',
    answer: 'Timetable shows your periods for the week, with the class and subject for each one.',
    path: '/teacher/timetable',
    pathLabel: 'Timetable',
    keywords: ['period', 'schedule', 'time table', 'class today', 'free period'],
  },
  {
    id: 'question-bank',
    category: 'Question Bank',
    question: 'How do I add questions to the Question Bank?',
    answer:
      "Open Question Bank and photograph the chapter pages with the capture option. Give the chapter its proper name — questions are read from your photos and saved under that chapter.",
    path: '/teacher/question-bank',
    pathLabel: 'Question Bank',
    keywords: ['upload', 'photo', 'capture', 'chapter capture', 'questions', 'scan'],
  },
  {
    id: 'question-paper',
    category: 'Question Bank',
    question: 'How do I make a question paper?',
    answer:
      "In Question Bank, start a question paper, pick the chapters, set how many marks you want from each difficulty level, and generate it. You can review and print it.",
    path: '/teacher/question-bank',
    pathLabel: 'Question Bank',
    keywords: ['paper', 'test paper', 'exam paper', 'generate', 'difficulty', 'print', 'pariksha'],
  },
  {
    id: 'worksheet',
    category: 'Question Bank',
    question: 'How do I make a worksheet?',
    answer: 'Open Worksheets, pick the class, subject and chapter, and generate. You can review it and print it.',
    path: '/teacher/worksheet-generator',
    pathLabel: 'Worksheets',
    keywords: ['worksheet', 'homework', 'practice', 'assignment'],
  },
  {
    id: 'messages',
    category: 'Account & Help',
    question: 'Where are my messages from the principal?',
    answer: 'Messages holds everything sent to you by the principal and staff. Unread ones are highlighted.',
    path: '/teacher/messages',
    pathLabel: 'Messages',
    keywords: ['notice', 'circular', 'inbox', 'chat', 'sandesh'],
  },
  {
    id: 'password',
    category: 'Account & Help',
    question: 'How do I change my password or details?',
    answer: 'Open My Profile to update your details and change your password.',
    path: '/teacher/profile',
    pathLabel: 'My Profile',
    keywords: ['password', 'profile', 'phone', 'email', 'details', 'login'],
  },
  {
    id: 'id-card',
    category: 'Account & Help',
    question: 'Where is my staff ID card?',
    answer: 'ID Card shows your staff ID card, which you can view and print.',
    path: '/teacher/id-card',
    pathLabel: 'ID Card',
    keywords: ['id', 'card', 'identity', 'qr'],
  },
  {
    id: 'cant-login',
    category: 'Account & Help',
    question: "I can't log in, or my classes aren't showing.",
    answer:
      "Your login is linked to your teacher record by your email. If you can't sign in, or your classes and subjects are missing, ask your school office to check that your email and class assignments are set up — then contact support if it still isn't fixed.",
    keywords: ['login', 'sign in', 'missing', 'not showing', 'no classes', 'problem', 'error', 'issue'],
  },
];

const STOP = new Set(['the', 'a', 'an', 'i', 'my', 'me', 'to', 'do', 'how', 'can', 'is', 'in', 'of', 'for', 'and', 'on', 'it', 'where', 'what', 'we', 'you', 'this']);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    // The Devanagari range comes first: it starts with a combining mark, which
    // would otherwise read as joined to the character before it.
    .split(/[^ऀ-ॿa-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Rank FAQ entries against a typed question. Returns the best matches, best first. */
export function searchFaq(query: string, limit = 3): FaqItem[] {
  const q = tokens(query);
  if (q.length === 0) return [];
  const scored = TEACHER_FAQ.map((item) => {
    const qWords = tokens(item.question);
    const aWords = tokens(item.answer);
    const kWords = (item.keywords ?? []).flatMap((k) => tokens(k));
    let score = 0;
    for (const t of q) {
      const stem = t.length > 4 ? t.slice(0, -1) : t;
      const hit = (words: string[]) => words.some((w) => w === t || w.startsWith(stem));
      if (hit(qWords)) score += 3;
      if (hit(kWords)) score += 3;
      if (hit(aWords)) score += 1;
    }
    return { item, score };
  })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
