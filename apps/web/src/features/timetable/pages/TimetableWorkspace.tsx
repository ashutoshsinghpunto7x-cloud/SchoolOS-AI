import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Loader2, CalendarClock, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { BackLink } from '@/components/workspace/BackLink';
import { useTimetables, useConflicts } from '../hooks/useTimetable';
import { TimetableStatusBadge } from '../components/TimetableStatusBadge';
import type { TimetableListOptions, TimetableStatus } from '@schoolos/types';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const STATUSES: TimetableStatus[] = ['draft', 'published', 'archived'];

const selectCls = `h-10 pl-3 pr-8 rounded-xl border border-white/[0.08] bg-[#181B26] text-sm text-white
  focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25 cursor-pointer`;

export const TimetableWorkspace = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin' || user?.role === 'principal';
  // Principal's sidebar is an overlay (not permanently docked), so pages it
  // links to need an explicit way back — admin's sidebar is always visible.
  const isPrincipal = user?.role === 'principal';

  const [filters, setFilters] = useState<TimetableListOptions>({ status: 'published' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTimetables({ ...filters, page, limit: 20 });
  const { data: conflicts = [] } = useConflicts();

  const timetables = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-[#0B0C12] flex flex-col gap-6 px-6 py-6 max-w-screen-xl mx-auto">
      {isPrincipal && <BackLink to="/principal" label="Principal Dashboard" />}
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Timetable</h1>
          <p className="text-sm text-[#A8AFBF] mt-0.5">Manage class schedules and teacher assignments</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/timetable/periods')}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03]
                         text-sm font-semibold text-[#A8AFBF] hover:bg-white/[0.06] transition-colors"
            >
              <Settings className="w-4 h-4" />
              Period Setup
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/timetable/substitutes')}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03]
                       text-sm font-semibold text-[#A8AFBF] hover:bg-white/[0.06] transition-colors"
          >
            <CalendarClock className="w-4 h-4" />
            Substitutes
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/timetable/new')}
              className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}
            >
              <Plus className="w-4 h-4" />
              New Timetable
            </button>
          )}
        </div>
      </div>

      {/* Conflict alert */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-[#FF5B6A]/10 rounded-2xl border border-[#FF5B6A]/25">
          <AlertTriangle className="w-5 h-5 text-[#FF5B6A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#FF5B6A]">
              {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} detected
            </p>
            <p className="text-sm text-[#FF5B6A]/80 mt-0.5">
              Review timetables with teacher or room double-bookings.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status ?? ''}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value as TimetableStatus || undefined })); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        <select
          value={filters.class ?? ''}
          onChange={(e) => { setFilters((f) => ({ ...f, class: e.target.value || undefined })); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>

        <input
          value={filters.academicYear ?? ''}
          onChange={(e) => { setFilters((f) => ({ ...f, academicYear: e.target.value || undefined })); setPage(1); }}
          placeholder="Academic Year (e.g. 2024-25)"
          className="h-10 px-3 rounded-xl border border-white/[0.08] bg-[#181B26] text-sm text-white placeholder:text-[#6D7485]
                     focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25 w-52"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#7C5CFF] animate-spin" />
        </div>
      ) : timetables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CalendarClock className="w-12 h-12 text-[#6D7485]" />
          <p className="text-base font-semibold text-[#A8AFBF]">No timetables found</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/timetable/new')}
              className="text-sm text-[#7C5CFF] hover:underline font-semibold"
            >
              Create the first timetable →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {timetables.map((tt) => {
            const hasConflict = conflicts.some((c) => c.timetableId === tt._id);
            return (
              <motion.button
                key={tt._id}
                type="button"
                onClick={() => navigate(`/timetable/${tt._id}`)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="text-left bg-[#181B26] rounded-[20px] border border-white/[0.08] shadow-sm
                           hover:border-[#7C5CFF]/30 transition-colors duration-200 p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Class {tt.class}-{tt.section}
                    </h3>
                    <p className="text-sm text-[#A8AFBF] mt-0.5">{tt.academicYear}{tt.term ? ` · ${tt.term}` : ''}</p>
                  </div>
                  <TimetableStatusBadge status={tt.status} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6D7485]">{tt.entries.length} entries</p>
                  {hasConflict && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#FF5B6A]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Conflict
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-9 px-4 rounded-xl border border-white/[0.08] text-sm font-semibold
                       text-[#A8AFBF] hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#6D7485]">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-9 px-4 rounded-xl border border-white/[0.08] text-sm font-semibold
                       text-[#A8AFBF] hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
