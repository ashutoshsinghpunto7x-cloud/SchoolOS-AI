import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, Send, X, Search, UserPlus, Layers } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FNIC_SECTIONS } from '@/components/topbar/AppLauncherModal';

interface DemoStudent {
  id: string;
  roll: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  reason?: string;
  parent: string;
  phone: string;
}

const INITIAL_ATTENDANCE_STUDENTS: DemoStudent[] = [
  { id: 's1', roll: '01', name: 'Aarav Verma', status: 'present', parent: 'Sunita Verma', phone: '+91 98112 40101' },
  { id: 's2', roll: '02', name: 'Ananya Sharma', status: 'present', parent: 'Ramesh Sharma', phone: '+91 98234 11223' },
  { id: 's3', roll: '03', name: 'Devansh Mishra', status: 'absent', reason: 'High fever reported by mother', parent: 'Kavita Mishra', phone: '+91 94551 22334' },
  { id: 's4', roll: '04', name: 'Ishita Nair', status: 'present', parent: 'S. K. Nair', phone: '+91 99100 88221' },
  { id: 's5', roll: '05', name: 'Kabir Khan', status: 'late', reason: 'School bus #4 delayed in traffic', parent: 'Farhan Khan', phone: '+91 98711 33445' },
  { id: 's6', roll: '06', name: 'Meera Joshi', status: 'leave', reason: 'Pre-approved family function', parent: 'Sunita Joshi', phone: '+91 98102 55667' },
  { id: 's7', roll: '07', name: 'Pranav Gupta', status: 'present', parent: 'Alok Gupta', phone: '+91 97112 66778' },
  { id: 's8', roll: '08', name: 'Riya Tiwari', status: 'absent', reason: 'Attending elder sister wedding', parent: 'Manish Tiwari', phone: '+91 98188 77889' },
  { id: 's9', roll: '09', name: 'Samarth Singh', status: 'present', parent: 'Harpreet Singh', phone: '+91 98991 88990' },
  { id: 's10', roll: '10', name: 'Tanvi Dubey', status: 'present', parent: 'Pooja Dubey', phone: '+91 98733 99001' },
  { id: 's11', roll: '11', name: 'Aditya Rao', status: 'present', parent: 'V. Rao', phone: '+91 98114 10203' },
  { id: 's12', roll: '12', name: 'Bhavya Patel', status: 'present', parent: 'C. M. Patel', phone: '+91 98221 21314' },
];

const INITIAL_LEAVES = [
  {
    id: 'l-1',
    teacher: 'Ramesh Kumar',
    designation: 'PGT Physics',
    type: 'Medical Leave',
    dates: '3 Nov – 5 Nov (3 days)',
    reason: 'Hospitalization for acute viral infection',
    substitute: 'Sunita Joshi (Free in Period 3)',
  },
  {
    id: 'l-2',
    teacher: 'Pooja Sharma',
    designation: 'TGT Mathematics',
    type: 'Casual Leave',
    dates: '4 Nov (1 day)',
    reason: 'Family wedding in Jaipur',
    substitute: 'Aakash Verma (Free in Period 2 & 5)',
  },
  {
    id: 'l-3',
    teacher: 'Anand Swaminathan',
    designation: 'PGT Computer Science',
    type: 'Duty Leave',
    dates: '3 Nov (Full Day)',
    reason: 'Accompanying students to CBSE State Robotics Olympiad',
    substitute: 'Self-study assigned',
  },
  {
    id: 'l-4',
    teacher: 'Shalini Gupta',
    designation: 'Primary Incharge',
    type: 'Half Day Leave',
    dates: '3 Nov (Afternoon)',
    reason: 'Bank visit for institutional paperwork',
    substitute: 'Meenakshi Rao',
  },
];

const INITIAL_TESTS = [
  {
    id: 't-1',
    name: 'Class 10 Pre-Board Mathematics Exam',
    subject: 'Mathematics',
    class: 'Class 10',
    preparedBy: 'Deepak Rawat (HOD Math)',
    marks: 80,
    date: 'Scheduled: 10 Nov 2026',
    chapters: 'Real Numbers, Polynomials, Quadratic Equations, Triangles, Trigonometry, Statistics',
  },
  {
    id: 't-2',
    name: 'Class 12 Physics Unit 4 Electrostatics Test',
    subject: 'Physics',
    class: 'Class 12',
    preparedBy: 'Kavita Nair',
    marks: 40,
    date: 'Scheduled: 7 Nov 2026',
    chapters: 'Electric Charges & Fields, Electrostatic Potential and Capacitance',
  },
];

const INITIAL_DISCOUNTS = [
  {
    id: 'd-1',
    student: 'Aarav Saxena',
    class: 'Class 9 · A',
    concessionType: 'Staff Ward / Hardship Relief',
    originalFee: '₹37,000 / term',
    discountedFee: '₹18,500 / term',
    discountAmount: '₹18,500 / term (50%)',
    reason: 'Single parent hardship following bereavement in 2025.',
  },
];

const ACADEMIC_PLANS = [
  {
    teacher: 'Deepak Rawat',
    subject: 'Maths (10-A, 10-B)',
    class: 'Class 10-A, 10-B',
    completion: '92%',
    status: 'Ahead by 2 lessons',
    nextMilestone: 'Trigonometry Revision',
    milestoneDate: '12 Nov 2026',
  },
  {
    teacher: 'Sunita Joshi',
    subject: 'Science (10-A, 9-B)',
    class: 'Class 10-A, 9-B',
    completion: '88%',
    status: 'On track',
    nextMilestone: 'Carbon & Compounds Lab',
    milestoneDate: '14 Nov 2026',
  },
  {
    teacher: 'Kavita Nair',
    subject: 'Physics (11-A, 12-A)',
    class: 'Class 11-A, 12-A',
    completion: '81%',
    status: '1 lesson review pending',
    nextMilestone: 'Optics Numericals',
    milestoneDate: '11 Nov 2026',
  },
  {
    teacher: 'Farhan Qureshi',
    subject: 'Social Science (10-A)',
    class: 'Class 10-A',
    completion: '95%',
    status: 'Syllabus completed for Term 2',
    nextMilestone: 'Pre-Board Map Practice',
    milestoneDate: '10 Nov 2026',
  },
];

const FACULTY_LIST = [
  {
    id: 'tch-1',
    name: 'Deepak Rawat',
    designation: 'PGT Mathematics',
    department: 'Mathematics',
    classTeacherOf: 'Class 10-A',
    classes: '10-A, 10-B, 12-B',
    status: 'Present',
  },
  {
    id: 'tch-2',
    name: 'Sunita Joshi',
    designation: 'TGT Science',
    department: 'Science',
    classTeacherOf: 'Class 9-B',
    classes: '9-A, 9-B, 10-A',
    status: 'Present',
  },
  {
    id: 'tch-3',
    name: 'Ramesh Kumar',
    designation: 'PGT Physics',
    department: 'Physics',
    classTeacherOf: 'None',
    classes: '11-A, 12-A',
    status: 'On Leave',
  },
  {
    id: 'tch-4',
    name: 'Kavita Nair',
    designation: 'PGT Physics',
    department: 'Physics',
    classTeacherOf: 'Class 12-A',
    classes: '11-A, 12-A',
    status: 'Present',
  },
  {
    id: 'tch-5',
    name: 'Farhan Qureshi',
    designation: 'TGT Social Science',
    department: 'Humanities',
    classTeacherOf: 'Class 8-A',
    classes: '8-A, 9-A, 10-A',
    status: 'Present',
  },
];

export const PrincipalWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const rawPage = searchParams.get('page') || 'home';
  const activePage = rawPage === 'attendance' ? 'attendance_class' : rawPage;

  const firstName = user?.firstName || 'Beauty';

  // Interactive states for subpages
  const [students, setStudents] = useState<DemoStudent[]>(INITIAL_ATTENDANCE_STUDENTS);
  const [leaves, setLeaves] = useState(INITIAL_LEAVES);
  const [tests, setTests] = useState(INITIAL_TESTS);
  const [discounts, setDiscounts] = useState(INITIAL_DISCOUNTS);

  // AI Assistant states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<
    { id: string; role: 'user' | 'assistant'; text: string }[]
  >([
    {
      id: 'm-0',
      role: 'assistant',
      text: `Hello Principal ${firstName}! I'm your SchoolOS Sage assistant. You can ask for real-time attendance stats, teacher leaves, pending test approvals, fee collection numbers, or run administrative tasks.`,
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiChatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAiModalOpen) {
      setTimeout(() => {
        aiChatScrollRef.current?.scrollTo({ top: aiChatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [isAiModalOpen, aiChatMessages, isAiTyping]);

  const handleSendAiMessage = (promptText?: string) => {
    const text = promptText || aiInput.trim();
    if (!text || isAiTyping) return;
    if (!promptText) setAiInput('');

    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, text };
    setAiChatMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    setTimeout(() => {
      let reply = "I've checked the SchoolOS systems for you.";
      const lower = text.toLowerCase();
      if (lower.includes('attendance')) {
        reply = "📊 Attendance Today is 83% across 18 classes. Class 10-A is currently at 83% (24 present, 2 absent, 1 late, 1 on pre-approved leave). 4 classes are below 72% (Class IV-A 55%, Prep-B 68%, Class II-A 70%).";
      } else if (lower.includes('leave') || lower.includes('approval')) {
        reply = "⚠️ Pending Approvals: You have 4 staff leave requests (Ramesh Kumar, Pooja Sharma, Anand Swaminathan, Shalini Gupta) and 2 unit test question papers awaiting your review.";
      } else if (lower.includes('fee')) {
        reply = "💰 Fee Collection Update: ₹1,42,500 collected today across counter & UPI. 42 student accounts have dues pending for Term 2.";
      } else if (lower.includes('teacher') || lower.includes('absent')) {
        reply = "👩‍🏫 Staff Status: 2 faculty members on leave today: Deepak Rawat (Math) and Sunita Nair (Science). Substitute teachers have been mapped.";
      } else {
        reply = `Status for "${text}": School operations are fully synchronized, gate QR cameras are active, and timetables are running on schedule.`;
      }
      setAiChatMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant' as const, text: reply }]);
      setIsAiTyping(false);
    }, 600);
  };

  const navigateTo = (pageId: string) => {
    if (pageId === 'home') {
      navigate('/principal');
    } else {
      navigate(`/principal?page=${pageId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAppGrid = () => {
    window.dispatchEvent(new CustomEvent('fnic:toggle-app-grid'));
  };

  // Attendance Register handlers
  const setStudentStatus = (studentId: string, newStatus: 'present' | 'absent' | 'late') => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId && s.status !== 'leave') {
          return {
            ...s,
            status: newStatus,
            reason: newStatus === 'present' ? '' : s.reason,
          };
        }
        return s;
      })
    );
  };

  const markAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => (s.status !== 'leave' ? { ...s, status: 'present', reason: '' } : s))
    );
    toast.success('All presentable students marked Present');
  };

  const saveAttendance = () => {
    const absentCount = students.filter((s) => s.status === 'absent').length;
    toast.success(
      `✓ Attendance record saved successfully! ${absentCount} automated WhatsApp alerts dispatched to parents.`
    );
  };

  const counts = students.reduce(
    (acc, s) => {
      acc[s.status]++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  // Resolve group & page title for subpage breadcrumb
  let groupName = 'Overview';
  let pageTitle = 'Executive Cockpit';
  FNIC_SECTIONS.forEach((g) => {
    g.items.forEach((it) => {
      if (it.id === activePage) {
        groupName = g.title;
        pageTitle = it.label;
      }
    });
  });
  if (activePage === 'attendance_class') {
    groupName = 'Operations & Logistics';
    pageTitle = 'Class Roll Call Register';
  }

  // Render Subpage Content matching DEMO/principal-templates.js ('emblem' theme)
  const renderSubpageContent = () => {
    switch (activePage) {
      case 'attendance_class':
        return (
          <div className="space-y-5" id="attendance-register-root">
            {/* Top Control Header */}
            <div className="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Class 10-A Attendance Register
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">12 Students Enrolled</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="h-10 px-4 rounded-full bg-[#F3EEE3] hover:bg-[#E8E2D6] active:scale-95 text-[#1B2A4E] text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#D9822B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Mark All Present</span>
                </button>

                <button
                  type="button"
                  onClick={saveAttendance}
                  className="h-10 px-5 rounded-full bg-[#1B2A4E] hover:bg-[#121D38] active:scale-95 text-white text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Save &amp; Dispatch Alerts</span>
                  <svg className="w-4 h-4 text-[#F5B332]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Layout: 8-Col Interactive Roster + 4-Col Live Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 8 Cols: Interactive 3-Way Segmented Toggle for every student */}
              <div className="lg:col-span-8 bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-4">
                <div className="pb-3 border-b border-[#E8E2D6] space-y-2">
                  <div className="text-[15px] font-bold text-[#1B2A4E]">
                    Class 10-A
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                      {counts.present} Present
                    </span>
                    <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full font-bold">
                      {counts.absent} Absent
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold">
                      {counts.late} Late
                    </span>
                  </div>
                </div>

                {/* Interactive Student Rows */}
                <div className="divide-y divide-black/5">
                  {students.map((s) => {
                    const isPresent = s.status === 'present';
                    const isAbsent = s.status === 'absent';
                    const isLate = s.status === 'late';
                    const isLeave = s.status === 'leave';

                    return (
                      <div
                        key={s.id}
                        className="py-2.5 flex items-center justify-between gap-2 sm:gap-4 flex-nowrap"
                      >
                        {/* Left side: Roll + Name */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">
                            {s.roll}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate m-0">
                              {s.name}
                            </p>
                            {s.reason && (
                              <p className="text-[10px] sm:text-[11px] text-red-600 font-medium truncate m-0">
                                {s.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row */}
                        <div className="shrink-0 flex items-center">
                          {isLeave ? (
                            <span className="h-7 px-3 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold inline-flex items-center">
                              On Leave
                            </span>
                          ) : (
                            <div className="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-1 shadow-inner">
                              <button
                                type="button"
                                onClick={() => setStudentStatus(s.id, 'present')}
                                title="Present (P)"
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(s.id, 'absent')}
                                title="Absent (A)"
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  isAbsent
                                    ? 'bg-red-600 text-white shadow-xs scale-105'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(s.id, 'late')}
                                title="Late (L)"
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  isLate
                                    ? 'bg-amber-500 text-white shadow-xs scale-105'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                              >
                                L
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 4 Cols: Live Telemetry & Summary Cards */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-3">
                  <h3 className="text-[15px] font-bold text-[#1B2A4E] m-0">Class Summary</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between p-2.5 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60">
                      <span className="text-[#55607A]">Total Strength</span>
                      <b className="text-[#1B2A4E]">12 Students</b>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                      <span className="font-medium">Present Today</span>
                      <b>
                        {counts.present} ({Math.round((counts.present / 12) * 100)}%)
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-red-50 text-red-800">
                      <span className="font-medium">Absent</span>
                      <b>
                        {counts.absent} ({Math.round((counts.absent / 12) * 100)}%)
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-amber-50 text-amber-800">
                      <span className="font-medium">Late Arrival</span>
                      <b>
                        {counts.late} ({Math.round((counts.late / 12) * 100)}%)
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-blue-50 text-blue-800">
                      <span className="font-medium">Official Leave</span>
                      <b>1 (8%)</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-[#1B2A4E] m-0">
                      WhatsApp Alert Queue
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      {counts.absent} Parents
                    </span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    {students
                      .filter((s) => s.status === 'absent')
                      .map((s) => (
                        <div
                          key={s.id}
                          className="p-2.5 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/70"
                        >
                          <p className="font-bold text-[#1B2A4E] m-0">
                            {s.name} (Roll {s.roll})
                          </p>
                          <p className="text-[#55607A] text-[11px] m-0">
                            Parent: {s.parent} ({s.phone})
                          </p>
                          <span className="text-[10px] text-red-600 font-semibold mt-1 block">
                            Reason: {s.reason || 'Unexcused absence'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'leave_approvals':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[18px] p-5 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D9822B]/15 text-[#D9822B] text-[11px] font-bold">
                    {leaves.length} Pending Sign-Offs
                  </span>
                </div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E] mt-1">
                  Faculty &amp; Staff Leave Approvals
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLeaves([]);
                  toast.success(
                    'All staff leaves approved with automated substitute notifications.'
                  );
                }}
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] shadow-xs cursor-pointer"
              >
                Approve All With Auto-Substitute
              </button>
            </div>

            {leaves.length === 0 ? (
              <div className="bg-white rounded-[18px] p-8 text-center border border-[#E8E2D6] text-[#55607A]">
                All leave requests have been reviewed and signed off!
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="text-[15px] font-bold text-[#1B2A4E] whitespace-nowrap">{l.teacher}</span>
                        <span className="text-[12px] text-[#55607A] whitespace-nowrap">({l.designation})</span>
                      </div>
                      <span
                        className={`h-6 px-3 rounded-full text-[10px] font-bold uppercase whitespace-nowrap inline-flex items-center justify-center shrink-0 ${
                          l.type.includes('Medical')
                            ? 'bg-red-100 text-red-700'
                            : l.type.includes('Casual')
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {l.type}
                      </span>
                    </div>

                    <div className="space-y-1 text-[12px]">
                      <p className="text-[#1B2A4E] font-medium">
                        Dates: <strong className="text-[#1B2A4E]">{l.dates}</strong>
                      </p>
                      <p className="text-[#1B2A4E] font-medium truncate" title={l.reason}>
                        Reason: <span className="text-[#55607A]">{l.reason}</span>
                      </p>
                      <div className="pt-0.5">
                        <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block">
                          ✓ Recommended Substitute: {l.substitute}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-[#E8E2D6]/40">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(`Sent WhatsApp clarification nudge to ${l.teacher}.`)
                        }
                        className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-8 px-3 text-[11px] cursor-pointer"
                      >
                        Nudge / Clarify
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLeaves((prev) => prev.filter((item) => item.id !== l.id));
                          toast.success(`Authorized leave for ${l.teacher}.`);
                        }}
                        className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-8 px-4 text-[11px] cursor-pointer"
                      >
                        Authorize Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'test_approvals':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Test Approvals
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Review and approve upcoming tests and paper blueprints
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {tests.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#1B2A4E]">{t.name}</h3>
                        <span className="text-[11px] font-semibold text-[#254A9A] bg-[#EEF1F8] px-2.5 py-0.5 rounded-full">
                          {t.subject} · {t.class}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#55607A] mt-1">
                        By {t.preparedBy} · {t.marks} Marks · {t.date}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(`Viewing blueprint for ${t.name}.`)
                        }
                        className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-8 px-3.5 text-[11px] cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTests((prev) => prev.filter((item) => item.id !== t.id));
                          toast.success(`Approved ${t.name}.`);
                        }}
                        className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-8 px-4 text-[11px] cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#55607A]">
                    Chapters: {t.chapters}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'discount_approvals':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Fee Concession Approvals
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Review sibling and merit concession applications
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {discounts.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[#1B2A4E]">{d.student}</span>
                      <span className="text-[12px] text-[#55607A]">({d.class})</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        {d.concessionType}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#1B2A4E]">
                      Fee: {d.originalFee} → <span className="font-semibold text-emerald-700">{d.discountedFee}</span> (Waiver: {d.discountAmount})
                    </p>
                    <p className="text-[11px] text-[#55607A]">Reason: {d.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscounts((prev) => prev.filter((item) => item.id !== d.id));
                        toast.info('Concession request returned to Accounts desk.');
                      }}
                      className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-8 px-3 text-[11px] cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscounts((prev) => prev.filter((item) => item.id !== d.id));
                        toast.success(`Signed off fee concession for ${d.student}.`);
                      }}
                      className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-8 px-4 text-[11px] cursor-pointer"
                    >
                      Sign Off {d.discountAmount}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'academic_plan':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Curriculum Plans
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Syllabus progression and target milestones
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Curriculum progression updated.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Sync Plans
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACADEMIC_PLANS.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#1B2A4E]">{p.subject}</h3>
                      <p className="text-[12px] text-[#55607A] mt-0.5">
                        {p.class} · {p.teacher}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        p.status.includes('Ahead')
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#55607A] mb-1">
                      <span>Curriculum Completed</span>
                      <span className="font-semibold text-[#1B2A4E]">{p.completion}</span>
                    </div>
                    <div className="w-full h-2 bg-[#F0EBDF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: p.completion }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#55607A] flex justify-between pt-1 border-t border-[#E8E2D6]/40">
                    <span>Next: {p.nextMilestone}</span>
                    <span className="font-medium text-[#1B2A4E]">{p.milestoneDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'marks_hub':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Marks &amp; Report Cards
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Examination results and report card publishing
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Report cards generated for preview.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Print Report Cards
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Ready To Publish
                </span>
                <h3 className="text-[14px] font-bold text-[#1B2A4E]">
                  Class 10 Term 1 Final Marks
                </h3>
                <p className="text-[12px] text-[#55607A]">
                  5 sections moderated. Average: 81.4%.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    toast.success('Published to Parent Portal.')
                  }
                  className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full w-full mt-2 h-8 text-[11px] cursor-pointer"
                >
                  Publish to Parent Portal
                </button>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Pending Moderation
                </span>
                <h3 className="text-[14px] font-bold text-[#1B2A4E]">
                  Class 12 Pre-Board 1 Marks
                </h3>
                <p className="text-[12px] text-[#55607A]">
                  Physics &amp; Accounts practicals awaiting sign-off.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Opening moderation panel.')
                  }
                  className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full w-full mt-2 h-8 text-[11px] cursor-pointer"
                >
                  Inspect Moderation
                </button>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  Remedial
                </span>
                <h3 className="text-[14px] font-bold text-[#1B2A4E]">Remedial Students List</h3>
                <p className="text-[12px] text-[#55607A]">
                  28 students scheduled for revision sessions.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Viewing remedial schedule.')
                  }
                  className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full w-full mt-2 h-8 text-[11px] cursor-pointer"
                >
                  View Remedial Roster
                </button>
              </div>
            </div>
          </div>
        );

      case 'exams_list':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Examination Schedule
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Term exam dates and room allocations
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Seating matrix generated.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Generate Seating Matrix
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6]">
              <div className="divide-y divide-black/5">
                <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      18 Nov 2026
                    </span>
                    <p className="text-[14px] font-bold text-[#1B2A4E] mt-1">
                      Class 12 Mid-Term Practice (Accountancy &amp; Physics)
                    </p>
                    <p className="text-[12px] text-[#55607A]">
                      09:00 AM – 12:00 PM · 24 Rooms · 12 Invigilators
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Viewing invigilator duties.')}
                    className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-8 px-3.5 text-[11px] cursor-pointer"
                  >
                    View Roster
                  </button>
                </div>
                <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      22 Nov 2026
                    </span>
                    <p className="text-[14px] font-bold text-[#1B2A4E] mt-1">
                      Class 10 Mathematics Standard &amp; Basic
                    </p>
                    <p className="text-[12px] text-[#55607A]">
                      09:00 AM – 12:00 PM · 18 Rooms
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Viewing invigilator duties.')}
                    className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-8 px-3.5 text-[11px] cursor-pointer"
                  >
                    View Roster
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'question_bank':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Question Bank
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Curated subject question repositories
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Generated balanced test blueprint.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Generate Test Paper
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-semibold text-[#55607A]">Commerce &amp; Accounts</span>
                <div className="text-[24px] font-bold text-[#1B2A4E] mt-1">2,840</div>
                <span className="text-[11px] text-[#55607A]">Questions</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-semibold text-[#55607A]">Mathematics</span>
                <div className="text-[24px] font-bold text-[#1B2A4E] mt-1">3,120</div>
                <span className="text-[11px] text-[#55607A]">Questions</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-semibold text-[#55607A]">Science &amp; Physics</span>
                <div className="text-[24px] font-bold text-[#1B2A4E] mt-1">1,650</div>
                <span className="text-[11px] text-[#55607A]">Questions</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-semibold text-[#55607A]">English</span>
                <div className="text-[24px] font-bold text-[#1B2A4E] mt-1">820</div>
                <span className="text-[11px] text-[#55607A]">Questions</span>
              </div>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Academic Calendar
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Key institutional dates, PTMs, and holidays
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Event added.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Add Event
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6]">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3">
                November 2026
              </h3>
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6]/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex flex-col items-center justify-center font-bold">
                      <span className="text-[9px] leading-tight">NOV</span>
                      <span className="text-[14px] leading-tight">07</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1B2A4E]">
                        Parent-Teacher Meeting (Term 1 Review)
                      </p>
                      <p className="text-[11px] text-[#55607A]">
                        Classes 9 to 12 · 08:30 AM to 01:30 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    Mandatory
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6]/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-800 flex flex-col items-center justify-center font-bold">
                      <span className="text-[9px] leading-tight">NOV</span>
                      <span className="text-[14px] leading-tight">14</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1B2A4E]">
                        Annual Children&apos;s Day &amp; Cultural Fest
                      </p>
                      <p className="text-[11px] text-[#55607A]">
                        Campus Open Day
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                    Celebration
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'teachers':
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">
                  Faculty Directory
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Teaching staff roster and departmental assignments
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Faculty onboarding form opened.')}
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Add Faculty
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6]">
              <div className="divide-y divide-black/5">
                {FACULTY_LIST.map((t) => (
                  <div
                    key={t.id}
                    className="py-3.5 flex items-center justify-between gap-2 flex-nowrap"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EEF1F8] text-[#254A9A] flex items-center justify-center font-bold text-[13px] shrink-0">
                        {t.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <p className="text-[14px] font-bold text-[#1B2A4E] whitespace-nowrap">{t.name}</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap shrink-0">
                            {t.designation}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#55607A] truncate">
                          {t.department} · Class Teacher: {t.classTeacherOf}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          t.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => toast.info(`Viewing profile for ${t.name}.`)}
                        className="bg-[#F3EEE3] hover:bg-[#E8E2D6] text-[#1B2A4E] font-semibold rounded-full h-7 px-3 text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'class_teachers':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Class Teacher In-Charge Allocation
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Assigned faculty leaders for all academic sections
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Class teacher allocations updated for all sections.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Save Allocation Matrix
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2">
                <h3 className="text-[15px] font-bold text-[#1B2A4E]">Class 10 Section A</h3>
                <p className="text-[13px] text-[#55607A]">
                  In-Charge: <strong className="text-[#1B2A4E]">Deepak Rawat (PGT Math)</strong>
                </p>
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-md inline-block">
                  On-time roll call record this month
                </div>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-2">
                <h3 className="text-[15px] font-bold text-[#1B2A4E]">
                  Class 12 Section B (Commerce)
                </h3>
                <p className="text-[13px] text-[#55607A]">
                  In-Charge: <strong className="text-[#1B2A4E]">Beauty Sharma (Principal)</strong>
                </p>
                <div className="text-[11px] text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-md inline-block">
                  Board examination focus section
                </div>
              </div>
            </div>
          </div>
        );

      case 'teacher_timetable':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Faculty Timetable &amp; Workload
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Weekly period allocation across departments
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(
                    'Balanced faculty load: no teacher assigned more than 3 consecutive periods.'
                  )
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Auto-Balance Workload
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6]">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3">
                Workload Distribution (Target: 28 Periods / Week)
              </h3>
              <div className="divide-y divide-black/5 text-[13px]">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-[#1B2A4E]">Ramesh Kumar (PGT Physics)</span>
                  <span className="font-semibold text-[#1B2A4E]">26 / 28 periods (2 Free)</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-[#1B2A4E]">Pooja Sharma (TGT Mathematics)</span>
                  <span className="font-semibold text-[#1B2A4E]">28 / 28 periods (Fully Loaded)</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-[#1B2A4E]">Sunita Joshi (TGT Science)</span>
                  <span className="font-semibold text-[#1B2A4E]">
                    24 / 28 periods (4 Free for substitution)
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'school_timetable':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Master School Timetable
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Daily period schedule for all active sections
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('Updated master timetable broadcast to digital noticeboards.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Publish to Smart Displays
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[#55607A]">
                    <th className="py-3 px-3 font-bold">Class / Period</th>
                    <th className="py-3 px-3">P1 (08:30)</th>
                    <th className="py-3 px-3">P2 (09:15)</th>
                    <th className="py-3 px-3">P3 (10:00)</th>
                    <th className="py-3 px-3">Recess</th>
                    <th className="py-3 px-3">P4 (11:15)</th>
                    <th className="py-3 px-3">P5 (12:00)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-medium">
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Class 10-A</td>
                    <td className="py-3 px-3 text-blue-700">Math (Deepak)</td>
                    <td className="py-3 px-3 text-purple-700">Science (Sunita)</td>
                    <td className="py-3 px-3 text-amber-700">English (Manish)</td>
                    <td className="py-3 px-3 text-[#55607A]">Break</td>
                    <td className="py-3 px-3 text-emerald-700">Physics (Ramesh)</td>
                    <td className="py-3 px-3 text-blue-700">Hindi (Kavita)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Class 12-B Com</td>
                    <td className="py-3 px-3 text-emerald-700">Accounts (Beauty S)</td>
                    <td className="py-3 px-3 text-amber-700">Economics (Rajan)</td>
                    <td className="py-3 px-3 text-blue-700">BST (Priyanka)</td>
                    <td className="py-3 px-3 text-[#55607A]">Break</td>
                    <td className="py-3 px-3 text-purple-700">Math (Deepak)</td>
                    <td className="py-3 px-3 text-emerald-700">Library</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'attendance_scanner':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Gate Attendance Scanner &amp; Stream
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Real-time turnstile monitoring and RFID check-in feed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-semibold text-emerald-700">
                  Gate 1 &amp; Gate 2 Online
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#1B2A4E]">
                    Recent Scans
                  </h3>
                  <span className="text-[11px] text-[#55607A]">42 scans / min</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        08:24 AM
                      </span>
                      <span className="text-[13px] font-bold text-[#1B2A4E]">
                        Aarav Verma (Class 10-A)
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Verified
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        08:24 AM
                      </span>
                      <span className="text-[13px] font-bold text-[#1B2A4E]">
                        Ishita Nair (Class 10-A)
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Verified
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        08:23 AM
                      </span>
                      <span className="text-[13px] font-bold text-[#1B2A4E]">
                        Kabir Khan (Class 10-A)
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-700 font-semibold">
                      Late Arrival
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] space-y-3">
                <h3 className="text-[15px] font-bold text-[#1B2A4E]">Device Health</h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#FBF8F3]">
                    <span className="text-[#1B2A4E]">Main Gate Turnstile A</span>
                    <span className="font-semibold text-emerald-700">Online (99.8%)</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#FBF8F3]">
                    <span className="text-[#1B2A4E]">Bus Depot Biometric 1</span>
                    <span className="font-semibold text-emerald-700">Online</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#FBF8F3]">
                    <span className="text-[#1B2A4E]">Staff Room Terminal</span>
                    <span className="font-semibold text-emerald-700">Online</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast.success(
                      'Running network latency ping across all 6 scanners. Result: 12ms latency.'
                    )
                  }
                  className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full w-full mt-2 h-8 text-[11px] cursor-pointer"
                >
                  Run Diagnostics
                </button>
              </div>
            </div>
          </div>
        );

      case 'transport':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Transport Fleet &amp; Routes
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  GPS tracking and route status for morning and evening shifts
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(
                    'Push notification sent to parents of Route 4 regarding traffic diversion.'
                  )
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Notify Route 4 Parents
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Active Buses
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">14 / 14</div>
                <span className="text-[11px] text-emerald-600 font-semibold">On-Road</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Speed Compliance
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">100%</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Under 40 km/h limit
                </span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Delayed Routes
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">1</div>
                <span className="text-[11px] text-amber-600 font-semibold">Route 4 (+12 min)</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Fuel Readiness
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">Full</div>
                <span className="text-[11px] text-blue-600 font-semibold">CNG Inspected</span>
              </div>
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Staff Circulars &amp; Notices
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Published administrative directives and parent broadcasts
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.info('New staff circular draft opened.')}
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Compose Circular
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6]">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3">Published Directives</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Circular #2026/48
                    </span>
                    <span className="text-[11px] text-[#55607A]">Today 08:00 AM</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[#1B2A4E]">
                    Mandatory Staff Meeting: Term 2 Board Preparation
                  </h4>
                  <p className="text-[12px] text-[#55607A]">
                    All PGT and TGT faculty to assemble in the Senior Library at 02:45 PM today for
                    CBSE sample paper review.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Circular #2026/47
                    </span>
                    <span className="text-[11px] text-[#55607A]">Yesterday</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[#1B2A4E]">
                    Winter Uniform Guidelines Transition
                  </h4>
                  <p className="text-[12px] text-[#55607A]">
                    Navy blazers and maroon ties mandatory for all students starting Monday 10
                    November.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'recruitment':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Faculty Recruitment
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Interview panel evaluations and candidate dossiers
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success('New CBSE hiring requisition opened for academic year 2026-27.')
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Post New Requisition
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6]">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Interviews Scheduled Today</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      11:30 AM
                    </span>
                    <span className="text-[11px] text-[#55607A]">Demo (Lab 2)</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#1B2A4E]">Dr. Shweta Rastogi</p>
                  <p className="text-[12px] text-[#55607A]">
                    PGT Chemistry · 8 yrs experience
                  </p>
                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast.info('Opening evaluation rubric for Dr. Shweta Rastogi.')}
                      className="bg-[#1B2A4E] text-white font-semibold rounded-full h-7 px-3 text-[11px] cursor-pointer"
                    >
                      Score Rubric
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Viewing CV and degrees for Dr. Shweta Rastogi.')}
                      className="bg-[#F3EEE3] text-[#1B2A4E] font-semibold rounded-full h-7 px-3 text-[11px] cursor-pointer"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      02:15 PM
                    </span>
                    <span className="text-[11px] text-[#55607A]">Google Meet</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#1B2A4E]">Manish Chawla</p>
                  <p className="text-[12px] text-[#55607A]">
                    TGT English · 5 yrs experience
                  </p>
                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast.info('Opening evaluation rubric for Manish Chawla.')}
                      className="bg-[#1B2A4E] text-white font-semibold rounded-full h-7 px-3 text-[11px] cursor-pointer"
                    >
                      Score Rubric
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Viewing CV and degrees for Manish Chawla.')}
                      className="bg-[#F3EEE3] text-[#1B2A4E] font-semibold rounded-full h-7 px-3 text-[11px] cursor-pointer"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'front_office':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Front Office &amp; Inquiries
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Visitor check-ins, campus appointments, and direct parent inquiries
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(
                    'Generated certified PDF log for Directorate of Education compliance.'
                  )
                }
                className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                Export PDF Log
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Visitors Today
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">18</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  All Passes Closed
                </span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  New Admissions
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">42</div>
                <span className="text-[11px] text-blue-600 font-semibold">
                  On Target (2026-27)
                </span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Scheduled Visits
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">6</div>
                <span className="text-[11px] text-[#55607A] font-semibold">
                  Campus Tour 02:00 PM
                </span>
              </div>
              <div className="bg-white rounded-[20px] p-5 shadow-xs border border-[#E8E2D6] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55607A]">
                  Phone Inquiries
                </span>
                <div className="text-[26px] font-bold text-[#1B2A4E] mt-1">37</div>
                <span className="text-[11px] text-purple-600 font-semibold">
                  Logged by Desk
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6]">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3">
                Recent Gate Passes &amp; Parent Consultations
              </h3>
              <div className="divide-y divide-black/5">
                <div className="py-3">
                  <p className="text-[13px] leading-snug">
                    <span className="font-bold text-[#1B2A4E]">Vikramaditya Singhal</span>
                    <span className="text-[12px] text-[#55607A]"> · Pass #G-104 · Purpose: Class 11 Commerce Admission Consultation with Principal</span>
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Checked In 10:15 AM
                    </span>
                  </div>
                </div>
                <div className="py-3">
                  <p className="text-[13px] leading-snug">
                    <span className="font-bold text-[#1B2A4E]">Dr. R. K. Mukherjee</span>
                    <span className="text-[12px] text-[#55607A]"> · Pass #G-103 · Purpose: CBSE Board Science Inspection Liaison</span>
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      With Vice Principal
                    </span>
                  </div>
                </div>
                <div className="py-3">
                  <p className="text-[13px] leading-snug">
                    <span className="font-bold text-[#1B2A4E]">Mrs. Neeta Agarwal</span>
                    <span className="text-[12px] text-[#55607A]"> · Pass #G-102 · Purpose: Student Early Exit (Health checkup · Rohan Agarwal Class 9-A)</span>
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      Checked Out 11:30 AM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'students_directory':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Students Directory
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  482 active enrolled students across 18 classes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('new_admission')}
                  className="bg-[#1F7A7A] hover:bg-[#165A5A] text-white font-semibold rounded-full h-9 px-4 text-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New Admission</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-[#55607A] uppercase">Filter:</span>
                  <span className="px-3 py-1 rounded-full bg-[#1B2A4E] text-white text-[11px] font-bold cursor-pointer">All (482)</span>
                  <span className="px-3 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E] text-[11px] font-semibold cursor-pointer">Class 10-A (38)</span>
                  <span className="px-3 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E] text-[11px] font-semibold cursor-pointer">Class 12-B (42)</span>
                  <span className="px-3 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E] text-[11px] font-semibold cursor-pointer">Class 9-A (36)</span>
                </div>
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search student or roll #..."
                    className="w-full bg-[#F3EEE3] rounded-full pl-8 pr-3 py-1.5 text-[12px] text-[#1B2A4E] outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-[#55607A] absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#55607A] font-semibold">
                      <th className="py-3 px-3">Roll #</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Class &amp; Section</th>
                      <th className="py-3 px-3">Parent / Guardian</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3">Fee Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {students.slice(0, 8).map((s, idx) => (
                      <tr key={s.id} className="hover:bg-[#FBF8F3] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#1B2A4E]">{s.roll}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-[#1B2A4E]">{s.name}</p>
                          <span className="text-[10px] text-[#55607A]">ADM-2026-00{idx + 14}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#254A9A]">Class 10 Section A</td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-[#1B2A4E]">{s.parent}</p>
                          <span className="text-[10px] text-[#55607A]">{s.phone}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                            94.2% Present
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                            Cleared
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toast.info(`Viewing profile for ${s.name}`)}
                            className="px-3 py-1 rounded-full bg-[#EEF1F8] text-[#254A9A] text-[11px] font-bold hover:bg-[#E2E8F5]"
                          >
                            Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'new_admission':
        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex items-center justify-between">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  New Student Admission
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">Session 2026–2027 enrollment registration</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success('Student admission registered successfully! Admission number ADM-2026-0483 assigned.');
                navigateTo('students_directory');
              }}
              className="bg-white rounded-[18px] p-6 shadow-xs border border-[#E8E2D6] space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Student Full Name *</label>
                  <input required placeholder="e.g. Reyansh Verma" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none border border-transparent focus:border-[#1F7A7A]" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Applying for Class *</label>
                  <select className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none border border-transparent focus:border-[#1F7A7A]">
                    <option>Class 1 (Primary)</option>
                    <option>Class 6 (Middle)</option>
                    <option>Class 9 (Secondary)</option>
                    <option>Class 11 Science (Senior)</option>
                    <option>Class 11 Commerce (Senior)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Date of Birth *</label>
                  <input type="date" required defaultValue="2012-05-14" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Gender *</label>
                  <select className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Father / Guardian Name *</label>
                  <input required placeholder="e.g. Satish Verma" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Primary Mobile / WhatsApp *</label>
                  <input required placeholder="+91 98110 00000" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Residential Address</label>
                <textarea rows={2} placeholder="House #, Street, City, Pincode" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E8E2D6]">
                <button type="button" onClick={() => navigateTo('home')} className="px-4 py-2 rounded-full border border-[#E8E2D6] text-[12px] font-semibold text-[#1B2A4E]">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[#1F7A7A] hover:bg-[#165A5A] text-white text-[12px] font-bold shadow-xs">Complete Enrollment</button>
              </div>
            </form>
          </div>
        );

      case 'enquiries':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Admission Enquiries
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  12 fresh walk-ins and inquiries logged by front desk
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.success('New enquiry form opened')}
                className="bg-[#1F7A7A] hover:bg-[#165A5A] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                + Log Enquiry
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[20px] p-5 border border-[#E8E2D6] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#55607A]">Active Inquiries</span>
                <div className="text-[28px] font-bold text-[#1B2A4E] mt-1">12</div>
                <span className="text-[11px] text-[#1F7A7A] font-semibold">4 follow-ups today</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 border border-[#E8E2D6] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#55607A]">Campus Tours</span>
                <div className="text-[28px] font-bold text-[#1B2A4E] mt-1">5</div>
                <span className="text-[11px] text-amber-700 font-semibold">Scheduled this week</span>
              </div>
              <div className="bg-white rounded-[20px] p-5 border border-[#E8E2D6] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#55607A]">Converted This Month</span>
                <div className="text-[28px] font-bold text-[#1B2A4E] mt-1">18</div>
                <span className="text-[11px] text-emerald-700 font-semibold">78% conversion</span>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-6 border border-[#E8E2D6] shadow-xs">
              <h3 className="text-[15px] font-bold text-[#1B2A4E] mb-3">Recent Inquiries</h3>
              <div className="divide-y divide-black/5 text-[13px]">
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#1B2A4E]">Mr. Arvind Trivedi</p>
                    <p className="text-[12px] text-[#55607A]">Seeking Class 11 Science for daughter Priya · +91 98114 99011</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">Tour Today 3 PM</span>
                    <button type="button" onClick={() => toast.success('Calling +91 98114 99011...')} className="px-3 py-1 rounded-full bg-[#1B2A4E] text-white text-[11px] font-semibold">Call</button>
                  </div>
                </div>
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#1B2A4E]">Dr. Sunita Bansal</p>
                    <p className="text-[12px] text-[#55607A]">Seeking Nursery for son Aarav · +91 98223 44556</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">Forms Collected</span>
                    <button type="button" onClick={() => toast.success('WhatsApp info brochure sent!')} className="px-3 py-1 rounded-full bg-[#254A9A] text-white text-[11px] font-semibold">WhatsApp</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'fee_collection':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Fee Collection
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  Today's total collected: <strong>₹1,42,500</strong> across UPI &amp; Cash
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('pending_fees')}
                className="bg-[#166534] hover:bg-[#124D28] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer"
              >
                View Defaulters List →
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white rounded-[20px] p-6 border border-[#E8E2D6] shadow-xs space-y-4">
                <h3 className="text-[15px] font-bold text-[#1B2A4E]">Quick Student Fee Collection</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#55607A] block mb-1">Search Student by Name or Roll</label>
                    <input defaultValue="Aarav Verma (Class 10-A · Roll 01)" className="w-full bg-[#F3EEE3] rounded-xl px-3.5 py-2 text-[13px] text-[#1B2A4E] font-medium outline-none" />
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-[#55607A]">Term 2 Tuition Fee:</span>
                      <b className="text-[#1B2A4E]">₹18,500</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#55607A]">Computer Science &amp; Lab:</span>
                      <b className="text-[#1B2A4E]">₹2,500</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#55607A]">Transport Bus Route #4:</span>
                      <b className="text-[#1B2A4E]">₹3,200</b>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E8E2D6] text-[14px]">
                      <span className="font-bold text-[#1B2A4E]">Net Payable:</span>
                      <b className="font-bold text-emerald-700">₹24,200</b>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#55607A]">Mode:</span>
                    <span className="px-3 py-1 rounded-full bg-[#1B2A4E] text-white text-[11px] font-bold">UPI / QR</span>
                    <span className="px-3 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E] text-[11px] font-semibold">Cash</span>
                    <span className="px-3 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E] text-[11px] font-semibold">Cheque</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Fee receipt #RCT-2026-894 generated and SMS sent to parent!')}
                    className="w-full bg-[#166534] hover:bg-[#124D28] text-white font-bold rounded-xl py-2.5 text-[13px] cursor-pointer"
                  >
                    Collect ₹24,200 &amp; Print Receipt
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-[20px] p-6 border border-[#E8E2D6] shadow-xs space-y-3">
                <h3 className="text-[15px] font-bold text-[#1B2A4E]">Today's Receipts Ledger</h3>
                <div className="divide-y divide-black/5 text-[12px]">
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <b className="text-[#1B2A4E]">Ishita Nair (10-A)</b>
                      <p className="text-[10px] text-[#55607A]">RCT-893 · UPI · 11:24 AM</p>
                    </div>
                    <span className="font-bold text-emerald-700">₹24,200</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <b className="text-[#1B2A4E]">Kavita Saxena (12-B)</b>
                      <p className="text-[10px] text-[#55607A]">RCT-892 · Cash · 10:45 AM</p>
                    </div>
                    <span className="font-bold text-emerald-700">₹32,500</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <b className="text-[#1B2A4E]">Pranav Gupta (10-A)</b>
                      <p className="text-[10px] text-[#55607A]">RCT-891 · UPI · 09:15 AM</p>
                    </div>
                    <span className="font-bold text-emerald-700">₹24,200</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pending_fees':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Pending Dues &amp; Defaulters
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  42 accounts with overdue balance · Total Pending: ₹8,90,000
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Dispatched 42 automated WhatsApp fee reminders to parents.')}
                className="bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-full h-9 px-4 text-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Broadcast Reminders (42)</span>
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 border border-[#E8E2D6] shadow-xs">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E8E2D6] text-[#55607A] font-semibold">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Parent &amp; Phone</th>
                    <th className="py-3 px-3">Pending Amount</th>
                    <th className="py-3 px-3">Aging</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <tr className="hover:bg-[#FBF8F3]">
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Devansh Mishra</td>
                    <td className="py-3 px-3 text-[#254A9A] font-semibold">Class 10-A</td>
                    <td className="py-3 px-3">Kavita Mishra · +91 94551 22334</td>
                    <td className="py-3 px-3 font-bold text-red-600">₹24,200</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-semibold">45 Days Overdue</span></td>
                    <td className="py-3 px-3 text-right">
                      <button type="button" onClick={() => toast.success('WhatsApp alert sent to Kavita Mishra')} className="px-3 py-1 rounded-full bg-[#1B2A4E] text-white text-[11px] font-semibold">Remind</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#FBF8F3]">
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Riya Tiwari</td>
                    <td className="py-3 px-3 text-[#254A9A] font-semibold">Class 10-A</td>
                    <td className="py-3 px-3">Manish Tiwari · +91 98188 77889</td>
                    <td className="py-3 px-3 font-bold text-amber-600">₹12,100</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">15 Days Overdue</span></td>
                    <td className="py-3 px-3 text-right">
                      <button type="button" onClick={() => toast.success('WhatsApp alert sent to Manish Tiwari')} className="px-3 py-1 rounded-full bg-[#1B2A4E] text-white text-[11px] font-semibold">Remind</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'visitor_log':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">
                  Visitor Log &amp; Passes
                </h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">
                  14 visitors logged today · 2 currently on campus
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Gate pass form generated')}
                className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer shadow-xs"
              >
                + Issue Gate Pass
              </button>
            </div>

            <div className="bg-white rounded-[20px] p-6 border border-[#E8E2D6] shadow-xs">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E8E2D6] text-[#55607A] font-semibold">
                    <th className="py-3 px-3">Pass #</th>
                    <th className="py-3 px-3">Visitor Name</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Meeting With</th>
                    <th className="py-3 px-3">Check-In</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <tr className="hover:bg-[#FBF8F3]">
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">G-104</td>
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Mr. Alok Verma</td>
                    <td className="py-3 px-3 text-[#55607A]">Fee Receipt Collection</td>
                    <td className="py-3 px-3 text-[#254A9A] font-semibold">Accounts Office</td>
                    <td className="py-3 px-3 text-[#55607A]">11:45 AM</td>
                    <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">On Campus</span></td>
                    <td className="py-3 px-3 text-right">
                      <button type="button" onClick={() => toast.success('Visitor checked out successfully.')} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold hover:bg-red-100">Check Out</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#FBF8F3]">
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">G-103</td>
                    <td className="py-3 px-3 font-bold text-[#1B2A4E]">Dr. Rajesh Saxena</td>
                    <td className="py-3 px-3 text-[#55607A]">Science Olympiad Coordination</td>
                    <td className="py-3 px-3 text-[#254A9A] font-semibold">Vice Principal</td>
                    <td className="py-3 px-3 text-[#55607A]">10:30 AM</td>
                    <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">In Meeting</span></td>
                    <td className="py-3 px-3 text-right">
                      <button type="button" onClick={() => toast.success('Visitor checked out successfully.')} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold hover:bg-red-100">Check Out</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-[#1B2A4E]">{pageTitle}</h1>
                <p className="text-[13px] text-[#55607A] mt-0.5">Part of {groupName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.success(`${pageTitle} refreshed.`)}
                  className="bg-[#1B2A4E] hover:bg-[#121D38] text-white font-semibold rounded-full h-9 px-4 text-[12px] cursor-pointer shadow-xs"
                >
                  Sync
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-8 shadow-xs border border-[#E8E2D6] text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#EEF1F8] flex items-center justify-center text-[#254A9A] mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#1B2A4E]">{pageTitle}</h3>
                <p className="text-[13px] text-[#55607A] max-w-md mx-auto mt-1">
                  This module is synchronized with Florence Nightingale institutional database.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="px-4 py-2 rounded-full bg-[#1B2A4E] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={toggleAppGrid}
                  className="px-4 py-2 rounded-full bg-[#EEF1F8] text-[#254A9A] text-[12px] font-semibold cursor-pointer"
                >
                  Browse All Modules
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  // Subpage View (#view-subpage)
  if (activePage !== 'home') {
    return (
      <div className="w-full max-w-[1240px] mx-auto px-4 py-4 md:py-8 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
        {/* Desktop Back to Home Banner & Breadcrumb */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-3 pb-3 mb-6 border-b border-[#E8E2D6]">
          <div className="flex items-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="font-bold text-[#254A9A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>← Home</span>
            </button>
            <span className="text-[#55607A]">/</span>
            <span className="font-semibold text-[#55607A]">{groupName}</span>
            <span className="text-[#55607A]">/</span>
            <span className="font-bold text-[#1B2A4E]">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="h-8 px-3.5 rounded-full bg-white border border-[#E8E2D6] text-[12px] font-semibold text-[#1B2A4E] hover:bg-[#F3EEE3] transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={toggleAppGrid}
              className="h-8 px-3.5 rounded-full bg-[#EEF1F8] text-[#254A9A] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#E2E8F5] transition-colors cursor-pointer"
            >
              <span>All Sections</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="5" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="12" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Subpage Header */}
        <div className="flex md:hidden items-center justify-between pb-2 mb-3 border-b border-[#E8E2D6] sticky top-0 bg-[#FBF8F3] z-10 pt-1">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="text-[12px] font-bold text-[#254A9A] flex items-center gap-1 cursor-pointer"
          >
            <span>← Back to Dashboard</span>
          </button>
          <span className="text-[12px] font-bold text-[#1B2A4E] truncate max-w-[180px]">
            {pageTitle}
          </span>
        </div>

        {renderSubpageContent()}
      </div>
    );
  }

  // Home Dashboard View (#view-home)
  return (
    <div className="flex-1 w-full font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      {/* ═══════════════════════════════════════════════════════════════════════
           DESKTOP HOME DASHBOARD (EXACT REPLICA OF DEMO/main-demo.html)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block w-full max-w-[1240px] mx-auto px-4 py-8">
        <div id="view-home" className="space-y-8">
          {/* Greeting Header */}
          <div className="text-center pt-2">
            <h1 className="text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
              Good evening, {firstName}
            </h1>
            <p className="text-[16px] text-[#55607A] mt-2">Pick up where you left off.</p>
          </div>

          {/* Quick Launch Strip (8 Soft Blue Circle Icons) */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto py-2">
            {/* 1. Attendance Register */}
            <button
              type="button"
              onClick={() => navigateTo('attendance_class')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <span>Attendance</span>
            </button>

            {/* 2. Leave */}
            <button
              type="button"
              onClick={() => navigateTo('leave_approvals')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center relative transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 6h14v13H5zM5 10h14M9 4v3M15 4v3M9 15l2 2 4-4" />
                </svg>
                <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#D9822B] text-white text-[8px] font-bold flex items-center justify-center">
                  {leaves.length}
                </span>
              </span>
              <span>Leave</span>
            </button>

            {/* 3. Messages */}
            <button
              type="button"
              onClick={() => navigateTo('messages')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18v12H3zM3 7l9 7 9-7" />
                </svg>
              </span>
              <span>Messages</span>
            </button>

            {/* 4. Calendar */}
            <button
              type="button"
              onClick={() => navigateTo('calendar')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h1M12 14h1M16 14h1M8 17h1M12 17h1" />
                </svg>
              </span>
              <span>Calendar</span>
            </button>

            {/* 5. Exams */}
            <button
              type="button"
              onClick={() => navigateTo('exams_list')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4h11v16H5zM8 9h5M8 13h5M17 20l4-9-2-1-4 9z" />
                </svg>
              </span>
              <span>Exams</span>
            </button>

            {/* 6. Report Cards */}
            <button
              type="button"
              onClick={() => navigateTo('marks_hub')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9" />
                </svg>
              </span>
              <span>Report Cards</span>
            </button>

            {/* 7. Transport */}
            <button
              type="button"
              onClick={() => navigateTo('transport')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4h14v13H5zM5 11h14M8 17v3M16 17v3M8 14h1M16 14h1" />
                </svg>
              </span>
              <span>Transport</span>
            </button>

            {/* 8. Teachers */}
            <button
              type="button"
              onClick={() => navigateTo('teachers')}
              className="group flex flex-col items-center gap-2 w-[92px] text-[13px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="w-[64px] h-[64px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-[3px] group-hover:scale-105 group-hover:bg-[#E2E8F5] group-hover:shadow-[0_6px_16px_rgba(37,74,154,0.16)]">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h18v11H3zM8 20l4-5 4 5M9 9h6" />
                </svg>
              </span>
              <span>Teachers</span>
            </button>
          </div>

          {/* 3 Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Attendance today */}
            <div
              onClick={() => navigateTo('attendance_class')}
              className="bg-white border border-[#E8E2D6] rounded-[18px] p-[22px] shadow-xs cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-[13px] text-[#55607A]">Attendance today</div>
              <div className="text-[34px] font-medium text-[#1B2A4E] mt-2">83%</div>
              <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                Open Attendance Register →
              </span>
            </div>

            {/* Leave requests */}
            <div
              onClick={() => navigateTo('leave_approvals')}
              className="bg-white border border-[#E8E2D6] rounded-[18px] p-[22px] shadow-xs cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-[13px] text-[#55607A]">Leave requests</div>
              <div className="text-[34px] font-medium text-[#1B2A4E] mt-2">{leaves.length}</div>
              <span className="text-[11px] font-semibold text-amber-600 mt-1 block">
                {leaves.length} staff pending review
              </span>
            </div>

            {/* New enquiries */}
            <div
              onClick={() => navigateTo('front_office')}
              className="bg-white border border-[#E8E2D6] rounded-[18px] p-[22px] shadow-xs cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-[13px] text-[#55607A]">New enquiries</div>
              <div className="text-[34px] font-medium text-[#1B2A4E] mt-2">12</div>
              <span className="text-[11px] font-semibold text-[#254A9A] mt-1 block">
                Front office log active
              </span>
            </div>
          </div>

          {/* Needs Attention Section */}
          <div className="bg-white border border-[#E8E2D6] rounded-[18px] p-[22px] max-w-4xl mx-auto shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <div className="text-[17px] font-bold text-[#1B2A4E]">Needs attention</div>
              <button
                type="button"
                onClick={() => navigateTo('academic_plan')}
                className="text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer"
              >
                View Syllabus Progress →
              </button>
            </div>

            {/* Class IV-A (55%) */}
            <div className="flex items-center gap-3.5 mt-4">
              <span className="w-[84px] text-[14px] font-medium text-[#1B2A4E] shrink-0">
                Class IV–A
              </span>
              <div className="flex-1 h-[10px] rounded-full bg-[#F0EBDF] overflow-hidden">
                <div className="w-[55%] h-full rounded-full bg-[#D9822B]" />
              </div>
              <b className="w-[42px] text-right text-[14px] font-bold text-[#1B2A4E] shrink-0">
                55%
              </b>
            </div>

            {/* Prep-B (68%) */}
            <div className="flex items-center gap-3.5 mt-3.5">
              <span className="w-[84px] text-[14px] font-medium text-[#1B2A4E] shrink-0">
                Prep–B
              </span>
              <div className="flex-1 h-[10px] rounded-full bg-[#F0EBDF] overflow-hidden">
                <div className="w-[68%] h-full rounded-full bg-[#D9822B]" />
              </div>
              <b className="w-[42px] text-right text-[14px] font-bold text-[#1B2A4E] shrink-0">
                68%
              </b>
            </div>

            {/* Class II-A (70%) */}
            <div className="flex items-center gap-3.5 mt-3.5">
              <span className="w-[84px] text-[14px] font-medium text-[#1B2A4E] shrink-0">
                Class II–A
              </span>
              <div className="flex-1 h-[10px] rounded-full bg-[#F0EBDF] overflow-hidden">
                <div className="w-[70%] h-full rounded-full bg-[#D9822B]" />
              </div>
              <b className="w-[42px] text-right text-[14px] font-bold text-[#1B2A4E] shrink-0">
                70%
              </b>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           MOBILE HOME DASHBOARD (EXACT REPLICA OF DEMO/main-mobile-demo.html)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full max-w-[440px] mx-auto px-3 py-2 flex flex-col justify-between gap-2">
        {/* 1. Circular Donut Attendance Card (83%) */}
        <div
          onClick={() => navigateTo('attendance_class')}
          className="bg-white border border-[#E8E2D6] rounded-[16px] p-3 shadow-xs cursor-pointer active:bg-gray-50 transition-colors shrink-0"
        >
          <div className="flex items-center gap-3.5">
            <svg className="w-[72px] h-[72px] shrink-0" viewBox="0 0 132 132" aria-hidden="true">
              <circle cx="66" cy="66" r="52" fill="none" stroke="#F0EBDF" strokeWidth="14" />
              <circle
                cx="66"
                cy="66"
                r="52"
                fill="none"
                stroke="#D9822B"
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray="271 327"
                transform="rotate(-90 66 66)"
              />
              <text
                x="66"
                y="74"
                textAnchor="middle"
                fontFamily="'DM Sans', sans-serif"
                fontSize="28"
                fontWeight="500"
                fill="#1B2A4E"
              >
                83%
              </text>
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-[#1B2A4E] leading-tight">
                Attendance today
              </div>
              <p className="text-[12px] text-[#55607A] mt-0.5 leading-snug m-0">
                Four classes are below 72%.
              </p>
              <span className="text-[10px] font-bold text-emerald-700 mt-1 block">
                Tap to open Class Attendance Register →
              </span>
            </div>
          </div>
        </div>

        {/* 2. Needs Attention Card (Compact) */}
        <div className="bg-white border border-[#E8E2D6] rounded-[16px] px-3 py-2.5 shadow-xs shrink-0">
          <div className="flex items-center justify-between pb-0.5">
            <div className="text-[13px] font-bold text-[#1B2A4E]">Needs attention</div>
            <button
              type="button"
              onClick={() => navigateTo('academic_plan')}
              className="text-[10px] font-bold text-[#D9822B] hover:underline"
            >
              Details →
            </button>
          </div>

          <div className="flex items-center gap-2.5 mt-1.5">
            <span className="w-[72px] text-[12px] font-medium text-[#1B2A4E] shrink-0">
              Class IV–A
            </span>
            <div className="flex-1 h-[7px] rounded-full bg-[#F0EBDF] overflow-hidden">
              <div className="w-[55%] h-full rounded-full bg-[#D9822B]" />
            </div>
            <b className="w-[32px] text-right text-[11px] font-bold text-[#1B2A4E] shrink-0">
              55%
            </b>
          </div>

          <div className="flex items-center gap-2.5 mt-1">
            <span className="w-[72px] text-[12px] font-medium text-[#1B2A4E] shrink-0">
              Prep–B
            </span>
            <div className="flex-1 h-[7px] rounded-full bg-[#F0EBDF] overflow-hidden">
              <div className="w-[68%] h-full rounded-full bg-[#D9822B]" />
            </div>
            <b className="w-[32px] text-right text-[11px] font-bold text-[#1B2A4E] shrink-0">
              68%
            </b>
          </div>

          <div className="flex items-center gap-2.5 mt-1">
            <span className="w-[72px] text-[12px] font-medium text-[#1B2A4E] shrink-0">
              Class II–A
            </span>
            <div className="flex-1 h-[7px] rounded-full bg-[#F0EBDF] overflow-hidden">
              <div className="w-[70%] h-full rounded-full bg-[#D9822B]" />
            </div>
            <b className="w-[32px] text-right text-[11px] font-bold text-[#1B2A4E] shrink-0">
              70%
            </b>
          </div>
        </div>

        {/* 3. Leave & Enquiries Row */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <div
            onClick={() => navigateTo('leave_approvals')}
            className="bg-white border border-[#E8E2D6] rounded-[16px] p-2.5 shadow-xs cursor-pointer active:bg-gray-50 flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-medium text-[#55607A]">Leave</div>
              <div className="text-[20px] font-bold text-[#1B2A4E] leading-tight">
                {leaves.length}
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Pending
            </span>
          </div>
          <div
            onClick={() => navigateTo('front_office')}
            className="bg-white border border-[#E8E2D6] rounded-[16px] p-2.5 shadow-xs cursor-pointer active:bg-gray-50 flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-medium text-[#55607A]">Enquiries</div>
              <div className="text-[20px] font-bold text-[#1B2A4E] leading-tight">12</div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Active
            </span>
          </div>
        </div>

        {/* 4. 4x4 CIRCULAR ICONS GRID (ALL 16 PRODUCTION FEATURES AT A GLANCE) */}
        <div className="bg-white border border-[#E8E2D6] rounded-[16px] px-2.5 py-2 shadow-xs shrink-0 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-4 gap-y-2 gap-x-1 text-center">
            {[
              {
                id: 'dashboard',
                label: 'Cockpit',
                svg: <path d="M4 11l8-7 8 7v9H4zM10 20v-5h4v5" />,
              },
              {
                id: 'attendance_class',
                label: 'Attendance',
                svg: (
                  <>
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </>
                ),
              },
              {
                id: 'leave_approvals',
                label: 'Leaves',
                badge: String(leaves.length),
                svg: <path d="M5 6h14v13H5zM5 10h14M9 4v3M15 4v3M9 15l2 2 4-4" />,
              },
              {
                id: 'messages',
                label: 'Messages',
                svg: <path d="M3 6h18v12H3zM3 7l9 7 9-7" />,
              },
              {
                id: 'calendar',
                label: 'Calendar',
                svg: (
                  <path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h1M12 14h1M16 14h1M8 17h1M12 17h1" />
                ),
              },
              {
                id: 'exams_list',
                label: 'Exams',
                svg: <path d="M5 4h11v16H5zM8 9h5M8 13h5M17 20l4-9-2-1-4 9z" />,
              },
              {
                id: 'marks_hub',
                label: 'Marks',
                svg: <path d="M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9" />,
              },
              {
                id: 'transport',
                label: 'Transport',
                svg: <path d="M5 4h14v13H5zM5 11h14M8 17v3M16 17v3M8 14h1M16 14h1" />,
              },
              {
                id: 'teachers',
                label: 'Teachers',
                svg: <path d="M3 4h18v11H3zM8 20l4-5 4 5M9 9h6" />,
              },
              {
                id: 'academic_plan',
                label: 'Curriculum',
                svg: (
                  <path d="M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13" />
                ),
              },
              {
                id: 'school_timetable',
                label: 'Timetable',
                svg: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />,
              },
              {
                id: 'question_bank',
                label: 'Q-Bank',
                svg: (
                  <>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </>
                ),
              },
              {
                id: 'test_approvals',
                label: 'Test Signoff',
                badge: String(tests.length),
                svg: <polyline points="20 6 9 17 4 12" />,
              },
              {
                id: 'discount_approvals',
                label: 'Discounts',
                badge: String(discounts.length),
                svg: <path d="M6 3h12M6 8h12m-6 5 8.5 8M6 13h3a4 4 0 0 0 0-8" />,
              },
              {
                id: 'recruitment',
                label: 'Hiring',
                svg: (
                  <>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </>
                ),
              },
              {
                id: 'class_teachers',
                label: 'Mentors',
                svg: (
                  <>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </>
                ),
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                <span className="w-[42px] h-[42px] rounded-full bg-[#EEF1F8] flex items-center justify-center shadow-xs relative">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="#254A9A"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.svg}
                  </svg>
                  {item.badge && Number(item.badge) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#D9822B] text-white text-[8px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium text-[#1B2A4E] truncate w-full">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           CORNER-ANCHORED AI CHAT POPOVER (STICKS TO BOTTOM-RIGHT CORNER)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isAiModalOpen && (
        <div className="fixed bottom-22 right-4 sm:bottom-24 sm:right-6 z-50 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(27,42,78,0.28)] border border-[#E8E2D6] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-95 origin-bottom-right duration-200">
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#F5B332]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15px] font-bold text-white leading-tight">SchoolOS AI</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-[#F5B332] text-[#1B2A4E] px-1.5 py-0.5 rounded-full">
                    Sage
                  </span>
                </div>
                <p className="text-[10px] text-white/70">Principal Copilot</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History */}
          <div
            ref={aiChatScrollRef}
            className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-0 bg-[#FAF8F5]"
          >
            {aiChatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? 'rounded-br-xs bg-[#1B2A4E] text-white'
                      : 'rounded-bl-xs bg-[#F3EEE3] text-[#1B2A4E]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-xs bg-[#F3EEE3] text-[#1B2A4E] px-3.5 py-2 text-[12px] flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#1B2A4E] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#1B2A4E] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#1B2A4E] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3.5 py-2 bg-white border-t border-[#E8E2D6]/60 flex items-center gap-1.5 overflow-x-auto shrink-0 custom-scrollbar">
            <button
              type="button"
              onClick={() => handleSendAiMessage("How is today's attendance?")}
              className="text-[10px] font-semibold text-[#254A9A] bg-[#EEF1F8] hover:bg-[#E2E8F5] px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
            >
              📊 Attendance
            </button>
            <button
              type="button"
              onClick={() => handleSendAiMessage('Show pending leave and test approvals')}
              className="text-[10px] font-semibold text-[#D9822B] bg-[#FDF3E7] hover:bg-[#FAEAD2] px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
            >
              ⚠️ Approvals
            </button>
            <button
              type="button"
              onClick={() => handleSendAiMessage("What is today's fee collection?")}
              className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
            >
              💰 Fees
            </button>
            <button
              type="button"
              onClick={() => handleSendAiMessage('Which teachers are absent today?')}
              className="text-[10px] font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
            >
              👩‍🏫 Staff Leaves
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAiMessage();
            }}
            className="p-3 bg-white border-t border-[#E8E2D6] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask AI anything..."
              className="flex-1 bg-[#F3EEE3] rounded-full px-3.5 py-2 text-[12px] text-[#1B2A4E] outline-none border border-transparent focus:border-[#254A9A]/40"
            />
            <button
              type="submit"
              disabled={!aiInput.trim() || isAiTyping}
              className="w-8 h-8 rounded-full bg-[#1B2A4E] hover:bg-[#121D38] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating AI Assistant Single Circular Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => setIsAiModalOpen((prev) => !prev)}
        aria-label="Ask AI Assistant"
        title="Ask AI Assistant"
        className="fixed bottom-6 right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(27,42,78,0.28)] hover:shadow-[0_12px_32px_rgba(37,74,154,0.38)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 group"
      >
        <Sparkles className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-[#F5B332] group-hover:rotate-12 transition-transform duration-300 animate-pulse" />
      </button>
    </div>
  );
};
