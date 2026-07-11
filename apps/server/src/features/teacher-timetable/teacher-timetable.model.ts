import mongoose, { Document, Schema } from 'mongoose';

export type TeacherTimetableStatus = 'draft' | 'published';

export interface ITeacherTimetableEntry {
  _id?: mongoose.Types.ObjectId;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  class?: string;
  section?: string;
  roomNumber?: string;
}

// Principal-built weekly schedule for one teacher — independent of any class's
// Timetable document. Two teachers' schedules for the same slot are not
// reconciled automatically; teacherTimetableService.checkConflicts() only warns
// against the class Timetable collection at save time (see [[architecture_teacher_timetable]] memory).
export interface ITeacherTimetable extends Document {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  status: TeacherTimetableStatus;
  entries: ITeacherTimetableEntry[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherTimetableEntrySchema = new Schema<ITeacherTimetableEntry>(
  {
    dayOfWeek:   { type: Number, required: true, min: 1, max: 6 },
    slotId:      { type: String, required: true },
    subjectName: { type: String, required: true, trim: true, maxlength: 100 },
    class:       { type: String, trim: true, maxlength: 20 },
    section:     { type: String, trim: true, maxlength: 10 },
    roomNumber:  { type: String, trim: true, maxlength: 50 },
  },
  { _id: true }
);

const teacherTimetableSchema = new Schema<ITeacherTimetable>(
  {
    schoolId:     { type: String, required: true, index: true },
    teacherId:    { type: String, required: true },
    teacherName:  { type: String, required: true, trim: true, maxlength: 100 },
    academicYear: { type: String, required: true, trim: true, maxlength: 20 },
    status:       { type: String, enum: ['draft', 'published'], default: 'draft' },
    entries:      { type: [teacherTimetableEntrySchema], default: [] },
    notes:        { type: String, maxlength: 2000 },
    isDeleted:    { type: Boolean, default: false, index: true },
    deletedAt:    { type: Date },
    deletedBy:    { type: String },
    createdBy:    { type: String, required: true },
    updatedBy:    { type: String },
    publishedAt:  { type: Date },
    publishedBy:  { type: String },
  },
  { timestamps: true, versionKey: false }
);

teacherTimetableSchema.index({ schoolId: 1, teacherId: 1, academicYear: 1 }, { unique: true });
teacherTimetableSchema.index({ schoolId: 1, teacherId: 1, isDeleted: 1 });

export const TeacherTimetable = mongoose.model<ITeacherTimetable>('TeacherTimetable', teacherTimetableSchema);
