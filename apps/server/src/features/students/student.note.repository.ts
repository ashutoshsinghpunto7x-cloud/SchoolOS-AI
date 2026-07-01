import { StudentNote, IStudentNote, StudentNoteType } from './student.note.model';

export interface CreateNoteData {
  studentId: string;
  schoolId: string;
  type: StudentNoteType;
  content: string;
  createdByName: string;
  createdById: string;
}

export interface UpdateNoteData {
  content?: string;
  type?: StudentNoteType;
}

export const studentNoteRepository = {
  async create(data: CreateNoteData): Promise<IStudentNote> {
    return StudentNote.create(data);
  },

  async findByStudent(studentId: string, schoolId: string): Promise<IStudentNote[]> {
    return StudentNote.find({ studentId, schoolId, isDeleted: false })
      .sort({ type: 1, createdAt: -1 }) // pinned first (alphabetical: general, pinned, private)
      .lean<IStudentNote[]>();
  },

  async findById(noteId: string, studentId: string, schoolId: string): Promise<IStudentNote | null> {
    return StudentNote.findOne({ _id: noteId, studentId, schoolId, isDeleted: false }).lean<IStudentNote>();
  },

  async update(noteId: string, studentId: string, data: UpdateNoteData): Promise<IStudentNote | null> {
    return StudentNote.findOneAndUpdate(
      { _id: noteId, studentId, isDeleted: false },
      { $set: data },
      { new: true }
    ).lean<IStudentNote>();
  },

  async softDelete(noteId: string, studentId: string, schoolId: string): Promise<boolean> {
    const result = await StudentNote.updateOne(
      { _id: noteId, studentId, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  },
};
