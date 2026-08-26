import { z } from 'zod';

export const createVehicleSchema = z.object({
  vehicleNumber: z.string({ required_error: 'Vehicle number is required' }).min(1).max(30).trim(),
  routeName:     z.string({ required_error: 'Route name is required' }).min(1).max(100).trim(),
});

export const assignDriverSchema = z.object({
  driverUserId: z.string({ required_error: 'Driver is required' }).min(1),
});

export const assignStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Select at least one student'),
});

export const locationPingSchema = z.object({
  latitude:  z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
});
