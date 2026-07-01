import mongoose, { Document, Schema } from 'mongoose';

export type EnquiryStage =
  | 'new_enquiry'
  | 'contacted'
  | 'follow_up_scheduled'
  | 'campus_visit'
  | 'application_submitted'
  | 'documents_pending'
  | 'admission_approved'
  | 'converted'
  | 'lost';

export type EnquirySource =
  | 'walk_in'
  | 'website'
  | 'referral'
  | 'social_media'
  | 'phone'
  | 'email'
  | 'other';

export interface IStageHistoryEntry {
  stage: EnquiryStage;
  changedAt: Date;
  changedBy: string;
  remarks?: string;
}

export interface IConversionData {
  studentId: string;
  convertedAt: Date;
  convertedBy: string;
}

export interface IEnquiry extends Document {
  schoolId: string;
  // Student details
  studentName: string;
  studentDateOfBirth?: Date;
  interestedClass: string;
  gender?: 'male' | 'female' | 'other';
  currentSchool?: string;
  currentClass?: string;
  // Parent / Guardian
  parentName: string;
  parentPhone: string;
  alternatePhone?: string;
  parentEmail?: string;
  // Pipeline
  stage: EnquiryStage;
  source: EnquirySource;
  referredBy?: string;
  assignedCounsellor?: string;
  followUpDate?: Date;
  lastContactedAt?: Date;
  stageHistory: IStageHistoryEntry[];
  // Conversion
  conversionData?: IConversionData;
  // Meta
  tags: string[];
  remarks?: string;
  metadata?: Record<string, unknown>;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  // Audit
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stageHistorySchema = new Schema<IStageHistoryEntry>(
  {
    stage:     { type: String, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: String, required: true },
    remarks:   { type: String },
  },
  { _id: false }
);

const conversionDataSchema = new Schema<IConversionData>(
  {
    studentId:   { type: String, required: true },
    convertedAt: { type: Date, required: true },
    convertedBy: { type: String, required: true },
  },
  { _id: false }
);

const enquirySchema = new Schema<IEnquiry>(
  {
    schoolId:           { type: String, required: true, index: true },
    studentName:        { type: String, required: true, trim: true, maxlength: 100 },
    studentDateOfBirth: { type: Date },
    interestedClass:    { type: String, required: true, trim: true, maxlength: 20 },
    gender:             { type: String, enum: ['male', 'female', 'other'] },
    currentSchool:      { type: String, trim: true, maxlength: 200 },
    currentClass:       { type: String, trim: true, maxlength: 20 },
    parentName:         { type: String, required: true, trim: true, maxlength: 100 },
    parentPhone:        { type: String, required: true, trim: true },
    alternatePhone:     { type: String, trim: true },
    parentEmail:        { type: String, trim: true, lowercase: true },
    stage: {
      type: String,
      required: true,
      enum: [
        'new_enquiry', 'contacted', 'follow_up_scheduled', 'campus_visit',
        'application_submitted', 'documents_pending', 'admission_approved',
        'converted', 'lost',
      ],
      default: 'new_enquiry',
    },
    source: {
      type: String,
      required: true,
      enum: ['walk_in', 'website', 'referral', 'social_media', 'phone', 'email', 'other'],
    },
    referredBy:          { type: String, trim: true, maxlength: 100 },
    assignedCounsellor:  { type: String, trim: true, maxlength: 100 },
    followUpDate:        { type: Date },
    lastContactedAt:     { type: Date },
    stageHistory:        { type: [stageHistorySchema], default: [] },
    conversionData:      { type: conversionDataSchema },
    tags:                { type: [String], default: [] },
    remarks:             { type: String, maxlength: 2000 },
    metadata:            { type: Schema.Types.Mixed },
    isDeleted:           { type: Boolean, default: false, index: true },
    deletedAt:           { type: Date },
    deletedBy:           { type: String },
    createdBy:           { type: String, required: true },
    updatedBy:           { type: String },
  },
  { timestamps: true, versionKey: false }
);

enquirySchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
enquirySchema.index({ schoolId: 1, isDeleted: 1, stage: 1 });
enquirySchema.index({ schoolId: 1, isDeleted: 1, source: 1 });
enquirySchema.index({ schoolId: 1, isDeleted: 1, followUpDate: 1 });
enquirySchema.index({ parentPhone: 1 });
enquirySchema.index(
  { studentName: 'text', parentName: 'text', parentPhone: 'text', parentEmail: 'text' },
  { sparse: true }
);

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
