import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Open sidebar by default on desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={cn("flex h-screen overflow-hidden", isAccountant ? "bg-white" : "bg-[#F5F5F7]")}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content — offset by sidebar on desktop */}
      <div className={cn(
        'flex flex-1 flex-col min-h-screen overflow-hidden',
        'lg:ml-[260px]'
      )}>
        <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center py-24">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
