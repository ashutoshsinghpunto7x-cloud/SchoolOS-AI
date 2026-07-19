import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Timetable, PeriodSlot, ConflictInfo, TimetableEntry } from '@schoolos/types';
import { subjectAccent } from '../theme';

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
    <div className="max-h-[70vh] overflow-y-auto overflow-x-auto rounded-[20px] border border-white/[0.08] bg-[#181B26]">
      <table className="w-full text-sm border-collapse min-w-[600px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-28 px-3 py-3 text-left text-xs font-bold text-[#6D7485] uppercase tracking-wider bg-[#12141D] border-b border-white/[0.08]">
              Period
            </th>
            {days.map((d) => (
              <th key={d} className="px-3 py-3 text-center text-xs font-bold text-[#A8AFBF] uppercase tracking-wider bg-[#12141D] border-b border-white/[0.08]">
                <span className="hidden sm:inline">{DAY_FULL[d]}</span>
                <span className="sm:hidden">{DAY_NAMES[d]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {ordered.map((slot) => (
            <tr key={slot._id} className={cn(slot.isBreak ? 'bg-[#F5A524]/[0.06]' : 'hover:bg-white/[0.02] transition-colors')}>
              <td className="px-3 py-3 border-r border-white/[0.06]">
                <p className="text-xs font-bold text-white leading-tight">{slot.name}</p>
                <p className="text-[11px] text-[#6D7485] mt-0.5">{slot.startTime} – {slot.endTime}</p>
                {slot.isBreak && (
                  <span className="text-[10px] font-semibold text-[#F5A524] uppercase tracking-wider">Break</span>
                )}
              </td>
              {days.map((day) => {
                if (!slot.daysApplicable.includes(day)) {
                  return <td key={day} className="px-2 py-2 bg-[#12141D]/60 border-r border-white/[0.06] last:border-r-0" />;
                }
                if (slot.isBreak) {
                  return (
                    <td key={day} className="px-2 py-2 border-r border-white/[0.06] last:border-r-0">
                      <div className="flex items-center justify-center h-12 text-xs text-[#F5A524] font-medium">
                        Break
                      </div>
                    </td>
                  );
                }

                const entry    = getEntry(timetable, day, slot._id);
                const conflict = hasConflict(conflicts, timetable._id, day, slot._id);
                const empty    = !entry;
                const accent   = entry ? subjectAccent(entry.subjectName) : null;

                return (
                  <td
                    key={day}
                    onClick={!readonly ? () => onCellClick?.(day, slot, entry) : undefined}
                    className={cn(
                      'px-2 py-2 border-r border-white/[0.06] last:border-r-0 align-top',
                      !readonly && 'cursor-pointer',
                      conflict && 'bg-[#FF5B6A]/[0.08] ring-1 ring-inset ring-[#FF5B6A]/40',
                    )}
                  >
                    {empty ? (
                      <div className={cn(
                        'flex items-center justify-center h-14 rounded-xl border-2 border-dashed transition-colors',
                        readonly ? 'border-white/[0.06]' : 'border-white/10 hover:border-[#7C5CFF]/50 hover:bg-[#7C5CFF]/5',
                      )}>
                        {!readonly && (
                          <span className="text-[11px] text-[#6D7485] font-medium">+ Add</span>
                        )}
                      </div>
                    ) : (
                      <motion.div
                        whileHover={!readonly ? { y: -2 } : undefined}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={cn(
                          'p-2 rounded-xl h-14 flex flex-col justify-between border',
                          conflict && 'bg-[#FF5B6A]/10 border-[#FF5B6A]/30',
                        )}
                        style={!conflict ? { background: accent!.bg, borderColor: accent!.border } : undefined}
                      >
                        <p className={cn(
                          'text-xs font-bold leading-tight truncate',
                          conflict ? 'text-[#FF5B6A]' : '',
                        )}
                          style={!conflict ? { color: accent!.text } : undefined}
                        >
                          {entry?.subjectName}
                        </p>
                        {entry?.teacherName && (
                          <p className={cn(
                            'text-[11px] leading-tight truncate',
                            conflict ? 'text-[#FF5B6A]/80' : 'text-[#A8AFBF]',
                          )}>
                            {entry.teacherName}
                          </p>
                        )}
                        {entry?.roomNumber && (
                          <p className="text-[10px] text-[#6D7485] leading-tight truncate">
                            Room {entry.roomNumber}
                          </p>
                        )}
                        {conflict && (
                          <span className="text-[10px] font-bold text-[#FF5B6A] uppercase">Conflict</span>
                        )}
                      </motion.div>
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
