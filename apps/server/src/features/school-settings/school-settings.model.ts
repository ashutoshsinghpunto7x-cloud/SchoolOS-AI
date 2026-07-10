import mongoose, { Document, Schema } from 'mongoose';

export interface ISchoolSettings extends Document {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schoolSettingsSchema = new Schema<ISchoolSettings>(
  {
    schoolId:   { type: String, required: true, unique: true },
    schoolName: { type: String, required: true, trim: true, default: 'FNIC' },
    logoUrl:    { type: String },
    updatedBy:  { type: String },
  },
  { timestamps: true, versionKey: false },
);

export const SchoolSettings = mongoose.model<ISchoolSettings>('SchoolSettings', schoolSettingsSchema);
