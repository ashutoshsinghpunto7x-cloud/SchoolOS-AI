import mongoose, { Document, Schema, Types } from 'mongoose';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 6 — once a CV is forwarded, the Principal runs the rest of hiring
// from here: schedule, interview, score, decide. Multiple `round`s per
// candidate are supported (round 1, round 2, ...); `feedback` is one entry
// per interviewer on that round, not per candidate overall.

export type InterviewMode = 'in_person' | 'phone' | 'video';
export type InterviewStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled';
export type InterviewRecommendation = 'strong_yes' | 'yes' | 'hold' | 'no';

export interface IInterviewFeedback {
  _id: Types.ObjectId;
  interviewerId: string;
  interviewerName: string;
  score: number; // 1–10
  criteriaScores?: Map<string, number>;
  comments?: string;
  recommendation: InterviewRecommendation;
  submittedAt: Date;
}

export interface IInterview extends Document {
  schoolId: string;
  candidateId: string;
  round: number;
  scheduledAt: Date;
  mode: InterviewMode;
  interviewerIds: string[];
  interviewerNames: string[];
  status: InterviewStatus;
  feedback: IInterviewFeedback[];
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MODES: InterviewMode[] = ['in_person', 'phone', 'video'];
const STATUSES: InterviewStatus[] = ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'];
const RECOMMENDATIONS: InterviewRecommendation[] = ['strong_yes', 'yes', 'hold', 'no'];

const interviewFeedbackSchema = new Schema<IInterviewFeedback>(
  {
    interviewerId:   { type: String, required: true },
    interviewerName: { type: String, required: true },
    score:           { type: Number, required: true, min: 1, max: 10 },
    criteriaScores:  { type: Map, of: Number },
    comments:        { type: String, trim: true, maxlength: 2000 },
    recommendation:  { type: String, enum: RECOMMENDATIONS, required: true },
    submittedAt:     { type: Date, required: true, default: Date.now },
  },
  { _id: true }
);

const interviewSchema = new Schema<IInterview>(
  {
    schoolId:         { type: String, required: true, index: true },
    candidateId:      { type: String, required: true },
    round:            { type: Number, required: true, min: 1, default: 1 },
    scheduledAt:      { type: Date, required: true },
    mode:             { type: String, enum: MODES, required: true },
    interviewerIds:   { type: [String], default: [] },
    interviewerNames: { type: [String], default: [] },
    status:           { type: String, enum: STATUSES, required: true, default: 'scheduled' },
    feedback:         { type: [interviewFeedbackSchema], default: [] },
    createdBy:        { type: String, required: true },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

// One candidate's full interview history, earliest round first
interviewSchema.index({ schoolId: 1, candidateId: 1, isDeleted: 1, round: 1 });
// Principal's interview calendar — today's/this week's, chronological
interviewSchema.index({ schoolId: 1, isDeleted: 1, scheduledAt: 1 });
interviewSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });

export const Interview = mongoose.model<IInterview>('Interview', interviewSchema);
