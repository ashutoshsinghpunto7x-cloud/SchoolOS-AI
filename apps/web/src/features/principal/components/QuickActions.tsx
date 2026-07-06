import {
  UserPlus,
  CalendarCheck,
  IndianRupee,
  LayoutGrid,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { label: 'New Admission',     icon: UserPlus,       path: '/students/new',        color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  { label: 'View Attendance',   icon: CalendarCheck,  path: '/attendance',           color: 'text-green-600 bg-green-50 hover:bg-green-100' },
  { label: 'View Fees',         icon: IndianRupee,    path: '/fees',                 color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
  { label: 'View Timetable',    icon: LayoutGrid,     path: '/timetable',            color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  { label: 'View Calendar',     icon: CalendarDays,   path: '/calendar',             color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
  { label: 'Admissions CRM',    icon: ClipboardList,  path: '/enquiries',            color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
  { label: 'Review Edit Requests', icon: ClipboardCheck, path: '/principal/approvals', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
] as const;

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${action.color}`}
            type="button"
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            <span className="leading-tight">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};
