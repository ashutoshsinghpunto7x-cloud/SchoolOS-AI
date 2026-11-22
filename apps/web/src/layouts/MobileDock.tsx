import type { ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  DoorOpen,
  FileText,
  GraduationCap,
  Home,
  PhoneCall,
  Receipt,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@schoolos/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getHomePathForRole } from '@/features/auth/utils/roleHome';

interface DockItem {
  label: string;
  /** Route to open; `null` = the role's home path. */
  path: string | null;
  icon: ReactNode;
  /** Highlight rule. `key` = Principal's legacy `?page=` / pathname string. */
  isActive: (pathname: string, key: string) => boolean;
}

const ICON_PROPS = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  fill: 'none',
  stroke: '#F6F1E7',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const svg = (d: string) => (
  <svg {...ICON_PROPS}>
    <path d={d} />
  </svg>
);

const lucide = (Icon: LucideIcon) => <Icon size={19} strokeWidth={1.8} color="#F6F1E7" aria-hidden="true" />;

// ── Principal / Incharge — unchanged from the original dock ─────────────────
const PRINCIPAL_DOCK: DockItem[] = [
  { label: 'Home', path: null, icon: svg('M4 11l8-7 8 7v9H4zM10 20v-5h4v5'), isActive: (_p, k) => k === 'home' },
  {
    label: 'Approvals',
    path: '/principal/leave-approvals',
    icon: svg('M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 12l2 2 4-4'),
    isActive: (_p, k) => k.includes('leave') || k.includes('approv'),
  },
  {
    label: 'Academics',
    path: '/principal/academic-plan',
    icon: svg('M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13'),
    isActive: (_p, k) => k.includes('academic') || k.includes('plan') || k.includes('question') || k.includes('calendar'),
  },
  {
    label: 'Results',
    path: '/principal/marks',
    icon: svg('M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9'),
    isActive: (_p, k) => k.includes('mark') || k.includes('exam'),
  },
  {
    label: 'Timetables',
    path: '/timetable/school',
    icon: svg('M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2'),
    isActive: (_p, k) => k.includes('timetable') || k.includes('attendance') || k.includes('transport') || k.includes('message'),
  },
  {
    label: 'People',
    path: '/principal/teachers',
    icon: svg('M9 11a3 3 0 100-6 3 3 0 000 6zM3 19c0-3 2.5-5 6-5s6 2 6 5M16 8a2.5 2.5 0 010 5M17 14c2 .5 4 2 4 5'),
    isActive: (_p, k) => k.includes('teacher') || k.includes('employee'),
  },
  {
    label: 'Overview',
    path: '/principal/insights',
    icon: svg('M4 20h16M7 20v-6M12 20V6M17 20v-9'),
    isActive: (_p, k) => k.includes('insights') || k.includes('reception') || k.includes('recruit'),
  },
];

// ── Every other role gets shortcuts to ITS OWN screens (same routes as its launcher) ──
const under = (...bases: string[]) => (p: string) => bases.some((b) => p === b || p.startsWith(`${b}/`));
const home = (icon: LucideIcon, ...exact: string[]): DockItem => ({
  label: 'Home',
  path: null,
  icon: lucide(icon),
  isActive: (p) => exact.includes(p),
});
const item = (label: string, path: string, icon: LucideIcon, ...also: string[]): DockItem => ({
  label,
  path,
  icon: lucide(icon),
  isActive: under(path, ...also),
});

const DOCKS: Partial<Record<UserRole, DockItem[]>> = {
  teacher: [
    home(Home, '/teacher'),
    item('Classes', '/teacher/classes', ClipboardCheck, '/teacher/attendance', '/teacher/history'),
    item('Timetable', '/teacher/timetable', Clock),
    item('Planner', '/teacher/planner', BookOpen, '/teacher/academic-plan', '/teacher/syllabus-tracker'),
    item('Marks', '/teacher/marks', Award),
    item('Papers', '/teacher/question-bank', FileText, '/teacher/worksheet-generator'),
  ],
  accountant: [
    home(Home, '/accountant'),
    item('Collect', '/accountant/collect-fee', Wallet),
    item('Records', '/accountant/fee-records', Receipt),
    item('Pending', '/accountant/pending-fees', AlertCircle),
    item('Expenses', '/accountant/expenses', Banknote),
    item('Salary', '/accountant/salary', Users),
  ],
  reception: [
    home(Home, '/reception'),
    item('Visitors', '/reception/visitors', DoorOpen),
    item('Follow-ups', '/reception/follow-ups', PhoneCall),
    item('Tasks', '/reception/tasks', ClipboardCheck),
    item('Attendance', '/reception/attendance', UserCheck),
    item('Reports', '/reception/reports', BarChart3),
  ],
  admin: [
    home(Home, '/administration', '/reception'),
    item('Students', '/students', GraduationCap),
    item('Attendance', '/attendance', ClipboardCheck),
    item('Timetable', '/timetable', Clock),
    item('Fees', '/fees', Wallet),
    item('Staff', '/admin/employees', Users, '/teachers'),
  ],
  academic_coordinator: [
    home(Home, '/coordinator'),
    item('Calendar', '/coordinator/calendar', CalendarDays),
    item('Syllabus', '/coordinator/syllabus', BookOpen),
    item('Plan', '/coordinator/academic-plan', ClipboardCheck),
    item('Exams', '/exams', Award),
  ],
};

/** Mobile sticky capsule dock. Role-aware: Principal keeps the original set,
 *  other roles get shortcuts to their own screens, roles without a config get none. */
export function MobileDock() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (!user?.role) return null;
  const isPrincipal = user.role === 'principal' || user.role === 'incharge';
  const items = isPrincipal ? PRINCIPAL_DOCK : DOCKS[user.role];
  if (!items) return null;

  const homePath = getHomePathForRole(user.role);
  const key = searchParams.get('page') || (location.pathname === '/principal' ? 'home' : location.pathname);

  return (
    <footer className="flex md:hidden shrink-0 bg-[#FBF8F3] items-center px-3 pb-2.5 pt-1 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <nav className="w-full bg-[#1B2A4E] rounded-[22px] px-2 py-1.5 flex items-center justify-around shadow-[0_8px_24px_rgba(27,42,78,0.3)] border border-white/10">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => navigate(it.path ?? homePath)}
            aria-label={it.label}
            className={cn(
              'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
              it.isActive(location.pathname, key) ? 'bg-[#2C4177]' : 'text-white/80 hover:text-white',
            )}
          >
            {it.icon}
          </button>
        ))}
      </nav>
    </footer>
  );
}
