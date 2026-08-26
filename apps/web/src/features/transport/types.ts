export type RouteStatus = 'active' | 'completed';

export interface VehicleView {
  _id: string;
  vehicleNumber: string;
  routeName: string;
  driverUserId?: string;
  driverName?: string;
  status: string;
}

export interface VehicleLiveView extends VehicleView {
  routeStatus: RouteStatus | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
}

export interface DriverPingResult {
  routeStatus: RouteStatus;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface ParentLiveLocation {
  available: boolean;
  vehicleNumber?: string;
  routeName?: string;
  driverName?: string;
  routeStatus?: RouteStatus;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
}
