import React, { useState } from 'react';
import { WinGoBall } from './WinGoBall';

export const WinGoBettingGrid = ({ onSelectOption, isLocked = false }) => {
  const [activeMultiplier, setActiveMultiplier] = useState('X1');

  // Convert 'X5' -> 5, 'X10' -> 10, etc.
  const getMultiplierNumber = (multStr) => {
    return parseInt(multStr.replace('X', ''), 10) || 1;
  };

  const handleRandomPick = () => {
    if (isLocked) return;
    const randomNum = Math.floor(Math.random() * 10);
    const mult = getMultiplierNumber(activeMultiplier);
    onSelectOption(
      {
        type: 'NUMBER',
        value: randomNum,
        label: String(randomNum),
      },
      mult
    );
  };

  const handleSelect = (option) => {
    if (isLocked) return;
    const mult = getMultiplierNumber(activeMultiplier);
    onSelectOption(option, mult);
  };

  return (
    <div className="bg-[#17132c] border border-purple-950/70 rounded-3xl p-3.5 sm:p-5 space-y-4 shadow-2xl relative select-none">
      
      {/* ── 1. COLOR BUTTONS (GREEN, VIOLET, RED) ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          disabled={isLocked}
          onClick={() => handleSelect({ type: 'COLOR', value: 'GREEN', label: 'Green' })}
          className="py-3 px-2 rounded-xl bg-gradient-to-r from-[#00d084] to-[#00b977] hover:brightness-110 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Green
        </button>
        <button
          disabled={isLocked}
          onClick={() => handleSelect({ type: 'COLOR', value: 'VIOLET', label: 'Violet' })}
          className="py-3 px-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#8c52ff] hover:brightness-110 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-purple-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Violet
        </button>
        <button
          disabled={isLocked}
          onClick={() => handleSelect({ type: 'COLOR', value: 'RED', label: 'Red' })}
          className="py-3 px-2 rounded-xl bg-gradient-to-r from-[#ff6b7b] to-[#ff4d61] hover:brightness-110 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-red-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Red
        </button>
      </div>

      {/* ── 2. NUMBER GRID 0–9 BALLS (EXACT MATCH TO REFERENCE IMAGE 1) ──── */}
      <div className="bg-[#120e24] p-3.5 rounded-2xl border border-purple-900/30">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 justify-items-center">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <WinGoBall
              key={num}
              num={num}
              size="lg"
              disabled={isLocked}
              onClick={() => handleSelect({ type: 'NUMBER', value: num, label: String(num) })}
            />
          ))}
        </div>
      </div>

      {/* ── 3. QUICK MULTIPLIER BAR & RANDOM PICK ─────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          disabled={isLocked}
          onClick={handleRandomPick}
          className="px-3.5 py-1.5 rounded-lg border border-red-500/50 text-red-400 font-bold text-xs hover:bg-red-500/10 active:scale-95 transition shrink-0 disabled:opacity-40"
        >
          Random
        </button>
        {['X1', 'X5', 'X10', 'X20', 'X50', 'X100'].map((mult) => {
          const isSel = activeMultiplier === mult;
          return (
            <button
              key={mult}
              onClick={() => setActiveMultiplier(mult)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition shrink-0 active:scale-95 ${
                isSel
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-300'
                  : 'bg-[#251f3e] text-gray-400 hover:text-white'
              }`}
            >
              {mult}
            </button>
          );
        })}
      </div>

      {/* ── 4. BIG & SMALL BUTTONS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={isLocked}
          onClick={() => handleSelect({ type: 'SIZE', value: 'BIG', label: 'Big' })}
          className="py-3.5 rounded-2xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:brightness-110 active:scale-95 text-white font-black text-base sm:text-lg shadow-lg shadow-amber-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Big
        </button>
        <button
          disabled={isLocked}
          onClick={() => handleSelect({ type: 'SIZE', value: 'SMALL', label: 'Small' })}
          className="py-3.5 rounded-2xl bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] hover:brightness-110 active:scale-95 text-white font-black text-base sm:text-lg shadow-lg shadow-blue-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Small
        </button>
      </div>

    </div>
  );
};
