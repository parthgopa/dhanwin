import React from 'react';
import { Lock } from 'lucide-react';

export const WinGoLockOverlay = ({ remainingSec = 5 }) => {
  if (remainingSec > 5 || remainingSec <= 0) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 rounded-3xl backdrop-blur-[2px] animate-fadeIn select-none pointer-events-none">
      {/* Giant Glowing Countdown Digit */}
      <div
        key={remainingSec}
        className="text-8xl sm:text-9xl font-mono font-black text-red-500 animate-scaleBounce drop-shadow-[0_0_35px_rgba(239,68,68,0.9)]"
      >
        {remainingSec}
      </div>
    </div>
  );
};
