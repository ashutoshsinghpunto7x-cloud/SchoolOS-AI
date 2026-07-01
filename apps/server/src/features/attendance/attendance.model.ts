import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'leave_approved';

// Extension point: add 'remote' | 'excused' | 'medical_leave' etc. without migration

// ── Document Interface ────────────────────────────────────────────────────────

export interface IAttendance extends Document {
  // Links
  studentId: string;
  schoolId: string;
  // Class context
  class: string;
  section: string;
  // Date — stored as YYYY-MM-DD string for timezone-safe querying
  date: string;
  // Status
  status: AttendanceStatus;
  // Notes (teacher remark for this record)
  note?: string;
  // Who marked it
  markedById: string;
  markedByName: string;
  markedAt: Date;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  // Extension point — future: teacherId, subjectId, periodId, sessionType
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present', 'absent', 'late', 'half_day', 'leave_approved',
];

const attendanceSchema = new Schema<IAttendance>(
  {
    studentId:   { type: String, required: true },
    schoolId:    { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:       { type: String, required: true, trim: true },
    section:     { type: String, required: true, trim: true },
    date:        { type: String, required: true },   // ISO date YYYY-MM-DD
    status:      { type: String, enum: ATTENDANCE_STATUSES, required: true },
    note:        { type: String, trim: true, maxlength: 500 },
    markedById:  { type: String, required: true },
    markedByName:{ type: String, required: true },
    markedAt:    { type: Date, required: true },
    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date },
    deletedBy:   { type: String },
    metadata:    { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary query: class attendance for a date
attendanceSchema.index({ schoolId: 1, class: 1, section: 1, date: 1, isDeleted: 1 });
// Student history
attendanceSchema.index({ schoolId: 1, studentId: 1, date: -1, isDeleted: 1 });
// Unique: one record per student per date (upsert key)
attendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// Date range queries for summaries
attendanceSchema.index({ schoolId: 1, date: 1, isDeleted: 1 });
// Absent / late queries for notifications
attendanceSchema.index({ schoolId: 1, date: 1, status: 1, isDeleted: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
