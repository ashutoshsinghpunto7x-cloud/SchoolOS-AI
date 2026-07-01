import mongoose, { Document, Schema } from 'mongoose';

export type TeacherNoteType = 'general' | 'pinned' | 'private';

export interface ITeacherNote extends Document {
  teacherId: string;
  schoolId: string;
  type: TeacherNoteType;
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teacherNoteSchema = new Schema<ITeacherNote>(
  {
    teacherId:     { type: String, required: true },
    schoolId:      { type: String, required: true },
    type:          { type: String, enum: ['general', 'pinned', 'private'], default: 'general' },
    content:       { type: String, required: true, trim: true, maxlength: 2000 },
    createdByName: { type: String, required: true },
    createdById:   { type: String, required: true },
    isDeleted:     { type: Boolean, default: false },
    deletedAt:     { type: Date },
  },
  { timestamps: true, versionKey: false }
);

teacherNoteSchema.index({ teacherId: 1, schoolId: 1, isDeleted: 1, createdAt: -1 });

export const TeacherNote = mongoose.model<ITeacherNote>('TeacherNote', teacherNoteSchema);
