import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { MeetingNotesWidget } from './MeetingNotesWidget';
import type { PrincipalUpcomingEvent } from '@schoolos/types';

// Kanpur coordinates — Open-Meteo needs no API key, so this stays self-contained.
const WEATHER_LAT = 26.4499;
const WEATHER_LON = 80.3319;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ── Analog clock ─────────────────────────────────────────────────────────────

function AnalogClock({ now, size = 132 }: { now: Date; size?: number }) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDeg = hours * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  const c = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={c - 2} fill="white" stroke="#E5E7EB" strokeWidth={2} />
      {[0, 3, 6, 9].map((h) => {
        const angle = (h * 30 - 90) * (Math.PI / 180);
        const x = c + (c - 16) * Math.cos(angle);
        const y = c + (c - 16) * Math.sin(angle);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight={600} fill="#374151">
            {h === 0 ? 12 : h}
          </text>
        );
      })}
      {/* Hour hand */}
      <line
        x1={c} y1={c}
        x2={c + (size * 0.22) * Math.cos((hourDeg - 90) * (Math.PI / 180))}
        y2={c + (size * 0.22) * Math.sin((hourDeg - 90) * (Math.PI / 180))}
        stroke="#111827" strokeWidth={4} strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={c} y1={c}
        x2={c + (size * 0.32) * Math.cos((minuteDeg - 90) * (Math.PI / 180))}
        y2={c + (size * 0.32) * Math.sin((minuteDeg - 90) * (Math.PI / 180))}
        stroke="#111827" strokeWidth={3} strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1={c} y1={c}
        x2={c + (size * 0.34) * Math.cos((secondDeg - 90) * (Math.PI / 180))}
        y2={c + (size * 0.34) * Math.sin((secondDeg - 90) * (Math.PI / 180))}
        stroke="#7C3AED" strokeWidth={1.5} strokeLinecap="round"
      />
      <circle cx={c} cy={c} r={4} fill="#7C3AED" />
    </svg>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/60">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
        {sub && <p className="text-xs text-white/60">{sub}</p>}
      </div>
    </div>
  );
}

// ── Weather ───────────────────────────────────────────────────────────────────

interface OpenMeteoResponse {
  current_weather: { temperature: number; weathercode: number };
}

const WEATHER_CODE_MAP: Record<number, { label: string; icon: React.ElementType }> = {
  0: { label: 'Clear sky', icon: Sun },
  1: { label: 'Mostly clear', icon: Sun },
  2: { label: 'Partly cloudy', icon: Cloud },
  3: { label: 'Overcast', icon: Cloud },
  45: { label: 'Fog', icon: CloudFog },
  48: { label: 'Fog', icon: CloudFog },
  51: { label: 'Light drizzle', icon: CloudRain },
  61: { label: 'Rain', icon: CloudRain },
  71: { label: 'Snow', icon: CloudSnow },
  80: { label: 'Showers', icon: CloudRain },
  95: { label: 'Thunderstorm', icon: CloudLightning },
};

function describeWeather(code: number) {
  return WEATHER_CODE_MAP[code] ?? WEATHER_CODE_MAP[Math.floor(code / 10) * 10] ?? { label: 'Weather', icon: Cloud };
}

function useWeather() {
  return useQuery({
    queryKey: ['principal-weather'],
    queryFn: async (): Promise<OpenMeteoResponse> => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true`,
      );
      if (!res.ok) throw new Error('Weather unavailable');
      return res.json();
    },
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

function WeatherChip() {
  const { data, isLoading, isError } = useWeather();
  if (isLoading || isError || !data) return null;

  const { label, icon: Icon } = describeWeather(data.current_weather.weathercode);
  return (
    <div className="flex items-center gap-3 bg-white/90 border border-white/20 rounded-xl px-4 py-3">
      <Icon className="w-6 h-6 text-amber-500 shrink-0" strokeWidth={1.75} />
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{Math.round(data.current_weather.temperature)}°C</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function PrincipalHeaderWidget(_props: { upcomingEvents?: PrincipalUpcomingEvent[] }) {
  const { user } = useAuth();
  const now = useNow(1000);

  const dateStr = useMemo(
    () => now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [now.getDate()],
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg shadow-black/10 p-6"
      style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)' }}
    >
      {/* Decorative blobs — same treatment as the teacher dashboard's hero header */}
      <div className="absolute top-0 right-0 w-52 h-52 rounded-full bg-white/5 -translate-y-10 translate-x-10 pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

      <p className="relative text-xs text-white/60 font-medium mb-4 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Your daily command center
      </p>

      <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center lg:items-start">
        <div className="flex justify-center lg:justify-start">
          <AnalogClock now={now} />
        </div>

        <div>
          <p className="text-sm font-semibold text-white/70">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
            {user?.firstName ?? 'Principal'} <span aria-hidden="true">👋</span>
          </h1>

          <div className="mt-4 space-y-3">
            <InfoRow icon={Clock} label="Today's Date" value={dateStr} />
          </div>

          <div className="mt-3">
            <WeatherChip />
          </div>
        </div>

        <div className="w-full lg:w-72">
          <MeetingNotesWidget now={now} />
        </div>
      </div>
    </div>
  );
}
