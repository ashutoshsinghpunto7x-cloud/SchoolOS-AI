import mongoose, { Document, Schema } from 'mongoose';

export const SCHOOL_POST_KINDS = ['homework', 'news', 'activity'] as const;
export type SchoolPostKind = (typeof SCHOOL_POST_KINDS)[number];

/** Curricular and co-curricular buckets for activity posts. */
export const ACTIVITY_CATEGORIES = ['academic', 'sports', 'arts_culture', 'competition', 'celebration', 'other'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const MAX_POST_PHOTOS = 4;

export interface PostClass {
  class: string;
  section: string;
}

export interface ISchoolPost extends Document {
  schoolId: string;
  kind: SchoolPostKind;
  title: string;
  description?: string;
  /** Empty = the whole school. */
  classes: PostClass[];
  /** Homework only. */
  subject?: string;
  /** Homework only, YYYY-MM-DD. */
  dueDate?: string;
  /** Activity only. */
  category?: ActivityCategory;
  /** Activity only: the day it happened, YYYY-MM-DD. */
  activityDate?: string;
  /** GridFS file ids. */
  photoIds: string[];
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const postClassSchema = new Schema<PostClass>(
  {
    class:   { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const schoolPostSchema = new Schema<ISchoolPost>(
  {
    schoolId:      { type: String, required: true },
    kind:          { type: String, required: true, enum: SCHOOL_POST_KINDS },
    title:         { type: String, required: true, trim: true, maxlength: 200 },
    description:   { type: String, trim: true, maxlength: 2000 },
    classes:       { type: [postClassSchema], default: [] },
    subject:       { type: String, trim: true, maxlength: 100 },
    dueDate:       { type: String },
    category:      { type: String, enum: ACTIVITY_CATEGORIES },
    activityDate:  { type: String },
    photoIds:      { type: [String], default: [] },
    createdBy:     { type: String, required: true },
    createdByName: { type: String, required: true },
    createdByRole: { type: String, required: true },
    isDeleted:     { type: Boolean, default: false },
    deletedAt:     { type: Date },
    deletedBy:     { type: String },
  },
  { timestamps: true, versionKey: false }
);

schoolPostSchema.index({ schoolId: 1, isDeleted: 1, kind: 1, createdAt: -1 });
schoolPostSchema.index({ schoolId: 1, createdBy: 1, createdAt: -1 });

export const SchoolPost = mongoose.model<ISchoolPost>('SchoolPost', schoolPostSchema);
