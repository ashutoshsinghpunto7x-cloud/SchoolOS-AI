import {
  Vehicle, IVehicle,
  VehicleLocation, IVehicleLocation, RouteStatus,
  StudentTransportAssignment,
} from './transport.model';

export interface CreateVehicleData {
  schoolId: string;
  vehicleNumber: string;
  routeName: string;
}

export const transportRepository = {
  // ── Vehicles ────────────────────────────────────────────────────────────────

  async createVehicle(data: CreateVehicleData): Promise<IVehicle> {
    const vehicle = new Vehicle(data);
    return vehicle.save();
  },

  async listVehicles(schoolId: string): Promise<IVehicle[]> {
    return Vehicle.find({ schoolId, isDeleted: false }).sort({ createdAt: -1 }).lean<IVehicle[]>();
  },

  async findVehicleById(id: string, schoolId: string): Promise<IVehicle | null> {
    return Vehicle.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findVehicleByDriver(driverUserId: string, schoolId: string): Promise<IVehicle | null> {
    return Vehicle.findOne({ driverUserId, schoolId, isDeleted: false }).lean<IVehicle>();
  },

  async assignDriver(id: string, schoolId: string, driverUserId: string, driverName: string): Promise<IVehicle | null> {
    return Vehicle.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { driverUserId, driverName } },
      { new: true },
    );
  },

  // ── Locations ───────────────────────────────────────────────────────────────

  async upsertLocation(
    schoolId: string,
    vehicleId: string,
    latitude: number,
    longitude: number,
    routeStatus: RouteStatus,
  ): Promise<IVehicleLocation> {
    return VehicleLocation.findOneAndUpdate(
      { vehicleId },
      { $set: { schoolId, latitude, longitude, routeStatus } },
      { new: true, upsert: true },
    );
  },

  async setRouteStatus(vehicleId: string, routeStatus: RouteStatus): Promise<void> {
    await VehicleLocation.updateOne({ vehicleId }, { $set: { routeStatus } });
  },

  async findLocation(vehicleId: string): Promise<IVehicleLocation | null> {
    return VehicleLocation.findOne({ vehicleId }).lean<IVehicleLocation>();
  },

  async listLocations(vehicleIds: string[]): Promise<IVehicleLocation[]> {
    if (vehicleIds.length === 0) return [];
    return VehicleLocation.find({ vehicleId: { $in: vehicleIds } }).lean<IVehicleLocation[]>();
  },

  // ── Student assignments ──────────────────────────────────────────────────────

  async assignStudents(schoolId: string, vehicleId: string, studentIds: string[]): Promise<void> {
    await Promise.all(
      studentIds.map((studentId) =>
        StudentTransportAssignment.findOneAndUpdate(
          { schoolId, studentId },
          { $set: { vehicleId, assignedAt: new Date() } },
          { upsert: true },
        )
      )
    );
  },

  async unassignStudent(schoolId: string, studentId: string): Promise<void> {
    await StudentTransportAssignment.deleteOne({ schoolId, studentId });
  },

  async findAssignmentForStudent(schoolId: string, studentId: string) {
    return StudentTransportAssignment.findOne({ schoolId, studentId }).lean();
  },

  async listStudentIdsForVehicle(schoolId: string, vehicleId: string): Promise<string[]> {
    const docs = await StudentTransportAssignment.find({ schoolId, vehicleId }).lean();
    return docs.map((d) => d.studentId);
  },
};
