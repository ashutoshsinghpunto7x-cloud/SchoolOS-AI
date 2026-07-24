import type { ReactNode } from 'react';

export function MetricCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[#98A2B3]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#F4F6F8]" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-[#64748B]">{sublabel}</div>}
    </div>
  );
}
