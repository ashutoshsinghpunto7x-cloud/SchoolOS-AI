import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, ChevronDown, LayoutGrid } from 'lucide-react';
import { usePeriodSlots } from '../hooks/useTimetable';
import {
  useTeacherTimetableFor, useGetOrCreateTeacherTimetable, useUpdateTeacherTimetableStatus,
} from '../hooks/useTeacherTimetable';
import { TimetableGrid } from '../components/TimetableGrid';
import { TeacherEntryEditDrawer } from '../components/TeacherEntryEditDrawer';
import { TeacherBulkAddDrawer } from '../components/TeacherBulkAddDrawer';
import { TimetableStatusBadge, STATUS_LABEL } from '../components/TimetableStatusBadge';
import { useTeacherList } from '@/features/teachers/hooks/useTeachers';
import type { PeriodSlot, TeacherTimetableEntry, TeacherTimetableStatus, Timetable } from '@schoolos/types';

const currentAcademicYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

export const TeacherTimetableBuilderPage = () => {
  const navigate = useNavigate();

  const [teacherSearch, setTeacherSearch] = useState('');
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; name: string } | null>(null);

  const { data: teacherOptions = [] } = useTeacherList(teacherSearch);
  const { data: slots = [] }          = usePeriodSlots();

  const { data: tt, isLoading: ttLoading } = useTeacherTimetableFor(selectedTeacher?.id ?? '');
  const { mutate: getOrCreate, isPending: creating } = useGetOrCreateTeacherTimetable();

  const [drawer, setDrawer] = useState<{ dayOfWeek: number; slot: PeriodSlot; entry?: TeacherTimetableEntry } | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const activeTt = tt ?? null;
  const { mutate: updateStatus, isPending: statusPending } =
    useUpdateTeacherTimetableStatus(activeTt?._id ?? '', selectedTeacher?.id ?? '');

  // TimetableGrid expects a `Timetable`-shaped object; shim class/section into
  // the `teacherName` display slot so the shared grid component can be reused
  // as-is instead of duplicating its rendering logic.
  const gridTimetable: Timetable | null = useMemo(() => {
    if (!activeTt) return null;
    return {
      ...activeTt,
      class: '', section: '',
      entries: activeTt.entries.map((e) => ({
        ...e,
        teacherName: e.class || e.section ? `Class ${e.class ?? '—'}-${e.section ?? '—'}` : undefined,
      })),
    } as unknown as Timetable;
  }, [activeTt]);

  function selectTeacher(id: string, name: string) {
    setSelectedTeacher({ id, name });
    setPickerOpen(false);
    setTeacherSearch('');
    getOrCreate({ teacherId: id, teacherName: name, academicYear: currentAcademicYear() });
  }

  const availableTransitions: TeacherTimetableStatus[] =
    activeTt?.status === 'draft' ? ['published'] : activeTt?.status === 'published' ? ['draft'] : [];

  return (
    <div className="min-h-screen w-full bg-[var(--tt-bg)] flex flex-col gap-5 px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/principal')}
        className="flex items-center gap-1.5 text-sm text-[var(--tt-text-muted)] hover:text-[var(--tt-text-primary)] transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-[var(--tt-text-primary)]">Teacher Timetable</h1>
        <p className="text-sm text-[var(--tt-text-secondary)] mt-1">Build or update an individual teacher's weekly schedule.</p>
      </div>

      {/* Teacher picker */}
      <div className="relative max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tt-text-muted)]" />
          <input
            value={selectedTeacher ? selectedTeacher.name : teacherSearch}
            onChange={(e) => { setTeacherSearch(e.target.value); setSelectedTeacher(null); setPickerOpen(true); }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Search teacher by name…"
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-[var(--tt-border)] text-sm bg-[var(--tt-card)] text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)]
                       focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25"
          />
        </div>
        {pickerOpen && teacherOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-[var(--tt-card)] rounded-xl border border-[var(--tt-border)] shadow-lg max-h-72 overflow-y-auto">
            {teacherOptions.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => selectTeacher(t._id, t.fullName)}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--tt-text-primary)] hover:bg-[var(--tt-hover)] border-b border-[var(--tt-border)] last:border-b-0"
              >
                <p className="font-semibold">{t.fullName}</p>
                {t.department && <p className="text-xs text-[var(--tt-text-muted)]">{t.department}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedTeacher && (
        <div className="flex items-center justify-center py-20">
          <p className="text-[var(--tt-text-muted)] text-sm">Search and select a teacher to build their timetable.</p>
        </div>
      )}

      {selectedTeacher && (creating || ttLoading) && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#7C5CFF] animate-spin" />
        </div>
      )}

      {selectedTeacher && activeTt && gridTimetable && (
        <div className="shrink-0 bg-[var(--tt-card)] rounded-2xl border border-[var(--tt-border)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--tt-border)] flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[var(--tt-text-primary)]">{selectedTeacher.name}</h2>
                <TimetableStatusBadge status={activeTt.status} />
              </div>
              <p className="text-xs text-[var(--tt-text-muted)] mt-0.5">{activeTt.academicYear}</p>
            </div>

            <div className="flex items-center gap-2">
              {activeTt.status === 'draft' && slots.length > 0 && (
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
              <p className="text-xs text-[#F5A524] font-medium">Click any cell to add or edit an entry</p>
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
                    <div className="absolute right-0 top-10 z-20 w-44 bg-[var(--tt-card)] rounded-xl border border-[var(--tt-border)] shadow-lg py-1">
                      {availableTransitions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { updateStatus({ status: s }); setShowStatusMenu(false); }}
                          className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--tt-text-primary)] hover:bg-[var(--tt-hover)]"
                        >
                          → {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-[var(--tt-text-secondary)] text-sm">No period slots configured.</p>
                <button
                  type="button"
                  onClick={() => navigate('/timetable/periods')}
                  className="text-sm text-[#7C5CFF] hover:underline font-semibold"
                >
                  Set up periods →
                </button>
              </div>
            ) : (
              <TimetableGrid
                timetable={gridTimetable}
                slots={slots}
                onCellClick={(day, slot, gridEntry) => {
                  const realEntry = activeTt.entries.find((e) => e.dayOfWeek === day && e.slotId === slot._id);
                  setDrawer({ dayOfWeek: day, slot, entry: gridEntry ? realEntry : undefined });
                }}
              />
            )}
          </div>
        </div>
      )}

      {drawer && activeTt && (
        <TeacherEntryEditDrawer
          timetableId={activeTt._id}
          teacherId={selectedTeacher!.id}
          allEntries={activeTt.entries}
          dayOfWeek={drawer.dayOfWeek}
          slot={drawer.slot}
          entry={drawer.entry}
          onClose={() => setDrawer(null)}
        />
      )}

      {bulkAddOpen && activeTt && (
        <TeacherBulkAddDrawer
          timetable={activeTt}
          slots={slots}
          onClose={() => setBulkAddOpen(false)}
        />
      )}
    </div>
  );
};
