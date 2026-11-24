import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  CompanionBuddy,
  SIRI_ORB_SIZE,
  SiriMiniOrb,
  useStaticOrbBottom,
} from './CompanionBuddy';
import {
  companionConfigFor,
  findCompanionRoute,
  type CompanionConfig,
} from './companionConfigs';
import { TeacherAssistantWidget } from './TeacherAssistantWidget';

function QuickGuideAssistant({ config }: { config: CompanionConfig }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const orbBottom = useStaticOrbBottom(config);

  const currentRoute = useMemo(() => findCompanionRoute(config, pathname), [config, pathname]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return config.routes.filter((r) => {
      if (seen.has(r.path)) return false;
      seen.add(r.path);
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        (r.hint && r.hint.toLowerCase().includes(q))
      );
    });
  }, [config.routes, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || target.closest('[data-siri-orb="true"]')) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          style={{ bottom: `calc(${orbBottom + SIRI_ORB_SIZE + 12}px + env(safe-area-inset-bottom, 0px))` }}
          className="fixed right-4 sm:right-6 z-50 w-[362px] max-w-[calc(100vw-32px)] max-h-[min(482px,calc(100vh-120px))] p-[2px] rounded-[22px] bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#D9822B] shadow-[0_14px_42px_rgba(27,42,78,0.18)] flex flex-col font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="flex-1 min-h-0 bg-white rounded-[20px] flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-white border-b border-[#EFEAE0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <SiriMiniOrb />
              <h2 id={titleId} className="text-[14px] font-semibold text-[#1B2A4E] tracking-tight m-0">
                Assistant
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="h-7 w-7 rounded-full text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#F5F1E8] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FBF8F3]/60">
            {currentRoute && (
              <div className="rounded-2xl bg-white border border-[#E8E2D6] px-3.5 py-2.5">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#7B859D]">
                  Current Page
                </p>
                <p className="m-0 mt-0.5 text-[13.5px] font-semibold text-[#1B2A4E]">
                  {currentRoute.label}
                </p>
                {currentRoute.hint && (
                  <p className="m-0 mt-0.5 text-[12.5px] leading-relaxed text-[#55607A]">
                    {currentRoute.hint}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="m-0 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#7B859D]">
                Quick Jump
              </p>
              <div className="space-y-1">
                {filteredRoutes.slice(0, 8).map((r) => (
                  <button
                    key={r.path}
                    type="button"
                    onClick={() => go(r.path)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#E8E2D6] hover:bg-[#F5F1E8] text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-[13px] font-medium text-[#1B2A4E] truncate">{r.label}</p>
                      {r.hint && (
                        <p className="m-0 text-[11.5px] text-[#55607A] truncate">{r.hint}</p>
                      )}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[#7B859D]" />
                  </button>
                ))}
                {filteredRoutes.length === 0 && (
                  <p className="m-0 px-2 py-4 text-center text-[12.5px] text-[#7B859D]">
                    No matching screens found.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-white border-t border-[#EFEAE0] shrink-0">
            <div className="flex items-center gap-2 bg-[#FBF8F3] border border-[#E8E2D6] focus-within:border-[#1B2A4E]/40 focus-within:bg-white rounded-full px-3.5 py-1.5 transition-colors">
              <Search className="w-3.5 h-3.5 text-[#7B859D] shrink-0" aria-hidden="true" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find any page…"
                aria-label="Find any page"
                className="flex-1 min-w-0 bg-transparent text-[13px] text-[#1B2A4E] placeholder:text-[#8A93A8] outline-none"
              />
            </div>
          </div>
          </div>
        </div>
      )}

      <CompanionBuddy
        config={config}
        open={open}
        label="SchoolOS Assistant"
        onActivate={() => setOpen((v) => !v)}
      />
    </>
  );
}

// Companion orb + minimalist assistant for every dashboard except the principal's
// (mounted by PrincipalAssistantWidget in AppLayout).
export const RoleCompanion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const config = companionConfigFor(role);
  if (!config || role === 'principal' || role === 'incharge') return null;

  if (role === 'parent') {
    return (
      <CompanionBuddy
        config={config}
        label="Ask about your child"
        onActivate={() => navigate('/parent', { state: { openAssistant: true } })}
      />
    );
  }
  if (role === 'teacher') return <TeacherAssistantWidget />;
  return <QuickGuideAssistant config={config} />;
};
