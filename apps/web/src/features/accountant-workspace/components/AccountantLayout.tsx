import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, IndianRupee, Receipt, MoreHorizontal, Plus } from 'lucide-react';

const NAV = [
  { to: '/accountant',               icon: LayoutDashboard, label: 'Home',     end: true  },
  { to: '/accountant/pending-fees',  icon: Wallet,           label: 'Fees',     end: false },
  { to: '/accountant/salary',        icon: IndianRupee,      label: 'Salary',   end: false },
  { to: '/accountant/expenses',      icon: Receipt,          label: 'Expenses', end: false },
  { to: '/accountant/reports',       icon: MoreHorizontal,   label: 'More',     end: false },
];

export function AccountantLayout() {
  const navigate = useNavigate();

  return (
    <>
      <div className="pb-24 lg:pb-0">
        <Outlet />
      </div>

      {/* Floating action button — Collect Fee */}
      <button
        type="button"
        onClick={() => navigate('/accountant/collect-fee')}
        className="fixed z-40 bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white shadow-lg shadow-[#5B5CEB]/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Collect Fee"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Mobile-only bottom navigation */}
      <nav
        aria-label="Accountant navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) => (
                <div
                  className={`flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 ${
                    isActive ? 'text-[#5B5CEB]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div
                    className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive ? 'bg-[#5B5CEB]/10' : ''
                    }`}
                  >
                    <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
