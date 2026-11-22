/** Frosty — the dashboard's little helper snowman. Pure SVG; the wave / blink /
 *  idle-sway animations live in winter.css (.tw-frosty*). */
export function Frosty({ onClick, jumpKey }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; jumpKey: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Frosty the helper snowman — tap to chat"
      className="tw-frosty-btn"
    >
      {/* jumpKey remounts the svg so the one-shot jump animation replays on every tap */}
      <svg key={jumpKey} className={`tw-frosty${jumpKey > 0 ? ' tw-frosty-jump' : ''}`} viewBox="0 0 120 170" aria-hidden="true">
        <defs>
          <radialGradient id="tw-sh" cx=".35" cy=".3" r=".9">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#9db8e6" stopOpacity=".55" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="164" rx="40" ry="5" fill="rgba(0,0,40,.18)" />
        {[[126, 34], [78, 26], [38, 21]].map(([cy, r]) => (
          <g key={cy}>
            <circle cx="60" cy={cy} r={r} fill="#fff" />
            <circle cx="60" cy={cy} r={r} fill="url(#tw-sh)" />
          </g>
        ))}
        <path d="M36 78 L10 62 M16 66 L8 58" stroke="#6b4423" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <g className="tw-frosty-arm">
          <path d="M84 78 L112 58 M106 62 L112 52" stroke="#6b4423" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>
        <rect x="40" y="12" width="40" height="7" rx="3" fill="#1B2A4E" />
        <rect x="47" y="-6" width="26" height="20" rx="3" fill="#254A9A" />
        <rect x="47" y="6" width="26" height="4" fill="#F5B332" />
        <circle className="tw-frosty-eye" cx="52" cy="36" r="2.6" fill="#1B2A4E" />
        <circle className="tw-frosty-eye" cx="68" cy="36" r="2.6" fill="#1B2A4E" />
        <path d="M60 42 L78 46 L60 49Z" fill="#f08a24" />
        <path d="M50 51 Q60 58 70 51" stroke="#1B2A4E" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="46" cy="46" r="4" fill="#ffb4c2" opacity=".6" />
        <circle cx="74" cy="46" r="4" fill="#ffb4c2" opacity=".6" />
        <path d="M40 58 Q60 70 80 58 L80 66 Q60 78 40 66Z" fill="#e0354b" />
        <path d="M72 64 L80 90 L70 88Z" fill="#c42a3e" />
        <circle cx="60" cy="90" r="2.6" fill="#1B2A4E" />
        <circle cx="60" cy="104" r="2.6" fill="#1B2A4E" />
        <circle cx="60" cy="118" r="2.6" fill="#1B2A4E" />
      </svg>
    </button>
  );
}
