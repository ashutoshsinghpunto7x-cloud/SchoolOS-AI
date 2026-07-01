import mongoose, { Document, Schema } from 'mongoose';

export type EnquiryNoteType = 'general' | 'pinned' | 'private';

export interface IEnquiryNote extends Document {
  enquiryId: string;
  schoolId: string;
  type: EnquiryNoteType;
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enquiryNoteSchema = new Schema<IEnquiryNote>(
  {
    enquiryId:     { type: String, required: true },
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

enquiryNoteSchema.index({ enquiryId: 1, isDeleted: 1, createdAt: -1 });
enquiryNoteSchema.index({ enquiryId: 1, isDeleted: 1, type: 1 });

export const EnquiryNote = mongoose.model<IEnquiryNote>('EnquiryNote', enquiryNoteSchema);
