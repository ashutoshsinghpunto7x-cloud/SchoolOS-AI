import mongoose, { Document, Schema } from 'mongoose';

export type StudentChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IStudentChangeRequest extends Document {
  studentId: string;
  studentName: string;
  schoolId: string;
  requestedByUserId: string;
  requestedByName: string;
  changes: Record<string, unknown>;
  previousValues: Record<string, unknown>;
  status: StudentChangeRequestStatus;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentChangeRequestSchema = new Schema<IStudentChangeRequest>(
  {
    studentId:         { type: String, required: true },
    studentName:       { type: String, required: true, trim: true },
    schoolId:          { type: String, required: true },
    requestedByUserId: { type: String, required: true },
    requestedByName:   { type: String, required: true, trim: true },
    changes:           { type: Schema.Types.Mixed, required: true },
    previousValues:    { type: Schema.Types.Mixed, required: true },
    status:            { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedByName:    { type: String, trim: true },
    reviewNote:        { type: String, trim: true },
    reviewedAt:        { type: Date },
  },
  { timestamps: true, versionKey: false }
);

studentChangeRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
studentChangeRequestSchema.index({ studentId: 1 });

export const StudentChangeRequest = mongoose.model<IStudentChangeRequest>(
  'StudentChangeRequest',
  studentChangeRequestSchema,
);
