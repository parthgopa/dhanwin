import React from 'react';

/**
 * Pixel-Perfect Lottery Ball with 4 circles popping outside the ball
 * Exact replica of the user's reference image
 */
export const WinGoBall = ({ num, size = 'md', className = '', onClick, disabled = false }) => {
  const n = Number(num);

  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
    xl: 'w-18 h-18 sm:w-22 sm:h-22',
  };
  const dimensionClass = sizeMap[size] || size;

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
        onClick && !disabled ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-md"
      >
        <defs>
          {/* Red Gradient */}
          <radialGradient id={`red_${idSuffix}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff5e6c" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>

          {/* Green Gradient */}
          <radialGradient id={`green_${idSuffix}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>

          {/* Ball 0: Red & Violet Diagonal Split */}
          <linearGradient id={`split0_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="48%" stopColor="#ef4444" />
            <stop offset="52%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>

          {/* Ball 5: Green & Violet Diagonal Split */}
          <linearGradient id={`split5_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="48%" stopColor="#10b981" />
            <stop offset="52%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>

          {/* Soft Shadow Filter for White Knobs */}
          <filter id={`shadow_${idSuffix}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* ── 1. MAIN COLORED SPHERE ─────────────────────────────────────── */}
        <circle
          cx="50"
          cy="50"
          r="34"
          fill={
            n === 0
              ? `url(#split0_${idSuffix})`
              : n === 5
              ? `url(#split5_${idSuffix})`
              : [2, 4, 6, 8].includes(n)
              ? `url(#red_${idSuffix})`
              : `url(#green_${idSuffix})`
          }
        />

        {/* ── 2. 4 WHITE CIRCLES POPPING OUTSIDE THE BALL ────────────────── */}
        {/* Top Circle */}
        <circle
          cx="50"
          cy="16"
          r="11"
          fill="#e2e8f0"
          fillOpacity="0.88"
          stroke="#ffffff"
          strokeWidth="1"
          filter={`url(#shadow_${idSuffix})`}
        />
        {/* Bottom Circle */}
        <circle
          cx="50"
          cy="84"
          r="11"
          fill="#e2e8f0"
          fillOpacity="0.88"
          stroke="#ffffff"
          strokeWidth="1"
          filter={`url(#shadow_${idSuffix})`}
        />
        {/* Left Circle */}
        <circle
          cx="16"
          cy="50"
          r="11"
          fill="#e2e8f0"
          fillOpacity="0.88"
          stroke="#ffffff"
          strokeWidth="1"
          filter={`url(#shadow_${idSuffix})`}
        />
        {/* Right Circle */}
        <circle
          cx="84"
          cy="50"
          r="11"
          fill="#e2e8f0"
          fillOpacity="0.88"
          stroke="#ffffff"
          strokeWidth="1"
          filter={`url(#shadow_${idSuffix})`}
        />

        {/* ── 3. INNER SOLID WHITE CIRCLE ────────────────────────────────── */}
        <circle
          cx="50"
          cy="50"
          r="23"
          fill="#ffffff"
          filter={`url(#shadow_${idSuffix})`}
        />

        {/* ── 4. CENTER NUMBER ───────────────────────────────────────────── */}
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fontSize="30"
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
