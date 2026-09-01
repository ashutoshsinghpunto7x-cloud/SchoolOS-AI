import mongoose, { Document, Schema } from 'mongoose';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 5 — every CV dropped off, emailed, or referred gets one record and
// a destination (forwarded to HR/Principal, or rejected outright); reception's
// job ends at "forwarded," not at "hired."
//
// Module 6 additions (interview tracking): `interview_scheduled` and
// `interview_completed` are driven by the `Interview` model in
// ../interviews/interview.model.ts (see interview.service.ts, which flips
// this status as interviews are scheduled/completed) — nothing in this file
// sets them directly. `selected`/`hold` are the Principal's final call.
// The SRD's Module 6 table also lists a separate `finalDecision` field
// alongside these statuses; that would just duplicate `status` (which
// already reaches `selected`/`hold`/`rejected` as terminal states), so this
// model uses `status` as the single source of truth instead of two fields
// that could drift out of sync.

export type CandidateSource = 'walk_in' | 'email' | 'referral' | 'job_portal' | 'other';
export type CandidateStatus =
  | 'new'
  | 'forwarded_to_hr'
  | 'forwarded_to_principal'
  | 'under_review'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'selected'
  | 'hold'
  | 'rejected';

export interface ICandidate extends Document {
  schoolId: string;
  name: string;
  mobile: string;
  email?: string;
  positionApplied: string;
  department?: string;
  qualification?: string;
  experienceYears?: number;
  resumeUrl: string;
  resumeKey?: string; // R2 object key, kept for deletion — not exposed to clients
  source: CandidateSource;
  dateReceived: Date;
  receivedById: string;
  receivedByName: string;
  status: CandidateStatus;
  rejectionReason?: string;
  forwardedTo?: string;
  forwardedToName?: string;
  forwardedAt?: Date;
  // Module 6 — Principal/HR-only fields (never returned to reception, see
  // candidate.service.ts getCandidate visibility filtering)
  salaryDiscussionNotes?: string;
  offeredSalary?: number;
  joiningDate?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SOURCES: CandidateSource[] = ['walk_in', 'email', 'referral', 'job_portal', 'other'];
const STATUSES: CandidateStatus[] = [
  'new', 'forwarded_to_hr', 'forwarded_to_principal', 'under_review',
  'interview_scheduled', 'interview_completed', 'selected', 'hold', 'rejected',
];

const candidateSchema = new Schema<ICandidate>(
  {
    schoolId:         { type: String, required: true, index: true },
    name:             { type: String, required: true, trim: true, maxlength: 100 },
    mobile:           { type: String, required: true, trim: true },
    email:            { type: String, trim: true, lowercase: true },
    positionApplied:  { type: String, required: true, trim: true, maxlength: 150 },
    department:       { type: String, trim: true, maxlength: 100 },
    qualification:    { type: String, trim: true, maxlength: 200 },
    experienceYears:  { type: Number, min: 0, max: 60 },
    resumeUrl:        { type: String, required: true },
    resumeKey:        { type: String },
    source:           { type: String, enum: SOURCES, required: true },
    dateReceived:     { type: Date, required: true },
    receivedById:     { type: String, required: true },
    receivedByName:   { type: String, required: true },
    status:           { type: String, enum: STATUSES, required: true, default: 'new' },
    rejectionReason:  { type: String, trim: true, maxlength: 1000 },
    forwardedTo:      { type: String },
    forwardedToName:  { type: String },
    forwardedAt:      { type: Date },
    salaryDiscussionNotes: { type: String, trim: true, maxlength: 1000 },
    offeredSalary:         { type: Number, min: 0 },
    joiningDate:           { type: Date },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

candidateSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
candidateSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
candidateSchema.index({ schoolId: 1, isDeleted: 1, positionApplied: 1 });
// Duplicate detection (Module 5: "same candidate re-applying doesn't create noise")
candidateSchema.index({ schoolId: 1, mobile: 1, isDeleted: 1 });
candidateSchema.index({ schoolId: 1, email: 1, isDeleted: 1 }, { sparse: true });

export const Candidate = mongoose.model<ICandidate>('Candidate', candidateSchema);
