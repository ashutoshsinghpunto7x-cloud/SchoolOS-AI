import mongoose, { Document, Schema } from 'mongoose';

// ── Vehicle ───────────────────────────────────────────────────────────────────

export type VehicleStatus = 'active' | 'inactive';

export interface IVehicle extends Document {
  schoolId: string;
  vehicleNumber: string;
  routeName: string;
  /** User._id of the driver account assigned to this vehicle — undefined until assigned. */
  driverUserId?: string;
  /** Denormalized for quick display without an extra User lookup on every read. */
  driverName?: string;
  status: VehicleStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    schoolId:      { type: String, required: true, index: true },
    vehicleNumber: { type: String, required: true, trim: true },
    routeName:     { type: String, required: true, trim: true },
    driverUserId:  { type: String },
    driverName:    { type: String, trim: true },
    status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted:     { type: Boolean, default: false, index: true },
    deletedAt:     { type: Date },
  },
  { timestamps: true, versionKey: false }
);

vehicleSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
vehicleSchema.index({ schoolId: 1, driverUserId: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);

// ── VehicleLocation ───────────────────────────────────────────────────────────
// One document per vehicle, upserted on every GPS ping — this is a "last known
// location" pointer, not an append-only trail (no route-history/playback in
// this MVP), so a single doc per vehicle keeps reads O(1).

export type RouteStatus = 'active' | 'completed';

export interface IVehicleLocation extends Document {
  schoolId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  routeStatus: RouteStatus;
  updatedAt: Date;
}

const vehicleLocationSchema = new Schema<IVehicleLocation>(
  {
    schoolId:    { type: String, required: true, index: true },
    vehicleId:   { type: String, required: true, unique: true },
    latitude:    { type: Number, required: true },
    longitude:   { type: Number, required: true },
    routeStatus: { type: String, enum: ['active', 'completed'], required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
);

export const VehicleLocation = mongoose.model<IVehicleLocation>('VehicleLocation', vehicleLocationSchema);

// ── StudentTransportAssignment ────────────────────────────────────────────────

export interface IStudentTransportAssignment extends Document {
  schoolId: string;
  studentId: string;
  vehicleId: string;
  assignedAt: Date;
}

const studentTransportAssignmentSchema = new Schema<IStudentTransportAssignment>(
  {
    schoolId:   { type: String, required: true, index: true },
    studentId:  { type: String, required: true },
    vehicleId:  { type: String, required: true },
    assignedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

// A student rides one vehicle at a time.
studentTransportAssignmentSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
studentTransportAssignmentSchema.index({ schoolId: 1, vehicleId: 1 });

export const StudentTransportAssignment = mongoose.model<IStudentTransportAssignment>(
  'StudentTransportAssignment',
  studentTransportAssignmentSchema
);
