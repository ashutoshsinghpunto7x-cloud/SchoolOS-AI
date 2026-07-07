import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Pencil, Trash2, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useTimetable, usePeriodSlots, useConflicts,
  useUpdateTimetableStatus, useDeleteTimetable,
} from '../hooks/useTimetable';
import { TimetableGrid } from '../components/TimetableGrid';
import { EntryEditDrawer } from '../components/EntryEditDrawer';
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
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);

  const ttConflicts = conflicts.filter((c) => c.timetableId === id);

  if (ttLoading || slotsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!tt) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-gray-500">Timetable not found.</p>
        <button type="button" onClick={() => navigate('/timetable')} className="text-blue-600 text-sm hover:underline">
          Back to Timetable
        </button>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[tt.status] ?? [];

  return (
    <div className="flex flex-col gap-5 px-6 py-6 max-w-screen-xl mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/timetable')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Timetable
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              Class {tt.class}-{tt.section}
            </h1>
            <TimetableStatusBadge status={tt.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {tt.academicYear}{tt.term ? ` · ${tt.term}` : ''}
            {tt.notes && <span className="ml-2 text-gray-400">· {tt.notes}</span>}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(`/timetable/${id}/edit`)}
              className="h-9 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50
                         flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors"
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
                  className="h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200
                             flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors
                             disabled:opacity-50"
                >
                  {statusPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Change Status
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1">
                    {availableTransitions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { updateStatus({ status: s }); setShowStatusMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
              className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100
                         text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Conflicts banner */}
      {ttConflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Weekly Schedule
          </p>
          {tt.status === 'draft' && isAdmin && (
            <p className="text-xs text-amber-600 font-medium">
              Click any cell to add or edit an entry
            </p>
          )}
        </div>
        <div className="p-4">
          {slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-gray-500 text-sm">No period slots configured.</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/timetable/periods')}
                  className="text-sm text-blue-600 hover:underline font-semibold"
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

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Timetable?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Timetable for Class {tt.class}-{tt.section} will be soft-deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTt(undefined, { onSuccess: () => navigate('/timetable') })}
                disabled={deletePending}
                className={cn(
                  'flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2',
                  'text-sm font-bold text-white transition-colors disabled:opacity-50',
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
