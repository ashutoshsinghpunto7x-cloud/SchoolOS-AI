import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ForbiddenError, ValidationError } from '../../middlewares/errorHandler';
import { transportRepository } from './transport.repository';
import { User } from '../users/user.model';
import {
  createVehicleSchema, assignDriverSchema, assignStudentsSchema, locationPingSchema,
} from './transport.validation';
import { IVehicle, RouteStatus } from './transport.model';

export interface VehicleView {
  _id: string;
  vehicleNumber: string;
  routeName: string;
  driverUserId?: string;
  driverName?: string;
  status: string;
}

export interface LiveLocationView {
  available: boolean;
  vehicleNumber?: string;
  routeName?: string;
  driverName?: string;
  routeStatus?: RouteStatus;
  latitude?: number;
  longitude?: number;
  updatedAt?: Date;
}

const toVehicleView = (v: IVehicle): VehicleView => ({
  _id: String(v._id),
  vehicleNumber: v.vehicleNumber,
  routeName: v.routeName,
  driverUserId: v.driverUserId,
  driverName: v.driverName,
  status: v.status,
});

export const transportService = {
  // ── Admin / Principal ────────────────────────────────────────────────────────

  async listVehicles(ctx: AuthContext): Promise<VehicleView[]> {
    const vehicles = await transportRepository.listVehicles(ctx.schoolId);
    return vehicles.map(toVehicleView);
  },

  // GET /users?role=driver is admin-only (see user.routes.ts), but Transport
  // Management is admin+principal — so this exposes the same lookup at a
  // permission level principal can reach too, instead of widening /users.
  async listDrivers(ctx: AuthContext): Promise<{ _id: string; firstName: string; lastName: string }[]> {
    const drivers = await User.find({ schoolId: ctx.schoolId, role: 'driver', status: 'active' })
      .select('firstName lastName')
      .lean();
    return drivers.map((d) => ({ _id: String(d._id), firstName: d.firstName, lastName: d.lastName }));
  },

  async createVehicle(raw: unknown, ctx: AuthContext): Promise<VehicleView> {
    const input = createVehicleSchema.parse(raw);
    const vehicle = await transportRepository.createVehicle({ schoolId: ctx.schoolId, ...input });
    return toVehicleView(vehicle);
  },

  async assignDriver(vehicleId: string, raw: unknown, ctx: AuthContext): Promise<VehicleView> {
    const { driverUserId } = assignDriverSchema.parse(raw);
    const driver = await User.findOne({ _id: driverUserId, schoolId: ctx.schoolId, role: 'driver' }).lean();
    if (!driver) throw new ValidationError('Selected user is not a driver account in this school');

    const vehicle = await transportRepository.assignDriver(
      vehicleId, ctx.schoolId, driverUserId, `${driver.firstName} ${driver.lastName}`,
    );
    if (!vehicle) throw new NotFoundError('Vehicle');
    return toVehicleView(vehicle);
  },

  async assignStudents(vehicleId: string, raw: unknown, ctx: AuthContext): Promise<{ studentIds: string[] }> {
    const { studentIds } = assignStudentsSchema.parse(raw);
    const vehicle = await transportRepository.findVehicleById(vehicleId, ctx.schoolId);
    if (!vehicle) throw new NotFoundError('Vehicle');

    await transportRepository.assignStudents(ctx.schoolId, vehicleId, studentIds);
    return { studentIds: await transportRepository.listStudentIdsForVehicle(ctx.schoolId, vehicleId) };
  },

  async listVehicleStudents(vehicleId: string, ctx: AuthContext): Promise<string[]> {
    const vehicle = await transportRepository.findVehicleById(vehicleId, ctx.schoolId);
    if (!vehicle) throw new NotFoundError('Vehicle');
    return transportRepository.listStudentIdsForVehicle(ctx.schoolId, vehicleId);
  },

  async listAllLive(ctx: AuthContext) {
    const vehicles = await transportRepository.listVehicles(ctx.schoolId);
    const locations = await transportRepository.listLocations(vehicles.map((v) => String(v._id)));
    const byVehicleId = new Map(locations.map((l) => [l.vehicleId, l]));

    return vehicles.map((v) => {
      const loc = byVehicleId.get(String(v._id));
      return {
        ...toVehicleView(v),
        routeStatus: loc?.routeStatus ?? null,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        updatedAt: loc?.updatedAt ?? null,
      };
    });
  },

  // ── Driver ───────────────────────────────────────────────────────────────────

  async getMyVehicle(ctx: AuthContext): Promise<VehicleView | null> {
    const vehicle = await transportRepository.findVehicleByDriver(ctx.userId, ctx.schoolId);
    return vehicle ? toVehicleView(vehicle) : null;
  },

  async requireMyVehicle(ctx: AuthContext): Promise<IVehicle> {
    const vehicle = await transportRepository.findVehicleByDriver(ctx.userId, ctx.schoolId);
    if (!vehicle) throw new NotFoundError('No vehicle assigned to this driver');
    return vehicle;
  },

  // Starting a route and pinging mid-route are the same operation (upsert an
  // 'active' fix) — kept as one method; the controller exposes both
  // /driver/start and /driver/ping for a clearer client-facing API.
  async ping(raw: unknown, ctx: AuthContext) {
    const { latitude, longitude } = locationPingSchema.parse(raw);
    const vehicle = await this.requireMyVehicle(ctx);
    const location = await transportRepository.upsertLocation(
      ctx.schoolId, String(vehicle._id), latitude, longitude, 'active',
    );
    return { routeStatus: location.routeStatus, latitude: location.latitude, longitude: location.longitude, updatedAt: location.updatedAt };
  },

  async endRoute(ctx: AuthContext) {
    const vehicle = await this.requireMyVehicle(ctx);
    await transportRepository.setRouteStatus(String(vehicle._id), 'completed');
  },

  // ── Parent ───────────────────────────────────────────────────────────────────

  async getLiveForParent(ctx: AuthContext, childId?: string): Promise<LiveLocationView> {
    const user = await User.findOne({ _id: ctx.userId, schoolId: ctx.schoolId }).lean();
    const linkedStudentIds = user?.linkedStudentIds ?? [];
    if (linkedStudentIds.length === 0) return { available: false };

    const targetStudentId = childId && linkedStudentIds.includes(childId) ? childId : linkedStudentIds[0];
    if (childId && !linkedStudentIds.includes(childId)) {
      throw new ForbiddenError('You do not have access to this student');
    }

    const assignment = await transportRepository.findAssignmentForStudent(ctx.schoolId, targetStudentId);
    if (!assignment) return { available: false };

    const vehicle = await transportRepository.findVehicleById(assignment.vehicleId, ctx.schoolId);
    if (!vehicle) return { available: false };

    const location = await transportRepository.findLocation(assignment.vehicleId);
    if (!location) return { available: false };

    return {
      available: true,
      vehicleNumber: vehicle.vehicleNumber,
      routeName: vehicle.routeName,
      driverName: vehicle.driverName,
      routeStatus: location.routeStatus,
      latitude: location.latitude,
      longitude: location.longitude,
      updatedAt: location.updatedAt,
    };
  },
};
