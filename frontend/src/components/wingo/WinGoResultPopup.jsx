import React from 'react';
import { Sparkles, Trophy } from 'lucide-react';

export const WinGoResultPopup = ({ result, onClose }) => {
  if (!result) return null;

  const getBallStyle = (num) => {
    const n = Number(num);
    if (n === 0) return 'from-red-500 via-purple-500 to-purple-600 border-red-300';
    if (n === 5) return 'from-emerald-500 via-purple-500 to-purple-600 border-emerald-300';
    if ([2, 4, 6, 8].includes(n)) return 'from-red-500 to-red-600 border-red-300';
    return 'from-emerald-500 to-emerald-600 border-emerald-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none pointer-events-none">
      <div className="relative w-full max-w-xs bg-gradient-to-b from-[#241a4a] to-[#120e24] border-2 border-amber-400/60 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-scaleBounce">
        
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Winning Draw</span>
          </div>

          <div className="text-xs text-gray-300 font-mono font-bold">
            Period: {result.periodId}
          </div>

          {/* Big Center Ball */}
          <div className="flex justify-center my-2">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getBallStyle(result.winningNumber)} border-4 flex items-center justify-center text-white font-mono font-black text-4xl shadow-2xl drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]`}>
              {result.winningNumber}
            </div>
          </div>

          {/* Color & Size Badges */}
          <div className="flex items-center justify-center gap-2 pt-1 font-bold text-xs">
            <span className={`px-3 py-1 rounded-full text-white font-black shadow ${
              result.winningColor.includes('GREEN') ? 'bg-emerald-600' :
              result.winningColor.includes('RED') ? 'bg-red-600' :
              'bg-purple-600'
            }`}>
              {result.winningColor}
            </span>
            <span className={`px-3 py-1 rounded-full font-black shadow ${
              result.winningSize === 'BIG' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
            }`}>
              {result.winningSize}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
