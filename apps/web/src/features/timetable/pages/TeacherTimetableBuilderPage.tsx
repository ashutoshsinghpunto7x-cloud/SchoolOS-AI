import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, ChevronDown } from 'lucide-react';
import { usePeriodSlots } from '../hooks/useTimetable';
import {
  useTeacherTimetableFor, useGetOrCreateTeacherTimetable, useUpdateTeacherTimetableStatus,
} from '../hooks/useTeacherTimetable';
import { TimetableGrid } from '../components/TimetableGrid';
import { TeacherEntryEditDrawer } from '../components/TeacherEntryEditDrawer';
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
    <div className="flex flex-col gap-5 px-6 py-6 max-w-screen-xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/principal')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">Build or update an individual teacher's weekly schedule.</p>
      </div>

      {/* Teacher picker */}
      <div className="relative max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={selectedTeacher ? selectedTeacher.name : teacherSearch}
            onChange={(e) => { setTeacherSearch(e.target.value); setSelectedTeacher(null); setPickerOpen(true); }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Search teacher by name…"
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 bg-white"
          />
        </div>
        {pickerOpen && teacherOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
            {teacherOptions.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => selectTeacher(t._id, t.fullName)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
              >
                <p className="font-semibold">{t.fullName}</p>
                {t.department && <p className="text-xs text-gray-400">{t.department}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedTeacher && (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Search and select a teacher to build their timetable.</p>
        </div>
      )}

      {selectedTeacher && (creating || ttLoading) && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#5B21B6] animate-spin" />
        </div>
      )}

      {selectedTeacher && activeTt && gridTimetable && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-800">{selectedTeacher.name}</h2>
                <TimetableStatusBadge status={activeTt.status} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{activeTt.academicYear}</p>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs text-amber-600 font-medium">Click any cell to add or edit an entry</p>
              {availableTransitions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusMenu((v) => !v)}
                    disabled={statusPending}
                    className="h-9 px-4 rounded-xl bg-[#A855F7]/10 hover:bg-[#A855F7]/20 border border-[#A855F7]/20
                               flex items-center gap-1.5 text-sm font-semibold text-[#5B21B6] transition-colors
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
            </div>
          </div>

          <div className="p-4">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-gray-500 text-sm">No period slots configured.</p>
                <button
                  type="button"
                  onClick={() => navigate('/timetable/periods')}
                  className="text-sm text-[#5B21B6] hover:underline font-semibold"
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
    </div>
  );
};
