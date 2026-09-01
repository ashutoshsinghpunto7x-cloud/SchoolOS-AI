import mongoose, { Document, Schema } from 'mongoose';
import { VisitorPurpose } from './visitor.model';

// A pre-booked visit — a parent, vendor, or candidate expected on a given
// day/time. On arrival, reception "marks arrived," which creates the actual
// `Visitor` check-in record pre-filled from this appointment (see
// visitor.service.ts `arriveFromAppointment`). See Reception Management
// Module SRD, Module 1.

export type VisitorAppointmentStatus = 'scheduled' | 'arrived' | 'no_show' | 'cancelled';

export interface IVisitorAppointment extends Document {
  schoolId: string;
  visitorName: string;
  visitorPhone: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  scheduledFor: Date;
  personToVisit: string;
  personToVisitId?: string;
  bookedById: string;
  bookedByName: string;
  status: VisitorAppointmentStatus;
  linkedVisitorId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VISITOR_PURPOSES: VisitorPurpose[] = [
  'meet_student', 'meet_staff', 'admission_enquiry', 'fee_payment',
  'delivery', 'vendor', 'interview', 'other',
];

const APPOINTMENT_STATUSES: VisitorAppointmentStatus[] = [
  'scheduled', 'arrived', 'no_show', 'cancelled',
];

const visitorAppointmentSchema = new Schema<IVisitorAppointment>(
  {
    schoolId:        { type: String, required: true, index: true },
    visitorName:     { type: String, required: true, trim: true, maxlength: 100 },
    visitorPhone:    { type: String, required: true, trim: true },
    purpose:         { type: String, enum: VISITOR_PURPOSES, required: true },
    purposeNote:     { type: String, trim: true, maxlength: 500 },
    scheduledFor:    { type: Date, required: true },
    personToVisit:   { type: String, required: true, trim: true, maxlength: 100 },
    personToVisitId: { type: String },
    bookedById:      { type: String, required: true },
    bookedByName:    { type: String, required: true },
    status:          { type: String, enum: APPOINTMENT_STATUSES, required: true, default: 'scheduled' },
    linkedVisitorId: { type: String },
    isDeleted:       { type: Boolean, default: false, index: true },
    deletedAt:       { type: Date },
    deletedBy:       { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Today/this-week appointment views, soonest first
visitorAppointmentSchema.index({ schoolId: 1, isDeleted: 1, scheduledFor: 1 });
visitorAppointmentSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });

export const VisitorAppointment = mongoose.model<IVisitorAppointment>('VisitorAppointment', visitorAppointmentSchema);
