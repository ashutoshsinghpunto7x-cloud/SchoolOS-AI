import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Bus,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Contact,
  Contact2,
  DoorOpen,
  FileBarChart,
  FileEdit,
  FileSignature,
  FileText,
  Gauge,
  Hammer,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Library,
  Megaphone,
  MessagesSquare,
  Package,
  Palette,
  PenLine,
  PhoneCall,
  Receipt,
  RefreshCw,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Target,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface SubMenuItem {
  id: string;
  label: string;
  badge?: string;
  path?: string;
}

export interface SubMenuGroup {
  id: string;
  title: string;
  iconName?: string;
  color?: string;
  badge?: string;
  items: SubMenuItem[];
}

export const FNIC_SECTIONS: SubMenuGroup[] = [
  {
    id: 'students',
    title: 'Students & Admissions',
    color: '#1F7A7A',
    badge: '12 New',
    items: [
      { id: 'students_directory', label: 'Student Directory & Profiles', path: '/students' },
      { id: 'new_admission', label: 'New Student Admission Form', path: '/students/new' },
      { id: 'enquiries', label: 'Admission Enquiries & Leads', badge: '12 New', path: '/enquiries' },
      { id: 'id_cards', label: 'Student ID Cards & RFID Badges', path: '/admin/id-cards' },
      { id: 'student_change_requests', label: 'Student Record Edit Requests', badge: '3', path: '/students' },
      { id: 'student_communications', label: 'Parent & Student Messaging', path: '/communication' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance & Roll Call',
    color: '#254A9A',
    badge: 'Live',
    items: [
      { id: 'attendance_class', label: 'Class 10-A Roll Call Register', badge: 'Live', path: '/attendance' },
      { id: 'all_attendance', label: 'All Classes Attendance Grid', path: '/attendance' },
      { id: 'attendance_scanner', label: 'Gate QR & Biometric Scanner', badge: 'Active', path: '/principal' },
      { id: 'teacher_attendance', label: 'Faculty & Staff Daily Attendance', path: '/operations/attendance' },
      { id: 'attendance_reports', label: 'Attendance Reports & Defaulters', path: '/reception/attendance' },
    ],
  },
  {
    id: 'academics',
    title: 'Academics & Timetables',
    color: '#B4540A',
    badge: '91%',
    items: [
      { id: 'academic_plan', label: 'Academic Master Plan (Syllabus Tracker)', badge: '91% On Track', path: '/principal' },
      { id: 'school_timetable', label: 'Master School Timetable', path: '/timetable/school' },
      { id: 'class_timetable', label: 'Class Period Timetable', path: '/timetable' },
      { id: 'calendar', label: 'School Calendar & Events', path: '/calendar' },
      { id: 'syllabus_setup', label: 'Curriculum & Subject Setup', path: '/coordinator/syllabus' },
    ],
  },
  {
    id: 'results',
    title: 'Exams, Marks & Report Cards',
    color: '#7A3E8E',
    badge: 'Term 2',
    items: [
      { id: 'exams_list', label: 'Exams & Unit Tests Schedule', path: '/exams' },
      { id: 'question_bank', label: 'Question Bank & Paper Generator', path: '/principal' },
      { id: 'marks_hub', label: 'Marks Entry & Grade Validation', path: '/principal' },
      { id: 'term_report_cards', label: 'Term Report Cards Generation', path: '/term-report-cards' },
      { id: 'report_card_templates', label: 'Report Card Template Designer', path: '/report-card-templates' },
    ],
  },
  {
    id: 'fees',
    title: 'Fees & Finance',
    color: '#166534',
    badge: '₹1.4L Today',
    items: [
      { id: 'fee_collection', label: 'Fee Collection Counter', path: '/fees' },
      { id: 'pending_fees', label: 'Pending Dues & Defaulters List', badge: '42 Pending', path: '/fees/pending' },
      { id: 'fee_receipts', label: 'Fee Receipts History', path: '/fees' },
      { id: 'discount_approvals', label: 'Fee Concession & Scholarship Approvals', badge: '1', path: '/principal' },
      { id: 'staff_payroll', label: 'Staff Salaries & Payroll', path: '/admin/payroll' },
    ],
  },
  {
    id: 'staff',
    title: 'Faculty & Staff (HR)',
    color: '#A33E5A',
    badge: '6 Active',
    items: [
      { id: 'teachers', label: 'Faculty & Teacher Directory', path: '/principal' },
      { id: 'class_teachers', label: 'Class Teacher In-Charge Allocation', path: '/principal' },
      { id: 'teacher_timetable', label: 'Teacher Timetables & Workload', path: '/timetable/teacher-builder' },
      { id: 'recruitment', label: 'Staff Recruitment & Hiring', badge: '6 Active', path: '/principal' },
      { id: 'employees_hr', label: 'All Employees Directory (HR)', path: '/admin/employees' },
      { id: 'teacher_logins', label: 'Teacher Logins & Security', path: '/teacher-logins' },
    ],
  },
  {
    id: 'approvals',
    title: 'Approvals Hub',
    color: '#D97706',
    badge: '10',
    items: [
      { id: 'leave_approvals', label: 'Staff Leave Requests', badge: '4', path: '/principal' },
      { id: 'test_approvals', label: 'Exam Paper Sign-Offs', badge: '2', path: '/principal' },
      { id: 'discount_approvals', label: 'Fee Discount Approvals', badge: '1', path: '/principal' },
      { id: 'student_change_requests', label: 'Student Profile Edit Requests', badge: '3', path: '/students' },
    ],
  },
  {
    id: 'operations',
    title: 'Campus & Transport',
    color: '#2F6F8F',
    items: [
      { id: 'transport', label: 'Bus Fleet & Live GPS Tracking', path: '/principal' },
      { id: 'campus_inventory', label: 'Campus Inventory & Stock Levels', path: '/operations/inventory' },
      { id: 'assets_equipment', label: 'Asset Management & Maintenance', path: '/operations/assets' },
      { id: 'purchase_orders', label: 'Purchase Orders & Requisitions', path: '/operations/purchase-orders' },
      { id: 'facility_requests', label: 'Classroom Repair & Facility Requests', path: '/operations/facility-requests' },
    ],
  },
  {
    id: 'reception',
    title: 'Front Desk & Visitors',
    color: '#0284C7',
    items: [
      { id: 'visitor_log', label: 'Visitor Log & Gate Passes', path: '/reception/visitors' },
      { id: 'enquiries', label: 'Walk-in Admission Inquiries', badge: '12', path: '/enquiries' },
      { id: 'front_office', label: 'Daily Front Office Summary Reports', path: '/reception/reports' },
      { id: 'candidate_interviews', label: 'Job Candidate Check-in', path: '/reception/candidates' },
    ],
  },
  {
    id: 'communication',
    title: 'Communications & Notices',
    color: '#4F46E5',
    items: [
      { id: 'messages', label: 'Staff Notices & Internal Messages', path: '/messages' },
      { id: 'announcements', label: 'School-wide Broadcast Announcements', path: '/communication' },
      { id: 'push_preview', label: 'Mobile Push Notification Studio', path: '/notifications/preview' },
    ],
  },
  {
    id: 'admin',
    title: 'System & Administration',
    color: '#475569',
    items: [
      { id: 'dashboard', label: 'Executive Cockpit Overview', badge: 'Live', path: '/principal' },
      { id: 'school_settings', label: 'School Profile & Session Settings', path: '/settings' },
      { id: 'user_management', label: 'User Roles & Access Permissions', path: '/users' },
      { id: 'data_import', label: 'Data Import & Excel Migration', path: '/import' },
      { id: 'automation_jobs', label: 'Automated Reminders & Sync Jobs', path: '/automation' },
    ],
  },
];

type IconComp = LucideIcon;

/** Custom icon for every option inside a category list */
const ITEM_ICONS: Record<string, IconComp> = {
  // Students
  students_directory: Contact,
  new_admission: UserPlus,
  enquiries: PhoneCall,
  id_cards: Contact2,
  student_change_requests: FileEdit,
  student_communications: MessagesSquare,
  // Attendance
  attendance_class: ClipboardCheck,
  all_attendance: LayoutGrid,
  attendance_scanner: ScanLine,
  teacher_attendance: UserCheck,
  attendance_reports: FileBarChart,
  // Academics
  academic_plan: Target,
  school_timetable: CalendarRange,
  class_timetable: Clock,
  calendar: CalendarDays,
  syllabus_setup: Library,
  // Exams
  exams_list: FileText,
  question_bank: HelpCircle,
  marks_hub: PenLine,
  term_report_cards: ScrollText,
  report_card_templates: Palette,
  // Fees
  fee_collection: Wallet,
  pending_fees: AlertCircle,
  fee_receipts: Receipt,
  discount_approvals: BadgePercent,
  staff_payroll: Banknote,
  // Staff
  teachers: Users,
  class_teachers: UserCog,
  teacher_timetable: Clock,
  recruitment: Briefcase,
  employees_hr: Contact,
  teacher_logins: KeyRound,
  // Approvals
  leave_approvals: CalendarOff,
  test_approvals: FileSignature,
  // Logistics
  transport: Bus,
  campus_inventory: Package,
  assets_equipment: Wrench,
  purchase_orders: ShoppingCart,
  facility_requests: Hammer,
  // Front desk
  visitor_log: DoorOpen,
  front_office: BarChart3,
  candidate_interviews: Briefcase,
  // Communication / Admin
  messages: Bell,
  announcements: Megaphone,
  push_preview: Smartphone,
  dashboard: Gauge,
  school_settings: Settings,
  user_management: ShieldCheck,
  data_import: Upload,
  automation_jobs: RefreshCw,
};

/** Category tiles shown in the launcher grid */
interface CategoryTile {
  id: string;
  label: string;
  color: string;
  soft: string;
  count?: string;
  countColor?: string;
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
}

const TILES: CategoryTile[] = [
  {
    id: 'students',
    label: 'Students',
    color: '#1F7A7A',
    soft: '#E8F3F3',
    count: '12',
    countColor: '#D9822B',
    paths: ['M22 10v6M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5'],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    color: '#254A9A',
    soft: '#EEF1F8',
    paths: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  },
  {
    id: 'academics',
    label: 'Academics',
    color: '#B4540A',
    soft: '#FDF3E7',
    paths: ['M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13'],
  },
  {
    id: 'results',
    label: 'Exams',
    color: '#7A3E8E',
    soft: '#F6EEF8',
    paths: ['M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9'],
  },
  {
    id: 'fees',
    label: 'Fees',
    color: '#166534',
    soft: '#EEF7F2',
    paths: ['M6 3h12M6 8h12M6 13l7 8M6 13h5a4 4 0 000-8H6'],
  },
  {
    id: 'staff',
    label: 'Staff',
    color: '#A33E5A',
    soft: '#F9EFF2',
    paths: [
      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
      'M23 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
    circles: [{ cx: 9, cy: 7, r: 4 }],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    color: '#D97706',
    soft: '#FEF5E7',
    count: '10',
    countColor: '#DC2626',
    paths: ['M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 12l2 2 4-4'],
  },
  {
    id: 'operations',
    label: 'Logistics',
    color: '#2F6F8F',
    soft: '#EFF5F8',
    paths: ['M5 4h14v13H5zM5 11h14M8 17v3M16 17v3M8 14h1M16 14h1'],
  },
  {
    id: 'reception',
    label: 'Front Desk',
    color: '#0284C7',
    soft: '#EBF7FC',
    paths: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'],
    circles: [{ cx: 12, cy: 7, r: 4 }],
  },
];

function TileIcon({ tile, size, strokeWidth = 2.2 }: { tile: CategoryTile; size: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tile.paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {tile.circles?.map((c) => (
        <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
    </svg>
  );
}

interface AppLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function AppLauncherModal({ isOpen, onClose, buttonRef }: AppLauncherModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveGroupId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        modalRef.current &&
        !modalRef.current.contains(target) &&
        (!buttonRef?.current || !buttonRef.current.contains(target))
      ) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeGroupId) setActiveGroupId(null);
        else onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, buttonRef, activeGroupId]);

  if (!isOpen) return null;

  const activeGroup = FNIC_SECTIONS.find((g) => g.id === activeGroupId) || null;
  const activeTile = TILES.find((t) => t.id === activeGroupId) || null;

  const navigateToPage = (item: SubMenuItem) => {
    if (item.id === 'home' || item.id === 'dashboard') {
      navigate('/principal');
    } else {
      // Navigate to the in-page demo subpage view
      navigate(`/principal?page=${item.id}`);
    }
    onClose();
  };

  return (
    <div
      ref={modalRef}
      id="app-grid-menu"
      className="fixed top-[86px] right-7 z-50 w-[380px] max-h-[85vh] flex flex-col bg-white rounded-[26px] shadow-[0_16px_50px_rgba(27,42,78,0.22)] border border-[#E8E2D6] p-4 box-border font-['DM_Sans','Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
    >
      {activeGroup && activeTile ? (
        /* ── Category list view (replaces the icon grid) ── */
        <div
          key={activeTile.id}
          className="relative overflow-hidden rounded-[22px] p-4 flex flex-col min-h-[360px] max-h-[calc(85vh-2rem)] animate-in fade-in slide-in-from-right-2 duration-200"
          style={{ backgroundColor: activeTile.soft }}
        >
          {/* Watermark icon */}
          <div
            className="pointer-events-none absolute -right-8 -bottom-8 opacity-[0.09]"
            style={{ color: activeTile.color }}
            aria-hidden="true"
          >
            <TileIcon tile={activeTile} size={210} strokeWidth={1.6} />
          </div>

          {/* Category header */}
          <div className="relative flex items-center gap-3 pb-3 mb-2 border-b" style={{ borderColor: `${activeTile.color}22` }}>
            <button
              type="button"
              onClick={() => setActiveGroupId(null)}
              aria-label="Back to all categories"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-xs cursor-pointer transition-colors shrink-0"
              style={{ color: activeTile.color }}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.4} />
            </button>
            <div className="min-w-0">
              <h4 className="text-[16px] font-bold leading-tight truncate" style={{ color: activeTile.color }}>
                {activeGroup.title}
              </h4>
              <p className="text-[11px] text-[#55607A]">{activeGroup.items.length} options</p>
            </div>
          </div>

          {/* Options */}
          <div className="relative flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-1">
            {activeGroup.items.map((item) => {
              const Icon = ITEM_ICONS[item.id] ?? ChevronRight;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToPage(item)}
                  className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white/70 text-left transition-colors cursor-pointer group"
                >
                  <span
                    className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                    style={{ color: activeTile.color }}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2.1} />
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-[#1B2A4E] leading-snug">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: activeTile.color }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 px-2 border-b border-[#E8E2D6]/50 shrink-0">
            <div>
              <h4 className="text-[14px] font-bold text-[#1B2A4E]">SchoolOS Directory</h4>
              <p className="text-[11px] text-[#55607A]">All services &amp; modules</p>
            </div>
          </div>

          {/* Category grid — padded so tile edges are never clipped */}
          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px] mt-2">
            <div className="grid grid-cols-3 gap-2 p-1.5">
              {TILES.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setActiveGroupId(tile.id)}
                  className="group flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-2xl text-[#1B2A4E] hover:bg-[#F4F6FA] transition-colors cursor-pointer"
                >
                  <span
                    className="relative w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-xs text-white group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: tile.color }}
                  >
                    <TileIcon tile={tile} size={24} />
                    {tile.count && (
                      <span
                        className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white"
                        style={{ backgroundColor: tile.countColor }}
                      >
                        {tile.count}
                      </span>
                    )}
                  </span>
                  <span className="truncate w-full text-center font-semibold text-[11px]">{tile.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
