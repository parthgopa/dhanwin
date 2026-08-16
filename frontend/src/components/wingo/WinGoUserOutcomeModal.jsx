import React, { useEffect, useState } from 'react';
import { X, Check, Rocket } from 'lucide-react';
import { WinGoBall } from './WinGoBall';

export const WinGoUserOutcomeModal = ({ outcome, onClose }) => {
  if (!outcome) return null;

  const isWon = outcome.status === 'WON';
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoCloseSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const modeLabels = {
    '30s': 'WinGo 30sec',
    '1m':  'WinGo 1 Min',
    '3m':  'WinGo 3 Min',
    '5m':  'WinGo 5 Min',
  };

  const getColorPillStyle = (col) => {
    if (col === 'RED_VIOLET') return 'bg-gradient-to-r from-red-500 to-purple-600';
    if (col === 'GREEN_VIOLET') return 'bg-gradient-to-r from-emerald-500 to-purple-600';
    if (col === 'RED') return 'bg-[#ff4d61]';
    if (col === 'VIOLET') return 'bg-[#8c52ff]';
    return 'bg-[#00b977]';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none">
      
      {/* Click outside */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[340px] flex flex-col items-center z-10">
        
        {/* ── CARD CONTAINER ──────────────────────────────────────────────── */}
        <div
          className={`relative w-full rounded-[36px] px-6 pt-12 pb-6 flex flex-col items-center shadow-2xl overflow-visible transition-all animate-scaleBounce ${
            isWon
              ? 'bg-gradient-to-b from-[#ff8c42] via-[#ff6b4a] to-[#ff5252] text-white shadow-orange-950/60'
              : 'bg-gradient-to-b from-[#dbeafe] via-[#bfdbfe] to-[#93c5fd] text-slate-800 shadow-blue-950/50'
          }`}
        >
          
          {/* Top Winged Rocket Badge */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center">
            {/* Wing details left & right */}
            <div className="relative flex items-center justify-center">
              {/* Outer Glow */}
              <div className={`w-28 h-28 rounded-full blur-xl absolute ${isWon ? 'bg-amber-400/40' : 'bg-cyan-300/40'}`} />
              
              {/* Ribbon Graphic */}
              <div className="relative z-10 flex items-center">
                {/* Center Rocket Medal */}
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-xl ${
                  isWon
                    ? 'bg-gradient-to-b from-[#ffe082] via-[#ffb300] to-[#ff8f00] border-amber-200 text-white'
                    : 'bg-gradient-to-b from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] border-white text-blue-600'
                }`}>
                  <Rocket className="w-10 h-10 stroke-[2.5] transform -rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* Title: Congratulations or Sorry */}
          <div className="mt-4 text-center">
            <h3 className={`text-2xl sm:text-3xl font-black tracking-wide ${
              isWon ? 'text-white drop-shadow-md' : 'text-[#475569]'
            }`}>
              {isWon ? 'Congratulations' : 'Sorry'}
            </h3>
          </div>

          {/* Lottery Results Row */}
          <div className="w-full mt-4 flex items-center justify-between px-2 text-xs font-bold">
            <span className={`text-[11px] font-black ${isWon ? 'text-white/90' : 'text-[#64748b]'}`}>
              Lottery<br />results
            </span>

            <div className="flex items-center gap-1.5">
              {/* Color pill */}
              <span className={`px-2.5 py-1 rounded-md text-white font-black text-[11px] shadow ${getColorPillStyle(outcome.winningColor)}`}>
                {outcome.winningColor === 'RED_VIOLET' ? 'Red Violet' :
                 outcome.winningColor === 'GREEN_VIOLET' ? 'Green Violet' :
                 outcome.winningColor}
              </span>

              {/* Number ball */}
              <WinGoBall num={outcome.winningNumber} size="sm" />

              {/* Size pill */}
              <span className={`px-2.5 py-1 rounded-md text-white font-black text-[11px] shadow ${
                outcome.winningSize === 'BIG' ? 'bg-[#00b977]' : 'bg-[#5da8ff]'
              }`}>
                {outcome.winningSize === 'BIG' ? 'Big' : 'Small'}
              </span>
            </div>
          </div>

          {/* ── WHITE SLIDING RECEIPT / CARD ─────────────────────────────────── */}
          <div className="w-full mt-4 relative">
            {/* Slot slit */}
            <div className={`w-full h-3 rounded-full mx-auto ${
              isWon ? 'bg-[#c2410c]/40' : 'bg-[#64748b]/30'
            }`} />

            {/* Paper Ticket Content */}
            <div
              className="relative -mt-1.5 bg-gradient-to-b from-[#f8fafc] to-[#ffffff] rounded-b-2xl p-4 text-center shadow-xl space-y-1.5 border border-white"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 92%, 85% 100%, 15% 100%, 0 92%)',
              }}
            >
              {isWon ? (
                <>
                  <div className="text-sm font-black text-[#f97316] uppercase tracking-wider">
                    Bonus
                  </div>
                  <div className="text-3xl font-black font-mono text-[#ef4444] tracking-tight">
                    ₹{Number(outcome.wonAmount || 0).toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-2xl font-black text-[#64748b] py-2">
                  Sorry
                </div>
              )}

              <div className="text-[11px] text-gray-500 font-bold leading-tight pt-1">
                <div>Period {modeLabels[outcome.mode] || outcome.mode}</div>
                <div className="font-mono text-gray-600 font-bold">{outcome.periodId}</div>
              </div>
            </div>
          </div>

          {/* Auto Close Checkbox */}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              isWon ? 'bg-white text-orange-500' : 'bg-blue-600 text-white'
            }`}>
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span className={isWon ? 'text-white font-semibold' : 'text-slate-700 font-semibold'}>
              {autoCloseSeconds} seconds auto close
            </span>
          </div>

        </div>

        {/* ── FLOATING CLOSE BUTTON (X) ────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="mt-4 w-11 h-11 rounded-full bg-black/60 border-2 border-white/80 text-white flex items-center justify-center hover:bg-black/80 hover:scale-110 active:scale-95 transition shadow-2xl"
        >
          <X className="w-6 h-6 stroke-[2.5]" />
        </button>

      </div>
    </div>
  );
};
