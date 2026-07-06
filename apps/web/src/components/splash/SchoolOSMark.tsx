export const SchoolOSMark = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mark-left" x1="8" y1="40" x2="46" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#BFDBFE" />
      </linearGradient>
      <linearGradient id="mark-right" x1="50" y1="40" x2="88" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#60A5FA" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="mark-roof" x1="48" y1="14" x2="48" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#93C5FD" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
    </defs>

    {/* Open book */}
    <path d="M48 48 L10 60 L10 84 L48 72 Z" fill="url(#mark-left)" />
    <path d="M48 48 L86 60 L86 84 L48 72 Z" fill="url(#mark-right)" />
    <path d="M48 48 L48 72" stroke="#0B1220" strokeOpacity="0.15" strokeWidth="1.5" />

    {/* Graduation cap */}
    <path d="M48 14 L74 26 L48 38 L22 26 Z" fill="url(#mark-roof)" />
    <rect x="41" y="27" width="14" height="14" rx="2" fill="#0B1220" fillOpacity="0.85" />
    <rect x="44" y="30" width="3.5" height="3.5" rx="0.6" fill="#93C5FD" />
    <rect x="48.5" y="30" width="3.5" height="3.5" rx="0.6" fill="#93C5FD" />
    <rect x="44" y="34.5" width="3.5" height="3.5" rx="0.6" fill="#93C5FD" />
    <rect x="48.5" y="34.5" width="3.5" height="3.5" rx="0.6" fill="#93C5FD" />
    <path d="M64 24 L67 24 L67 34 L65.5 37 L64 34 Z" fill="#1D4ED8" />
  </svg>
);
