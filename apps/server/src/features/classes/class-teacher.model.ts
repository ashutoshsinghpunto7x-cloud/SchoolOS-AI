import mongoose, { Document, Schema } from 'mongoose';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IClassTeacherAssignment extends Document {
  schoolId: string;
  class: string;
  section: string;
  teacherId: string;
  teacherName: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const classTeacherAssignmentSchema = new Schema<IClassTeacherAssignment>(
  {
    schoolId:    { type: String, required: true, default: 'school_001' },
    class:       { type: String, required: true, trim: true },
    section:     { type: String, required: true, trim: true },
    teacherId:   { type: String, required: true },
    teacherName: { type: String, required: true, trim: true },
    updatedBy:   { type: String },
  },
  { timestamps: true, versionKey: false },
);

classTeacherAssignmentSchema.index({ schoolId: 1, class: 1, section: 1 }, { unique: true });

export const ClassTeacherAssignment = mongoose.model<IClassTeacherAssignment>(
  'ClassTeacherAssignment',
  classTeacherAssignmentSchema,
);
