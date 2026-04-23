/* global React */
// SVG-drawn device — our own, scalable, sharp
const Device = ({ size = 320, showScreen = true, dark = false, stand = true }) => {
  const w = size;
  const h = size * 1.35;
  return (
    <svg viewBox="0 0 320 432" width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="dv-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fafafa"/>
          <stop offset="1" stopColor="#d8d8d8"/>
        </linearGradient>
        <linearGradient id="dv-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111"/>
          <stop offset="1" stopColor="#1f1f1f"/>
        </linearGradient>
        <linearGradient id="dv-stand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8e8e8"/>
          <stop offset="1" stopColor="#c0c0c0"/>
        </linearGradient>
        <radialGradient id="dv-glow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#17e06d" stopOpacity="0.45"/>
          <stop offset="1" stopColor="#17e06d" stopOpacity="0"/>
        </radialGradient>
        <filter id="dv-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
          <feOffset dx="0" dy="8" result="off"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* soft ground shadow */}
      {stand && <ellipse cx="160" cy="418" rx="120" ry="10" fill="rgba(0,0,0,0.18)"/>}

      {/* Wedge stand */}
      {stand && (
        <g filter="url(#dv-shadow)">
          <path d="M 60 410 L 260 410 L 240 260 L 80 260 Z" fill="url(#dv-stand)"/>
          <path d="M 80 260 L 240 260 L 235 275 L 85 275 Z" fill="#aaa" opacity="0.4"/>
        </g>
      )}

      {/* Device body — tilted tablet */}
      <g filter="url(#dv-shadow)">
        <path d="M 70 380 L 250 380 L 235 50 L 85 50 Z" fill="url(#dv-body)" stroke="#b8b8b8" strokeWidth="1"/>
        {/* Side edge suggestion */}
        <path d="M 250 380 L 263 370 L 248 55 L 235 50 Z" fill="#c8c8c8"/>
        {/* Screen bezel */}
        <path d="M 90 360 L 230 360 L 218 70 L 102 70 Z" fill="#0a0a0a"/>

        {/* Green ovals screen pattern */}
        {showScreen && (
          <g>
            {/* glow */}
            <ellipse cx="160" cy="215" rx="90" ry="130" fill="url(#dv-glow)"/>
            {/* top oval */}
            <ellipse cx="160" cy="120" rx="48" ry="10" fill="#17e06d" opacity="0.85"/>
            <ellipse cx="160" cy="120" rx="48" ry="10" fill="none" stroke="#17e06d" strokeWidth="1.2"/>
            {/* center N pay badge */}
            <circle cx="160" cy="210" r="36" fill="none" stroke="#17e06d" strokeWidth="1.5"/>
            <circle cx="148" cy="210" r="10" fill="#17e06d"/>
            <text x="148" y="215" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0a0a0a" fontFamily="system-ui">N</text>
            <text x="175" y="216" fontSize="13" fontWeight="700" fill="#17e06d" fontFamily="system-ui">pay</text>
            {/* bottom oval */}
            <ellipse cx="160" cy="295" rx="60" ry="14" fill="#17e06d"/>
            <ellipse cx="160" cy="325" rx="72" ry="8" fill="none" stroke="#17e06d" strokeWidth="1" opacity="0.5"/>
          </g>
        )}

        {/* Small connect logo at bottom */}
        <g transform="translate(160, 345)">
          <circle cx="-12" cy="0" r="4" fill="#17e06d"/>
          <text x="-5" y="3" fontSize="7" fontWeight="700" fill="#999" fontFamily="system-ui">connect</text>
        </g>
      </g>
    </svg>
  );
};
window.Device = Device;
