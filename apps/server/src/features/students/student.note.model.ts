import mongoose, { Document, Schema } from 'mongoose';

export type StudentNoteType = 'general' | 'pinned' | 'private';

export interface IStudentNote extends Document {
  studentId: string;
  schoolId: string;
  type: StudentNoteType;
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentNoteSchema = new Schema<IStudentNote>(
  {
    studentId: { type: String, required: true },
    schoolId: { type: String, required: true },
    type: { type: String, enum: ['general', 'pinned', 'private'], default: 'general' },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    createdByName: { type: String, required: true },
    createdById: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

studentNoteSchema.index({ studentId: 1, isDeleted: 1, createdAt: -1 });
studentNoteSchema.index({ studentId: 1, isDeleted: 1, type: 1 });

export const StudentNote = mongoose.model<IStudentNote>('StudentNote', studentNoteSchema);
