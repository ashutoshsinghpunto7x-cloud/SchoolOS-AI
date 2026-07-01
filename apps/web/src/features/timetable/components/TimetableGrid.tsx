import { cn } from '@/lib/utils';
import type { Timetable, PeriodSlot, ConflictInfo, TimetableEntry } from '@schoolos/types';

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableGridProps {
  timetable: Timetable;
  slots: PeriodSlot[];
  conflicts?: ConflictInfo[];
  onCellClick?: (dayOfWeek: number, slot: PeriodSlot, entry?: TimetableEntry) => void;
  readonly?: boolean;
}

function getEntry(timetable: Timetable, dayOfWeek: number, slotId: string): TimetableEntry | undefined {
  return timetable.entries.find((e) => e.dayOfWeek === dayOfWeek && e.slotId === slotId);
}

function hasConflict(conflicts: ConflictInfo[], timetableId: string, dayOfWeek: number, slotId: string): boolean {
  return conflicts.some(
    (c) => c.timetableId === timetableId && c.dayOfWeek === dayOfWeek && c.slotId === slotId,
  );
}

const schedulableDays = (slots: PeriodSlot[]): number[] => {
  const days = new Set<number>();
  for (const slot of slots) slot.daysApplicable.forEach((d) => days.add(d));
  return Array.from(days).sort();
};

export const TimetableGrid = ({
  timetable, slots, conflicts = [], onCellClick, readonly = false,
}: TimetableGridProps) => {
  const days    = schedulableDays(slots);
  const ordered = [...slots].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[600px]">
        <thead>
          <tr>
            <th className="w-28 px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              Period
            </th>
            {days.map((d) => (
              <th key={d} className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                <span className="hidden sm:inline">{DAY_FULL[d]}</span>
                <span className="sm:hidden">{DAY_NAMES[d]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ordered.map((slot) => (
            <tr key={slot._id} className={cn(slot.isBreak ? 'bg-amber-50/40' : 'hover:bg-gray-50/50 transition-colors')}>
              <td className="px-3 py-3 border-r border-gray-100">
                <p className="text-xs font-bold text-gray-700 leading-tight">{slot.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{slot.startTime} – {slot.endTime}</p>
                {slot.isBreak && (
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Break</span>
                )}
              </td>
              {days.map((day) => {
                if (!slot.daysApplicable.includes(day)) {
                  return <td key={day} className="px-2 py-2 bg-gray-50/60 border-r border-gray-100 last:border-r-0" />;
                }
                if (slot.isBreak) {
                  return (
                    <td key={day} className="px-2 py-2 border-r border-gray-100 last:border-r-0">
                      <div className="flex items-center justify-center h-12 text-xs text-amber-500 font-medium">
                        Break
                      </div>
                    </td>
                  );
                }

                const entry    = getEntry(timetable, day, slot._id);
                const conflict = hasConflict(conflicts, timetable._id, day, slot._id);
                const empty    = !entry;

                return (
                  <td
                    key={day}
                    onClick={!readonly ? () => onCellClick?.(day, slot, entry) : undefined}
                    className={cn(
                      'px-2 py-2 border-r border-gray-100 last:border-r-0 align-top',
                      !readonly && 'cursor-pointer hover:bg-blue-50/60 transition-colors',
                      conflict && 'bg-red-50/70 ring-1 ring-inset ring-red-300',
                    )}
                  >
                    {empty ? (
                      <div className={cn(
                        'flex items-center justify-center h-14 rounded-lg border-2 border-dashed',
                        readonly ? 'border-gray-100' : 'border-gray-200 hover:border-blue-300',
                      )}>
                        {!readonly && (
                          <span className="text-[11px] text-gray-400 font-medium">+ Add</span>
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        'p-2 rounded-lg h-14 flex flex-col justify-between',
                        conflict ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100',
                      )}>
                        <p className={cn(
                          'text-xs font-bold leading-tight truncate',
                          conflict ? 'text-red-800' : 'text-blue-900',
                        )}>
                          {entry?.subjectName}
                        </p>
                        {entry?.teacherName && (
                          <p className={cn(
                            'text-[11px] leading-tight truncate',
                            conflict ? 'text-red-600' : 'text-blue-600',
                          )}>
                            {entry.teacherName}
                          </p>
                        )}
                        {entry?.roomNumber && (
                          <p className="text-[10px] text-gray-500 leading-tight truncate">
                            Room {entry.roomNumber}
                          </p>
                        )}
                        {conflict && (
                          <span className="text-[10px] font-bold text-red-600 uppercase">Conflict</span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
