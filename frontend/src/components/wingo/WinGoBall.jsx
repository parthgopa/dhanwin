import React from 'react';

/**
 * Premium 3D WinGo Lottery Ball
 * - Clean spherical ball with specular highlights and inner number disc
 * - 4 outer corner circles completely removed
 * - Mobile responsive sizing (compact on small phones, 25% larger on medium/desktop)
 */
export const WinGoBall = ({ num, size = 'md', className = '', onClick, disabled = false }) => {
  const n = Number(num);

  const sizeMap = {
    xs: 'w-5 h-5 sm:w-7 sm:h-7',
    sm: 'w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-9 sm:h-9',
    md: 'w-9 h-9 sm:w-12 sm:h-12',
    lg: 'w-12 h-12 min-[380px]:w-14 min-[380px]:h-14 sm:w-18 sm:h-18',
    xl: 'w-16 h-16 sm:w-24 sm:h-24',
  };
  const dimensionClass = className ? className : (sizeMap[size] || size);

  // Font color for center number
  const getNumberColor = (val) => {
    if (val === 0) return '#9333ea'; // violet
    if (val === 5) return '#16a34a'; // green
    if ([2, 4, 6, 8].includes(val)) return '#e11d48'; // red
    return '#16a34a'; // green
  };

  const idSuffix = `${n}_${Math.random().toString(36).substr(2, 5)}`;

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${dimensionClass} ${
        onClick && !disabled ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-md"
      >
        <defs>
          {/* Red Radial Gradient */}
          <radialGradient id={`red_${idSuffix}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ff758c" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Green Radial Gradient */}
          <radialGradient id={`green_${idSuffix}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#065f46" />
          </radialGradient>

          {/* Ball 0: Red & Violet Diagonal Split */}
          <linearGradient id={`split0_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="48%" stopColor="#ef4444" />
            <stop offset="52%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>

          {/* Ball 5: Green & Violet Diagonal Split */}
          <linearGradient id={`split5_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="48%" stopColor="#10b981" />
            <stop offset="52%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>

          {/* Shadow Filter for 3D depth */}
          <filter id={`ballShadow_${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
          </filter>

          {/* Inner Disc Shadow */}
          <filter id={`discShadow_${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* ── 1. MAIN 3D COLORED SPHERE ───────────────────────────────────── */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill={
            n === 0
              ? `url(#split0_${idSuffix})`
              : n === 5
              ? `url(#split5_${idSuffix})`
              : [2, 4, 6, 8].includes(n)
              ? `url(#red_${idSuffix})`
              : `url(#green_${idSuffix})`
          }
          filter={`url(#ballShadow_${idSuffix})`}
        />

        {/* ── 2. 3D SPECULAR GLOSS HIGHLIGHT ─────────────────────────────── */}
        <ellipse
          cx="42"
          cy="32"
          rx="22"
          ry="14"
          fill="#ffffff"
          fillOpacity="0.25"
          transform="rotate(-18 42 32)"
        />

        {/* ── 3. INNER SOLID WHITE CIRCLE DISC ───────────────────────────── */}
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="#ffffff"
          stroke="rgba(0, 0, 0, 0.08)"
          strokeWidth="1.5"
          filter={`url(#discShadow_${idSuffix})`}
        />

        {/* ── 4. BOLD HIGH-CONTRAST CENTER NUMBER ────────────────────────── */}
        <text
          x="50"
          y="63"
          textAnchor="middle"
          fontSize="38"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={getNumberColor(n)}
        >
          {n}
        </text>
      </svg>
    </div>
  );
};

export default WinGoBall;
