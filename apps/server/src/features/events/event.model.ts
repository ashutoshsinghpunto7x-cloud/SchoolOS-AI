import mongoose, { Document, Schema } from 'mongoose';

export type EventType =
  | 'holiday'
  | 'ptm'
  | 'examination'
  | 'school_event'
  | 'staff_meeting'
  | 'fee_due_date'
  | 'admission_event'
  | 'general';

export type EventStatus = 'draft' | 'scheduled' | 'published' | 'completed' | 'cancelled';

export type EventAudience = 'all' | 'students' | 'teachers' | 'parents' | 'staff';

export interface ISchoolEvent extends Document {
  schoolId: string;
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  audience: EventAudience[];
  organizer?: string;
  notes?: string;
  tags: string[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schoolEventSchema = new Schema<ISchoolEvent>(
  {
    schoolId:    { type: String, required: true, index: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    eventType:   {
      type: String,
      required: true,
      enum: ['holiday', 'ptm', 'examination', 'school_event', 'staff_meeting', 'fee_due_date', 'admission_event', 'general'],
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'scheduled', 'published', 'completed', 'cancelled'],
      default: 'draft',
    },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    startTime:  { type: String, match: /^\d{2}:\d{2}$/ },
    endTime:    { type: String, match: /^\d{2}:\d{2}$/ },
    isAllDay:   { type: Boolean, default: true },
    location:   { type: String, trim: true, maxlength: 500 },
    audience: {
      type: [String],
      enum: ['all', 'students', 'teachers', 'parents', 'staff'],
      default: ['all'],
    },
    organizer:  { type: String, trim: true, maxlength: 200 },
    notes:      { type: String, maxlength: 5000 },
    tags:       { type: [String], default: [] },
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date },
    deletedBy:  { type: String },
    createdBy:  { type: String, required: true },
    updatedBy:  { type: String },
    metadata:   { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

schoolEventSchema.index({ schoolId: 1, startDate: 1, isDeleted: 1 });
schoolEventSchema.index({ schoolId: 1, endDate: 1, isDeleted: 1 });
schoolEventSchema.index({ schoolId: 1, status: 1, isDeleted: 1 });
schoolEventSchema.index({ schoolId: 1, eventType: 1, isDeleted: 1 });
schoolEventSchema.index({ schoolId: 1, startDate: 1, endDate: 1, isDeleted: 1 });

export const SchoolEvent = mongoose.model<ISchoolEvent>('SchoolEvent', schoolEventSchema);
