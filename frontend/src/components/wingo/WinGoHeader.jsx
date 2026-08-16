import React from 'react';
import { Clock, BookOpen } from 'lucide-react';
import { WinGoBall } from './WinGoBall';

const MODES = [
  { id: '30s', label: 'WinGo 30sec' },
  { id: '1m',  label: 'WinGo 1 Min' },
  { id: '3m',  label: 'WinGo 3 Min' },
  { id: '5m',  label: 'WinGo 5 Min' },
];

export const WinGoHeader = ({
  activeMode = '30s',
  onSelectMode,
  periodId = '20260815100010951',
  remainingSec = 30,
  recentBalls = [4, 1, 1, 8, 1],
  onOpenHowToPlay,
}) => {
  // Format MM:SS into individual digits for flip-box styling
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const mmStr = String(minutes).padStart(2, '0');
  const ssStr = String(seconds).padStart(2, '0');

  const selectedModeConfig = MODES.find(m => m.id === activeMode) || MODES[0];

  return (
    <div className="space-y-3 font-sans select-none">
      
      {/* ── 1. 4-ROOM MODE SELECTOR TABS ───────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 bg-[#17132c] p-1.5 rounded-2xl border border-purple-950/60 shadow-xl">
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#d97706] text-black shadow-xl font-black scale-[1.02]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 font-bold'
              }`}
            >
              <Clock className={`w-5 h-5 mb-1 ${isActive ? 'text-black stroke-[2.5]' : 'text-gray-400'}`} />
              <span className="text-[11px] sm:text-xs tracking-tight text-center leading-tight">
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 2. YELLOW TICKET CARD ──── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#f7ba38] via-[#f9c74f] to-[#f7ba38] text-black p-3 sm:p-4 shadow-xl border border-amber-300">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 items-center">
          
          {/* Left Side: How to play + Mode + Last 5 winning balls */}
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <button
              onClick={onOpenHowToPlay}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-black/10 hover:bg-black/20 text-gray-900 rounded-full border border-black/20 text-[10px] sm:text-[11px] font-extrabold transition"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>How To Play</span>
            </button>
            <div className="text-xs sm:text-sm font-black tracking-wide text-gray-900 truncate">
              {selectedModeConfig.label}
            </div>

            {/* Last 5 Winning Balls */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-hidden">
              {recentBalls.slice(0, 5).map((ball, idx) => (
                <WinGoBall
                  key={idx}
                  num={ball}
                  size="xs"
                  className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-8 sm:h-8"
                />
              ))}
            </div>
          </div>

          {/* Right Side: Time Remaining + Flip boxes + Period (Dotted separator removed) */}
          <div className="pl-1 sm:pl-2 flex flex-col items-end justify-center space-y-1.5">
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-800">
              Time remaining
            </div>

            {/* Flip Digit Boxes [0][0] : [2][8] */}
            <div className="flex items-center gap-0.5 sm:gap-1 font-mono font-black text-base sm:text-2xl text-red-600">
              <div className="w-5 h-7 min-[380px]:w-6 min-[380px]:h-8 sm:w-7 sm:h-9 bg-white rounded-md flex items-center justify-center shadow-md border border-gray-200">
                {mmStr[0]}
              </div>
              <div className="w-5 h-7 min-[380px]:w-6 min-[380px]:h-8 sm:w-7 sm:h-9 bg-white rounded-md flex items-center justify-center shadow-md border border-gray-200">
                {mmStr[1]}
              </div>
              <span className="font-bold text-gray-800 text-sm sm:text-lg px-0.5">:</span>
              <div className="w-5 h-7 min-[380px]:w-6 min-[380px]:h-8 sm:w-7 sm:h-9 bg-white rounded-md flex items-center justify-center shadow-md border border-gray-200">
                {ssStr[0]}
              </div>
              <div className="w-5 h-7 min-[380px]:w-6 min-[380px]:h-8 sm:w-7 sm:h-9 bg-white rounded-md flex items-center justify-center shadow-md border border-gray-200">
                {ssStr[1]}
              </div>
            </div>

            {/* Period Number */}
            <div className="text-[10px] sm:text-xs font-mono font-black text-gray-900 tracking-tight">
              {periodId}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
