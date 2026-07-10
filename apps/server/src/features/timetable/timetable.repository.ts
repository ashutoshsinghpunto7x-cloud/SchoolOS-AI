import { Timetable, ITimetable, ITimetableEntry, TimetableStatus } from './timetable.model';

export interface CreateTimetableData {
  schoolId: string;
  class: string;
  section: string;
  academicYear: string;
  term?: string;
  notes?: string;
  createdBy: string;
}

export interface FindTimetablesOptions {
  page?: number;
  limit?: number;
  class?: string;
  section?: string;
  academicYear?: string;
  status?: TimetableStatus;
}

export interface ConflictInfo {
  timetableId: string;
  class: string;
  section: string;
  dayOfWeek: number;
  slotId: string;
  conflictType: 'teacher' | 'room';
  conflictValue: string;
}

export const timetableRepository = {
  async create(data: CreateTimetableData): Promise<ITimetable> {
    const timetable = new Timetable(data);
    return timetable.save();
  },

  async findById(id: string, schoolId: string): Promise<ITimetable | null> {
    return Timetable.findOne({ _id: id, schoolId, isDeleted: false }).lean<ITimetable>();
  },

  async findByClassSection(
    schoolId: string,
    cls: string,
    section: string,
    academicYear: string,
  ): Promise<ITimetable | null> {
    return Timetable.findOne({
      schoolId, class: cls, section, academicYear, isDeleted: false,
    }).lean<ITimetable>();
  },

  async findAll(schoolId: string, opts: FindTimetablesOptions = {}) {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;
    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.class)        query.class        = opts.class;
    if (opts.section)      query.section      = opts.section;
    if (opts.academicYear) query.academicYear = opts.academicYear;
    if (opts.status)       query.status       = opts.status;

    const [timetables, total] = await Promise.all([
      Timetable.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ITimetable[]>(),
      Timetable.countDocuments(query),
    ]);
    return { timetables, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<ITimetable> & { updatedBy?: string },
  ): Promise<ITimetable | null> {
    return Timetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<ITimetable>();
  },

  async upsertEntry(
    id: string,
    schoolId: string,
    entry: ITimetableEntry & { updatedBy: string },
  ): Promise<ITimetable | null> {
    const { updatedBy, ...entryData } = entry;
    const existing = await Timetable.findOne({
      _id: id, schoolId, isDeleted: false,
      'entries.dayOfWeek': entryData.dayOfWeek,
      'entries.slotId':    entryData.slotId,
    });

    if (existing) {
      return Timetable.findOneAndUpdate(
        { _id: id, schoolId, isDeleted: false,
          'entries.dayOfWeek': entryData.dayOfWeek,
          'entries.slotId':    entryData.slotId },
        { $set: { 'entries.$': entryData, updatedBy } },
        { new: true },
      ).lean<ITimetable>();
    }
    return Timetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $push: { entries: entryData }, $set: { updatedBy } },
      { new: true },
    ).lean<ITimetable>();
  },

  async removeEntry(
    id: string,
    schoolId: string,
    dayOfWeek: number,
    slotId: string,
    updatedBy: string,
  ): Promise<ITimetable | null> {
    return Timetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      {
        $pull: { entries: { dayOfWeek, slotId } },
        $set:  { updatedBy },
      },
      { new: true },
    ).lean<ITimetable>();
  },

  async bulkUpdateEntries(
    id: string,
    schoolId: string,
    entries: ITimetableEntry[],
    updatedBy: string,
  ): Promise<ITimetable | null> {
    return Timetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { entries, updatedBy } },
      { new: true },
    ).lean<ITimetable>();
  },

  async updateStatus(
    id: string,
    schoolId: string,
    status: TimetableStatus,
    updatedBy: string,
    extra: Record<string, unknown> = {},
  ): Promise<ITimetable | null> {
    return Timetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status, updatedBy, ...extra } },
      { new: true },
    ).lean<ITimetable>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Timetable.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  // ── Conflict detection ────────────────────────────────────────────────────

  async findConflictingTeacher(
    schoolId: string,
    excludeId: string,
    dayOfWeek: number,
    slotId: string,
    teacherId: string,
  ): Promise<ITimetable | null> {
    return Timetable.findOne({
      schoolId,
      _id:      { $ne: excludeId },
      status:   { $in: ['draft', 'published'] },
      isDeleted: false,
      entries:  { $elemMatch: { dayOfWeek, slotId, teacherId } },
    }).lean<ITimetable>();
  },

  async findConflictingRoom(
    schoolId: string,
    excludeId: string,
    dayOfWeek: number,
    slotId: string,
    roomNumber: string,
  ): Promise<ITimetable | null> {
    return Timetable.findOne({
      schoolId,
      _id:       { $ne: excludeId },
      status:    { $in: ['draft', 'published'] },
      isDeleted: false,
      entries:   { $elemMatch: { dayOfWeek, slotId, roomNumber } },
    }).lean<ITimetable>();
  },

  /** Most recently updated active timetable for a class/section, regardless of academic year — used for substitute suggestions. */
  async findByClassSectionAnyYear(schoolId: string, cls: string, section: string): Promise<ITimetable | null> {
    return Timetable.findOne({
      schoolId, class: cls, section, isDeleted: false, status: { $in: ['draft', 'published'] },
    }).sort({ updatedAt: -1 }).lean<ITimetable>();
  },

  async getTeacherSchedule(schoolId: string, teacherId: string): Promise<ITimetable[]> {
    return Timetable.find({
      schoolId,
      isDeleted: false,
      status:    { $in: ['draft', 'published'] },
      'entries.teacherId': teacherId,
    }).lean<ITimetable[]>();
  },

  async detectAllConflicts(schoolId: string): Promise<ConflictInfo[]> {
    const active = await Timetable.find({
      schoolId,
      isDeleted: false,
      status: { $in: ['draft', 'published'] },
    }).lean<ITimetable[]>();

    const conflicts: ConflictInfo[] = [];
    type Key = string;

    const teacherMap = new Map<Key, { ttId: string; class: string; section: string }>();
    const roomMap    = new Map<Key, { ttId: string; class: string; section: string }>();

    for (const tt of active) {
      for (const entry of tt.entries) {
        if (entry.teacherId) {
          const key = `${entry.dayOfWeek}|${entry.slotId}|${entry.teacherId}`;
          const prev = teacherMap.get(key);
          if (prev) {
            conflicts.push({
              timetableId:   tt._id.toString(),
              class:         tt.class,
              section:       tt.section,
              dayOfWeek:     entry.dayOfWeek,
              slotId:        entry.slotId,
              conflictType:  'teacher',
              conflictValue: entry.teacherName ?? entry.teacherId,
            });
          } else {
            teacherMap.set(key, { ttId: tt._id.toString(), class: tt.class, section: tt.section });
          }
        }
        if (entry.roomNumber) {
          const key = `${entry.dayOfWeek}|${entry.slotId}|${entry.roomNumber}`;
          const prev = roomMap.get(key);
          if (prev) {
            conflicts.push({
              timetableId:   tt._id.toString(),
              class:         tt.class,
              section:       tt.section,
              dayOfWeek:     entry.dayOfWeek,
              slotId:        entry.slotId,
              conflictType:  'room',
              conflictValue: entry.roomNumber,
            });
          } else {
            roomMap.set(key, { ttId: tt._id.toString(), class: tt.class, section: tt.section });
          }
        }
      }
    }
    return conflicts;
  },
};
