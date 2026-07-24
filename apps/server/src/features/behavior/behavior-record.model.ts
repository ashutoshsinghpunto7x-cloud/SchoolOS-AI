import mongoose, { Document, Schema } from 'mongoose';

export interface IBehaviorRecord extends Document {
  studentId: string;
  schoolId: string;
  class: string;
  section: string;
  // Date — stored as YYYY-MM-DD string for timezone-safe querying, same as Attendance.
  date: string;
  optionId: string;
  // Denormalized so history reads correctly even if the option is later
  // edited/deactivated — same reasoning as markedByName on Attendance.
  optionLabel: string;
  category: string;
  note?: string;
  markedById: string;
  markedByName: string;
  markedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const behaviorRecordSchema = new Schema<IBehaviorRecord>(
  {
    studentId:    { type: String, required: true },
    schoolId:     { type: String, required: true },
    class:        { type: String, required: true, trim: true },
    section:      { type: String, required: true, trim: true },
    date:         { type: String, required: true },
    optionId:     { type: String, required: true },
    optionLabel:  { type: String, required: true },
    category:     { type: String, required: true },
    note:         { type: String, trim: true, maxlength: 300 },
    markedById:   { type: String, required: true },
    markedByName: { type: String, required: true },
    markedAt:     { type: Date, required: true },
    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date },
    deletedBy:    { type: String },
  },
  { timestamps: true, versionKey: false },
);

// Primary query: class behaviour log for a date.
behaviorRecordSchema.index({ schoolId: 1, class: 1, section: 1, date: 1, isDeleted: 1 });
// Student history.
behaviorRecordSchema.index({ schoolId: 1, studentId: 1, date: -1, isDeleted: 1 });
// Note: unlike Attendance there is no unique (studentId, date) index — a
// student can rack up several behaviour marks in a single day.

export const BehaviorRecord = mongoose.model<IBehaviorRecord>('BehaviorRecord', behaviorRecordSchema);
