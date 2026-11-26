// Pure substitute-ranking rules, kept free of database access so they can be
// tested directly.

export interface SubstituteSuggestion {
  teacherId: string;
  teacherName: string;
  teachesThisClass: boolean;
  freePeriodsToday: number;
}

export interface RankingInput {
  teachers: { teacherId: string; teacherName: string }[];
  /** Teachers assigned to the class that needs cover. */
  classTeacherIds: Set<string>;
  /** teacherId → slot ids already taken that day (own timetable + substitutions). */
  busySlots: Map<string, Set<string>>;
  /** Teachers who are on leave or marked absent that day. */
  absentIds: Set<string>;
  /** Teaching (non-break) slot ids that run on that day. */
  daySlotIds: string[];
  /** The period being covered. Teachers busy in it are never suggested. */
  slotId?: string;
  excludeTeacherId?: string;
}

/**
 * Who can cover a period, best first: teachers assigned to that class, then
 * everyone else; within each group, most free periods that day first.
 */
export function rankSubstitutes(input: RankingInput): SubstituteSuggestion[] {
  const { teachers, classTeacherIds, busySlots, absentIds, daySlotIds, slotId, excludeTeacherId } = input;

  return teachers
    .filter((t) => {
      if (t.teacherId === excludeTeacherId || absentIds.has(t.teacherId)) return false;
      return !(slotId && busySlots.get(t.teacherId)?.has(slotId));
    })
    .map((t) => {
      const busy = busySlots.get(t.teacherId);
      return {
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        teachesThisClass: classTeacherIds.has(t.teacherId),
        freePeriodsToday: daySlotIds.filter((id) => !busy?.has(id)).length,
      };
    })
    .sort((a, b) => {
      if (a.teachesThisClass !== b.teachesThisClass) return a.teachesThisClass ? -1 : 1;
      if (a.freePeriodsToday !== b.freePeriodsToday) return b.freePeriodsToday - a.freePeriodsToday;
      return a.teacherName.localeCompare(b.teacherName);
    });
}

/** "Class 10", "A" and "10-A" all compare equal. */
export function classKey(cls: string, section = ''): string {
  return `${cls.replace(/^\s*(class|grade)\s+/i, '')}${section}`.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
