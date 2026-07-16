interface TrendPoint { month?: string; date?: string; count?: number; rate?: number; collected?: number }

interface TrendSparklineProps {
  data: TrendPoint[];
  valueKey: 'count' | 'rate' | 'collected';
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export const TrendSparkline = ({
  data,
  valueKey,
  color = '#5B21B6',
  height = 60,
  showLabels = true,
}: TrendSparklineProps) => {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => (d[valueKey] as number) ?? 0);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const range  = maxVal - minVal || 1;

  const w = 240;
  const h = height;
  const pad = 4;
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : w;

  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - minVal) / range) * (h - pad * 2),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M${points[0].x},${h} L${points.map((p) => `${p.x},${p.y}`).join(' L')} L${points[points.length - 1].x},${h} Z`;

  const labels = data.map((d) => d.month ?? d.date?.slice(5) ?? '');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkGrad)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
        ))}
      </svg>
      {showLabels && (
        <div className="flex justify-between mt-1">
          {labels.filter((_, i) => i === 0 || i === labels.length - 1 || (labels.length <= 6)).map((label, i) => (
            <span key={i} className="text-[10px] text-gray-400">{label}</span>
          ))}
        </div>
      )}
    </div>
  );
};
