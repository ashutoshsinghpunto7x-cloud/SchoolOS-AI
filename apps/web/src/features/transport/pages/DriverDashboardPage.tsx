import { useEffect, useRef, useState } from 'react';
import { Bus, MapPin, Clock, AlertTriangle, Loader2, Play, Square } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyVehicle, useStartRoute, usePing, useEndRoute } from '../hooks/useTransport';

// GPS ping cadence — mid-range of the 15–30s spec.
const PING_INTERVAL_MS = 20_000;

// A fix worse than this (in meters, per the browser's own coords.accuracy)
// is treated as too noisy to trust — common indoors / near tall buildings,
// where Wi-Fi/cell-based positioning can be 50-100m+ off.
const MAX_ACCEPTABLE_ACCURACY_M = 75;

// A jump implying faster than this is a GPS glitch, not real movement — vans
// don't do highway speeds on a school route; this just guards against the
// occasional wild fix teleporting the pin.
const MAX_PLAUSIBLE_SPEED_MPS = 40; // ~144 km/h

type TrackingState = 'idle' | 'active' | 'permission_denied' | 'error';

interface AcceptedFix { lat: number; lng: number; at: number }

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
    });
  });

// Haversine distance in meters.
const distanceMeters = (a: AcceptedFix, b: { lat: number; lng: number }): number => {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Decides whether a raw browser fix is trustworthy enough to send as a ping.
// With no prior accepted fix (first fix of the route) we have nothing to
// compare against, so it always passes — the driver has to start somewhere.
const evaluateFix = (pos: GeolocationPosition, lastAccepted: AcceptedFix | null): boolean => {
  const accuracy = pos.coords.accuracy ?? Infinity;
  if (lastAccepted === null) return true;
  if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) return false;

  const elapsedSec = Math.max((pos.timestamp - lastAccepted.at) / 1000, 1);
  const impliedSpeed = distanceMeters(lastAccepted, { lat: pos.coords.latitude, lng: pos.coords.longitude }) / elapsedSec;
  return impliedSpeed <= MAX_PLAUSIBLE_SPEED_MPS;
};

export function DriverDashboardPage() {
  const { user } = useAuth();
  const { data: vehicle, isLoading: vehicleLoading } = useMyVehicle();
  const { mutateAsync: startRoute } = useStartRoute();
  const { mutateAsync: ping } = usePing();
  const { mutateAsync: endRoute } = useEndRoute();

  const [state, setState] = useState<TrackingState>('idle');
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; at: Date } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Last fix that passed the accuracy/speed filter — the baseline the next
  // fix is checked against. Cleared on End Route so the next Start doesn't
  // compare across two unrelated trips.
  const lastAcceptedRef = useRef<AcceptedFix | null>(null);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopInterval(), []);

  const sendPing = async () => {
    try {
      const pos = await getPosition();
      if (!evaluateFix(pos, lastAcceptedRef.current)) return; // noisy/implausible fix — skip this ping, try again next interval

      const { latitude, longitude } = pos.coords;
      await ping({ latitude, longitude });
      lastAcceptedRef.current = { lat: latitude, lng: longitude, at: pos.timestamp };
      setLastFix({ lat: latitude, lng: longitude, at: new Date() });
    } catch {
      // A single missed ping isn't fatal — the loop just tries again next
      // interval. Only surfaced if the driver never gets a location at all.
    }
  };

  const handleStart = async () => {
    setErrorMessage(null);
    lastAcceptedRef.current = null;
    try {
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;
      await startRoute({ latitude, longitude });
      lastAcceptedRef.current = { lat: latitude, lng: longitude, at: pos.timestamp };
      setLastFix({ lat: latitude, lng: longitude, at: new Date() });
      setState('active');
      intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        setState('permission_denied');
        setErrorMessage('Location permission was denied. Enable location access for this site in your browser settings, then try again.');
      } else {
        setState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Could not get your location. Please try again.');
      }
    }
  };

  const handleEnd = async () => {
    stopInterval();
    lastAcceptedRef.current = null;
    try {
      await endRoute();
    } finally {
      setState('idle');
    }
  };

  if (vehicleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <Bus className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-lg font-bold text-gray-900 mb-1">No vehicle assigned</h1>
        <p className="text-sm text-gray-500">Ask your school admin to assign you to a vehicle.</p>
      </div>
    );
  }

  const isActive = state === 'active';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-8 pb-4 border-b border-gray-100">
        <p className="text-sm text-gray-500">Welcome{user ? `, ${user.firstName}` : ''}</p>
        <h1 className="text-2xl font-bold text-gray-900">Transport Dashboard</h1>
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-md w-full mx-auto">
        {/* Vehicle info card */}
        <section className="rounded-2xl border-2 border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Bus className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{vehicle.vehicleNumber}</p>
              <p className="text-sm text-gray-500">{vehicle.routeName}</p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'Route Active' : 'Route Not Started'}
          </div>
        </section>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Big action button — high contrast, easy to hit while travelling */}
        {!isActive ? (
          <button
            type="button"
            onClick={() => void handleStart()}
            className="w-full h-20 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all text-white text-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-600/20"
          >
            <Play className="w-7 h-7" fill="white" /> Start Route
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleEnd()}
            className="w-full h-20 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all text-white text-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-600/20"
          >
            <Square className="w-7 h-7" fill="white" /> End Route
          </button>
        )}

        {/* Live tracking details */}
        {isActive && lastFix && (
          <section className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-700 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Current Location</p>
                <p className="text-sm font-mono font-semibold text-gray-900">
                  {lastFix.lat.toFixed(5)}, {lastFix.lng.toFixed(5)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-700 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">{lastFix.at.toLocaleTimeString()}</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default DriverDashboardPage;
