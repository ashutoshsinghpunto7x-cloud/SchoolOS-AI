import { useEffect, useRef, useState } from 'react';
import { Bus, MapPin, Clock, AlertTriangle, Loader2, Play, Square } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyVehicle, useStartRoute, usePing, useEndRoute } from '../hooks/useTransport';

// GPS ping cadence — mid-range of the 15–30s spec.
const PING_INTERVAL_MS = 20_000;

type TrackingState = 'idle' | 'active' | 'permission_denied' | 'error';

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
    });
  });

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
      const { latitude, longitude } = pos.coords;
      await ping({ latitude, longitude });
      setLastFix({ lat: latitude, lng: longitude, at: new Date() });
    } catch {
      // A single missed ping isn't fatal — the loop just tries again next
      // interval. Only surfaced if the driver never gets a location at all.
    }
  };

  const handleStart = async () => {
    setErrorMessage(null);
    try {
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;
      await startRoute({ latitude, longitude });
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
