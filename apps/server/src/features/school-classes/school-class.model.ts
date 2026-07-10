import mongoose, { Document, Schema } from 'mongoose';

export interface ISchoolClass extends Document {
  schoolId: string;
  name: string;
  sections: string[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schoolClassSchema = new Schema<ISchoolClass>(
  {
    schoolId:  { type: String, required: true, index: true },
    name:      { type: String, required: true, trim: true },
    sections:  { type: [String], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

schoolClassSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const SchoolClass = mongoose.model<ISchoolClass>('SchoolClass', schoolClassSchema);
