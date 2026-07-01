import { EnquiryNote, IEnquiryNote, EnquiryNoteType } from './enquiry.note.model';

export interface CreateEnquiryNoteData {
  enquiryId: string;
  schoolId: string;
  type: EnquiryNoteType;
  content: string;
  createdByName: string;
  createdById: string;
}

export const enquiryNoteRepository = {
  async create(data: CreateEnquiryNoteData): Promise<IEnquiryNote> {
    const note = new EnquiryNote(data);
    return note.save();
  },

  async findByEnquiry(enquiryId: string, schoolId: string): Promise<IEnquiryNote[]> {
    return EnquiryNote.find({ enquiryId, schoolId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean<IEnquiryNote[]>();
  },

  async findNoteById(id: string, enquiryId: string, schoolId: string): Promise<IEnquiryNote | null> {
    return EnquiryNote.findOne({ _id: id, enquiryId, schoolId, isDeleted: false }).lean<IEnquiryNote>();
  },

  async update(
    id: string,
    data: { content?: string; type?: EnquiryNoteType },
  ): Promise<IEnquiryNote | null> {
    return EnquiryNote.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean<IEnquiryNote>();
  },

  async softDelete(id: string, enquiryId: string): Promise<boolean> {
    const result = await EnquiryNote.updateOne(
      { _id: id, enquiryId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },
};
