import { TeacherNote, ITeacherNote, TeacherNoteType } from './teacher.note.model';

export interface CreateNoteData {
  teacherId: string;
  schoolId: string;
  type: TeacherNoteType;
  content: string;
  createdByName: string;
  createdById: string;
}

export interface UpdateNoteData {
  content?: string;
  type?: TeacherNoteType;
}

export const teacherNoteRepository = {
  async create(data: CreateNoteData): Promise<ITeacherNote> {
    return TeacherNote.create(data);
  },

  async findByTeacher(teacherId: string, schoolId: string): Promise<ITeacherNote[]> {
    return TeacherNote.find({ teacherId, schoolId, isDeleted: false })
      .sort({ type: 1, createdAt: -1 }) // pinned sorts before general alphabetically
      .lean<ITeacherNote[]>();
  },

  async findById(noteId: string, teacherId: string, schoolId: string): Promise<ITeacherNote | null> {
    return TeacherNote.findOne({ _id: noteId, teacherId, schoolId, isDeleted: false }).lean<ITeacherNote>();
  },

  async update(noteId: string, teacherId: string, data: UpdateNoteData): Promise<ITeacherNote | null> {
    return TeacherNote.findOneAndUpdate(
      { _id: noteId, teacherId, isDeleted: false },
      { $set: data },
      { new: true }
    ).lean<ITeacherNote>();
  },

  async softDelete(noteId: string, teacherId: string, schoolId: string): Promise<boolean> {
    const result = await TeacherNote.updateOne(
      { _id: noteId, teacherId, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  },
};
