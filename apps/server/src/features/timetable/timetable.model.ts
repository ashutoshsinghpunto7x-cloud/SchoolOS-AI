import mongoose, { Document, Schema } from 'mongoose';

export type TimetableStatus = 'draft' | 'published' | 'archived';

export interface ITimetableEntry {
  _id?: mongoose.Types.ObjectId;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
}

export interface ITimetable extends Document {
  schoolId: string;
  class: string;
  section: string;
  academicYear: string;
  term?: string;
  status: TimetableStatus;
  entries: ITimetableEntry[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  archivedBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const timetableEntrySchema = new Schema<ITimetableEntry>(
  {
    dayOfWeek:   { type: Number, required: true, min: 1, max: 6 },
    slotId:      { type: String, required: true },
    subjectName: { type: String, required: true, trim: true, maxlength: 100 },
    teacherId:   { type: String },
    teacherName: { type: String },
    roomNumber:  { type: String, trim: true, maxlength: 50 },
  },
  { _id: true }
);

const timetableSchema = new Schema<ITimetable>(
  {
    schoolId:     { type: String, required: true, index: true },
    class:        { type: String, required: true, trim: true, maxlength: 20 },
    section:      { type: String, required: true, trim: true, maxlength: 10 },
    academicYear: { type: String, required: true, trim: true, maxlength: 20 },
    term:         { type: String, trim: true, maxlength: 50 },
    status:       { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    entries:      { type: [timetableEntrySchema], default: [] },
    notes:        { type: String, maxlength: 2000 },
    isDeleted:    { type: Boolean, default: false, index: true },
    deletedAt:    { type: Date },
    deletedBy:    { type: String },
    createdBy:    { type: String, required: true },
    updatedBy:    { type: String },
    publishedAt:  { type: Date },
    publishedBy:  { type: String },
    archivedAt:   { type: Date },
    archivedBy:   { type: String },
    metadata:     { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

timetableSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
timetableSchema.index({ schoolId: 1, isDeleted: 1, class: 1, section: 1 });
timetableSchema.index({ schoolId: 1, isDeleted: 1, academicYear: 1 });
timetableSchema.index({ 'entries.teacherId': 1, schoolId: 1, isDeleted: 1 });
timetableSchema.index({ 'entries.roomNumber': 1, schoolId: 1, isDeleted: 1 });

export const Timetable = mongoose.model<ITimetable>('Timetable', timetableSchema);
