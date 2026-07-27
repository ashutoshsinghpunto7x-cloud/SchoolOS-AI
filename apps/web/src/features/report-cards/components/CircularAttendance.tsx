interface CircularAttendanceProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

/** Minimal, print-safe circular progress — pure SVG, no animation library,
 *  renders identically on screen and in a printed/PDF page. */
export function CircularAttendance({
  percent, size = 88, strokeWidth = 7, color = '#1C2B4A', trackColor = '#E8E9EE', label = 'Attendance',
}: CircularAttendanceProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color }}>{clamped}%</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-[0.14em] text-gray-400">{label}</span>
    </div>
  );
}
