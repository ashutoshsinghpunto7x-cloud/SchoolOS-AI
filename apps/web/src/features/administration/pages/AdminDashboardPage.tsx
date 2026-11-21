import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

const ADMIN_QUICK_LINKS: { label: string; path: string; d: string }[] = [
  { label: 'Users', path: '/administration/users', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Roles', path: '/administration/roles', d: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { label: 'Classes', path: '/administration/classes', d: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
  { label: 'Automation', path: '/administration/automation', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { label: 'Recovery', path: '/administration/recovery-requests', d: 'M15 7a4 4 0 1 1-7.8 1.2L3 12.4V16h3.6l1.2-1.2H10v-2.2l1.4-1.4A4 4 0 0 1 15 7z' },
  { label: 'Employees', path: '/admin/employees', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6' },
  { label: 'QR Scan', path: '/admin/attendance-qr', d: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10' },
  { label: 'ID Cards', path: '/admin/id-cards', d: 'M3 5h18v14H3zM7 10h4M7 14h6M15 10h2v4h-2z' },
  { label: 'Payroll', path: '/admin/payroll', d: 'M6 3h12M6 8h12M6 13l7 8M6 13h5a4 4 0 0 0 0-8H6' },
  { label: 'Timetable', path: '/timetable', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  { label: 'Transport', path: '/transport', d: 'M5 4h14v13H5zM5 11h14M8 17v3M16 17v3' },
  { label: 'Settings', path: '/settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4' },
];

const SYSTEM_LINKS = [
  { label: 'Manage users & accounts', count: 'Open', path: '/administration/users' },
  { label: 'Roles & permissions', count: 'Open', path: '/administration/roles' },
  { label: 'Automation jobs', count: 'Open', path: '/administration/automation' },
  { label: 'Account recovery requests', count: 'Open', path: '/administration/recovery-requests' },
];

const HR_OPS_LINKS = [
  { label: 'Employees directory', count: 'HR', path: '/admin/employees' },
  { label: 'Staff QR attendance', count: 'Scan', path: '/admin/attendance-qr' },
  { label: 'ID cards & QR management', count: 'Cards', path: '/admin/id-cards' },
  { label: 'Staff payroll & transport', count: 'Ops', path: '/admin/payroll' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.firstName ?? '';
  const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

  return (
    <div className="flex-1 w-full bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">
            Pick up where you left off.
          </p>
        </div>

        {/* Circular Quick-Launch Row */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3">
          {ADMIN_QUICK_LINKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.path)}
              className="group flex flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={q.d} />
                </svg>
              </span>
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/administration/users')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">Users &amp; access</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">Staff</div>
            <span className="text-[11px] font-semibold text-emerald-600">
              Manage accounts &amp; permissions
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/employees')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">HR &amp; payroll</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">HR</div>
            <span className="text-[11px] font-semibold text-amber-600">
              Employees, QR attendance &amp; salaries
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/administration/automation')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">System &amp; jobs</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">Active</div>
            <span className="text-[11px] font-semibold text-[#254A9A]">
              Automation &amp; recovery queue
            </span>
          </button>
        </div>

        {/* 2-Column List Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between pb-1">
              <div className="text-[16px] font-bold text-[#1B2A4E]">Administration</div>
              <button
                type="button"
                onClick={() => navigate('/administration/users')}
                className="text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer"
              >
                Manage users →
              </button>
            </div>
            {SYSTEM_LINKS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => navigate(r.path)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                <span className="min-w-6 h-6 px-2.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-[#F3EEE3] text-[#55607A]">
                  {r.count}
                </span>
              </button>
            ))}
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">HR &amp; operations</div>
            {HR_OPS_LINKS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => navigate(r.path)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                <span className="min-w-6 h-6 px-2.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-[#F3EEE3] text-[#55607A]">
                  {r.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
