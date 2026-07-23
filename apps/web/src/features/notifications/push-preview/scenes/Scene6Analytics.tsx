import { CheckCircle2, MailOpen, Clock3, XCircle } from 'lucide-react';

const METRICS = [
  { label: 'Delivered', value: '1,284', icon: CheckCircle2, tone: '#16A34A', bg: '#F0FDF4' },
  { label: 'Opened', value: '947', icon: MailOpen, tone: '#F97316', bg: '#FFF7ED' },
  { label: 'Pending', value: '38', icon: Clock3, tone: '#78716C', bg: '#FAFAF9' },
  { label: 'Failed', value: '12', icon: XCircle, tone: '#DC2626', bg: '#FEF2F2' },
];

const DELIVERY_TREND = [62, 74, 58, 88, 71, 95, 84];
const READ_RATE = 73;
const CLICK_RATE = 41;

const Ring = ({ value, label }: { value: number; label: string }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#F1EEE8" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke="#F97316" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="61" textAnchor="middle" fontSize="20" fontWeight="600" fill="#18181B">{value}%</text>
      </svg>
      <p className="text-[13px] text-[#57534E] mt-2">{label}</p>
    </div>
  );
};

// Scene 6 (brief's Scene 7) — outcomes of the send: how many devices got it,
// how many teachers actually opened it, and where delivery is still stuck.
export const Scene6Analytics = () => {
  const max = Math.max(...DELIVERY_TREND);
  return (
    <div className="rounded-3xl bg-white border border-[#EEEBE4] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-7">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C2410C] mb-1">Analytics</p>
      <h3 className="text-[22px] font-semibold text-[#18181B] mb-6">Staff meeting reschedule &mdash; delivery report</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {METRICS.map(({ label, value, icon: Icon, tone, bg }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: bg }}>
            <Icon size={18} style={{ color: tone }} />
            <p className="text-[24px] font-semibold tabular-nums mt-2" style={{ color: tone }}>{value}</p>
            <p className="text-[12.5px] text-[#57534E]">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <p className="text-[13px] font-medium text-[#3f3f46] mb-3">Delivery over the last 7 days</p>
          <div className="flex items-end gap-3 h-32">
            {DELIVERY_TREND.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md"
                  style={{ height: `${(v / max) * 100}%`, background: i === DELIVERY_TREND.length - 1 ? '#F97316' : '#FDE9D8' }}
                />
                <span className="text-[11px] text-[#a8a29e]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <Ring value={READ_RATE} label="Read rate" />
          <Ring value={CLICK_RATE} label="Click rate" />
        </div>
      </div>
    </div>
  );
};
