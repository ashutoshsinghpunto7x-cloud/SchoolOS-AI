import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Pencil, Trash2, ChevronDown, AlertTriangle, LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useTimetable, usePeriodSlots, useConflicts,
  useUpdateTimetableStatus, useDeleteTimetable,
} from '../hooks/useTimetable';
import { TimetableGrid } from '../components/TimetableGrid';
import { EntryEditDrawer } from '../components/EntryEditDrawer';
import { BulkAddDrawer } from '../components/BulkAddDrawer';
import { TimetableStatusBadge, STATUS_LABEL } from '../components/TimetableStatusBadge';
import type { PeriodSlot, TimetableEntry, TimetableStatus } from '@schoolos/types';

const STATUS_TRANSITIONS: Record<TimetableStatus, TimetableStatus[]> = {
  draft:     ['published'],
  published: ['archived', 'draft'],
  archived:  ['draft'],
};

export const TimetableGridPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'principal';

  const { data: tt,        isLoading: ttLoading }     = useTimetable(id!);
  const { data: slots = [], isLoading: slotsLoading } = usePeriodSlots();
  const { data: conflicts = [] }                       = useConflicts();

  const { mutate: updateStatus, isPending: statusPending } = useUpdateTimetableStatus(id!);
  const { mutate: deleteTt,     isPending: deletePending }  = useDeleteTimetable(id!);

  const [drawer, setDrawer] = useState<{
    dayOfWeek: number; slot: PeriodSlot; entry?: TimetableEntry;
  } | null>(null);
  const [bulkAddOpen, setBulkAddOpen]       = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);

  const ttConflicts = conflicts.filter((c) => c.timetableId === id);

  if (ttLoading || slotsLoading) {
    return (
      <div className="min-h-screen bg-[#0B0C12] flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-[#7C5CFF] animate-spin" />
      </div>
    );
  }

  if (!tt) {
    return (
      <div className="min-h-screen bg-[#0B0C12] flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-[#A8AFBF]">Timetable not found.</p>
        <button type="button" onClick={() => navigate('/timetable')} className="text-[#7C5CFF] text-sm hover:underline">
          Back to Timetable
        </button>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[tt.status] ?? [];

  return (
    <div className="min-h-screen bg-[#0B0C12] flex flex-col gap-5 px-6 py-6 max-w-screen-xl mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/timetable')}
        className="flex items-center gap-1.5 text-sm text-[#6D7485] hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Timetable
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">
              Class {tt.class}-{tt.section}
            </h1>
            <TimetableStatusBadge status={tt.status} />
          </div>
          <p className="text-sm text-[#A8AFBF] mt-1">
            {tt.academicYear}{tt.term ? ` · ${tt.term}` : ''}
            {tt.notes && <span className="ml-2 text-[#6D7485]">· {tt.notes}</span>}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {tt.status === 'draft' && slots.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkAddOpen(true)}
                className="h-9 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Bulk Add
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/timetable/${id}/edit`)}
              className="h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]
                         flex items-center gap-1.5 text-sm font-semibold text-[#A8AFBF] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Info
            </button>

            {availableTransitions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusMenu((v) => !v)}
                  disabled={statusPending}
                  className="h-9 px-4 rounded-xl bg-[#7C5CFF]/10 hover:bg-[#7C5CFF]/20 border border-[#7C5CFF]/25
                             flex items-center gap-1.5 text-sm font-semibold text-[#B9A9FF] transition-colors
                             disabled:opacity-50"
                >
                  {statusPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Change Status
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-10 z-20 w-44 bg-[#181B26] rounded-xl border border-white/[0.08] shadow-lg py-1">
                    {availableTransitions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { updateStatus({ status: s }); setShowStatusMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deletePending}
              className="h-9 px-3 rounded-xl border border-[#FF5B6A]/25 bg-[#FF5B6A]/10 hover:bg-[#FF5B6A]/20
                         text-[#FF5B6A] transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Conflicts banner */}
      {ttConflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-[#FF5B6A]/10 rounded-2xl border border-[#FF5B6A]/25">
          <AlertTriangle className="w-4 h-4 text-[#FF5B6A] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#FF5B6A]">
            <span className="font-bold">{ttConflicts.length} conflict{ttConflicts.length > 1 ? 's' : ''}: </span>
            {ttConflicts.map((c, i) => (
              <span key={i}>
                {c.conflictType === 'teacher' ? 'Teacher' : 'Room'} "{c.conflictValue}" double-booked (Day {c.dayOfWeek})
                {i < ttConflicts.length - 1 ? '; ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="bg-[#181B26] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <p className="text-sm font-semibold text-white">
            Weekly Schedule
          </p>
          {tt.status === 'draft' && isAdmin && (
            <p className="text-xs text-[#F5A524] font-medium">
              Click any cell to add or edit an entry
            </p>
          )}
        </div>
        <div className="p-4">
          {slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-[#A8AFBF] text-sm">No period slots configured.</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/timetable/periods')}
                  className="text-sm text-[#7C5CFF] hover:underline font-semibold"
                >
                  Set up periods →
                </button>
              )}
            </div>
          ) : (
            <TimetableGrid
              timetable={tt}
              slots={slots}
              conflicts={conflicts}
              onCellClick={isAdmin && tt.status === 'draft'
                ? (day, slot, entry) => setDrawer({ dayOfWeek: day, slot, entry })
                : undefined}
              readonly={!isAdmin || tt.status !== 'draft'}
            />
          )}
        </div>
      </div>

      {/* Entry edit drawer */}
      {drawer && (
        <EntryEditDrawer
          timetableId={id!}
          dayOfWeek={drawer.dayOfWeek}
          slot={drawer.slot}
          entry={drawer.entry}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Bulk add modal */}
      {bulkAddOpen && (
        <BulkAddDrawer
          timetable={tt}
          slots={slots}
          onClose={() => setBulkAddOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-[#181B26] border border-white/[0.08] rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Timetable?</h3>
            <p className="text-sm text-[#A8AFBF] mb-5">
              Timetable for Class {tt.class}-{tt.section} will be soft-deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-xl border border-white/[0.08] text-sm font-semibold text-[#A8AFBF] hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTt(undefined, { onSuccess: () => navigate('/timetable') })}
                disabled={deletePending}
                className={cn(
                  'flex-1 h-10 rounded-xl bg-[#FF5B6A] hover:opacity-90 flex items-center justify-center gap-2',
                  'text-sm font-bold text-white transition-opacity disabled:opacity-50',
                )}
              >
                {deletePending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
