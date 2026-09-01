import mongoose, { Document, Schema, Types } from 'mongoose';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 3 — an admission form has its own money/documents lifecycle
// independent of where the lead sits in the Enquiry pipeline (Module 2),
// so it's tracked as its own entity linked by `enquiryId` rather than more
// enquiry-stage values.

export type AdmissionFormPaymentStatus = 'pending' | 'paid' | 'waived';
export type AdmissionFormVerificationStatus = 'not_submitted' | 'pending_verification' | 'verified' | 'rejected';

export interface IDocumentChecklistItem {
  _id: Types.ObjectId;
  documentType: string;
  received: boolean;
  fileUrl?: string;
  fileKey?: string; // R2 object key, kept for deletion — not exposed to clients
  verifiedAt?: Date;
}

export interface IAdmissionForm extends Document {
  schoolId: string;
  enquiryId: string;
  formNumber: string;
  dateIssued: Date;
  issuedById: string;
  issuedByName: string;
  formFee: number;
  paymentStatus: AdmissionFormPaymentStatus;
  paymentTxnId?: string;
  submissionDate?: Date;
  verificationStatus: AdmissionFormVerificationStatus;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: Date;
  documentChecklist: IDocumentChecklistItem[];
  rejectionReason?: string;
  createdBy: string;
  updatedBy?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PAYMENT_STATUSES: AdmissionFormPaymentStatus[] = ['pending', 'paid', 'waived'];
const VERIFICATION_STATUSES: AdmissionFormVerificationStatus[] = [
  'not_submitted', 'pending_verification', 'verified', 'rejected',
];

// Default per the SRD's Module 3 feature list — reception can still add/
// remove items per form; this just seeds a sensible starting checklist
// instead of every form starting empty. A per-school configurable list
// (Admin settings) is future work, not built here (see SRD §11-adjacent note).
export const DEFAULT_DOCUMENT_CHECKLIST = [
  'Birth Certificate',
  'Previous School Transfer Certificate',
  'Previous Report Card',
  'Aadhaar / ID Proof',
  'Passport-size Photographs',
];

const documentChecklistItemSchema = new Schema<IDocumentChecklistItem>(
  {
    documentType: { type: String, required: true, trim: true, maxlength: 200 },
    received:     { type: Boolean, required: true, default: false },
    fileUrl:      { type: String },
    fileKey:      { type: String },
    verifiedAt:   { type: Date },
  },
  { _id: true }
);

const admissionFormSchema = new Schema<IAdmissionForm>(
  {
    schoolId:            { type: String, required: true, index: true },
    enquiryId:           { type: String, required: true },
    formNumber:          { type: String, required: true },
    dateIssued:          { type: Date, required: true },
    issuedById:          { type: String, required: true },
    issuedByName:        { type: String, required: true },
    formFee:             { type: Number, required: true, min: 0 },
    paymentStatus:       { type: String, enum: PAYMENT_STATUSES, required: true, default: 'pending' },
    paymentTxnId:        { type: String },
    submissionDate:      { type: Date },
    verificationStatus:  { type: String, enum: VERIFICATION_STATUSES, required: true, default: 'not_submitted' },
    verifiedById:        { type: String },
    verifiedByName:      { type: String },
    verifiedAt:          { type: Date },
    documentChecklist:   { type: [documentChecklistItemSchema], default: [] },
    rejectionReason:     { type: String, trim: true, maxlength: 1000 },
    createdBy:           { type: String, required: true },
    updatedBy:           { type: String },
    isDeleted:           { type: Boolean, default: false, index: true },
    deletedAt:           { type: Date },
    deletedBy:           { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Form number is unique per school (not globally — two schools could
// otherwise never both have "ADM-2026-0001").
admissionFormSchema.index({ schoolId: 1, formNumber: 1 }, { unique: true });
admissionFormSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
admissionFormSchema.index({ schoolId: 1, isDeleted: 1, paymentStatus: 1 });
admissionFormSchema.index({ schoolId: 1, isDeleted: 1, verificationStatus: 1 });
// One form per enquiry lookup (Enquiry.admissionFormId also points back, but
// this is the source of truth if that denormalized pointer ever drifts).
admissionFormSchema.index({ schoolId: 1, enquiryId: 1 });

export const AdmissionForm = mongoose.model<IAdmissionForm>('AdmissionForm', admissionFormSchema);
