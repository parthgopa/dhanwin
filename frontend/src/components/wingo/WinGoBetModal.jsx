import React, { useState, useEffect } from 'react';
import { Check, Minus, Plus } from 'lucide-react';

export const WinGoBetModal = ({
  isOpen,
  onClose,
  selection, // { type: 'COLOR'|'NUMBER'|'SIZE', value: 'GREEN'|..., label: 'Green', initialMultiplier: 1|5|10... }
  modeLabel = 'WinGo 30sec',
  userBalance = 0,
  onConfirmBet,
}) => {
  if (!isOpen || !selection) return null;

  const [unitAmount, setUnitAmount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [multiplier, setMultiplier] = useState(selection.initialMultiplier || 1);
  const [agreed, setAgreed] = useState(true);

  useEffect(() => {
    if (selection?.initialMultiplier) {
      setMultiplier(selection.initialMultiplier);
    } else {
      setMultiplier(1);
    }
    setUnitAmount(1);
    setQuantity(1);
  }, [selection]);

  // Theme color mapping based on selection
  const getTheme = () => {
    const val = String(selection.value).toUpperCase();
    if (val === 'GREEN' || ['1', '3', '7', '9'].includes(val)) {
      return {
        bg: 'bg-[#00b977]',
        text: 'text-[#00b977]',
        border: 'border-[#00b977]',
        activeBtn: 'bg-[#00b977] text-white',
        banner: '#00b977',
      };
    }
    if (val === 'RED' || ['2', '4', '6', '8'].includes(val)) {
      return {
        bg: 'bg-[#ff4d61]',
        text: 'text-[#ff4d61]',
        border: 'border-[#ff4d61]',
        activeBtn: 'bg-[#ff4d61] text-white',
        banner: '#ff4d61',
      };
    }
    if (val === 'VIOLET' || val === '0' || val === '5') {
      return {
        bg: 'bg-[#8c52ff]',
        text: 'text-[#8c52ff]',
        border: 'border-[#8c52ff]',
        activeBtn: 'bg-[#8c52ff] text-white',
        banner: '#8c52ff',
      };
    }
    if (val === 'BIG') {
      return {
        bg: 'bg-[#f59e0b]',
        text: 'text-[#f59e0b]',
        border: 'border-[#f59e0b]',
        activeBtn: 'bg-[#f59e0b] text-white',
        banner: '#f59e0b',
      };
    }
    if (val === 'SMALL') {
      return {
        bg: 'bg-[#5da8ff]',
        text: 'text-[#5da8ff]',
        border: 'border-[#5da8ff]',
        activeBtn: 'bg-[#5da8ff] text-white',
        banner: '#5da8ff',
      };
    }
    return {
      bg: 'bg-[#00b977]',
      text: 'text-[#00b977]',
      border: 'border-[#00b977]',
      activeBtn: 'bg-[#00b977] text-white',
      banner: '#00b977',
    };
  };

  const theme = getTheme();
  const safeQty = Number(quantity) || 1;
  const totalAmount = unitAmount * safeQty * multiplier;

  const handleConfirm = () => {
    if (!agreed) return;
    onConfirmBet({
      selectType: selection.type,
      selectValue: selection.value,
      unitPrice: unitAmount,
      multiplier: safeQty * multiplier,
      totalAmount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#1e1938] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl z-10 border border-purple-900/30">
        
        {/* Trapezoid Header Banner */}
        <div
          className="relative px-6 pt-5 pb-6 text-center text-white"
          style={{
            backgroundColor: theme.banner,
            clipPath: 'polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)',
          }}
        >
          <div className="text-sm font-bold opacity-90">{modeLabel}</div>
          <div className="inline-block mt-2 px-6 py-1.5 bg-white text-gray-900 font-extrabold rounded-md shadow-md text-sm sm:text-base tracking-wide">
            Select {selection.label || selection.value}
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-5 pt-3 pb-4 space-y-4 text-white">
          
          {/* Amount Chips */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-200">Amount</span>
            <div className="flex gap-2">
              {[1, 10, 100, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setUnitAmount(amt)}
                  className={`w-14 py-1.5 rounded-lg text-xs font-black transition-all ${
                    unitAmount === amt
                      ? theme.activeBtn + ' shadow-lg scale-105'
                      : 'bg-[#2a244d] text-gray-300 hover:bg-[#342e5c]'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-200">Quantity</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, (Number(quantity) || 1) - 1))}
                className="w-9 h-8 rounded-lg bg-[#2a244d] hover:bg-[#342e5c] text-white flex items-center justify-center font-black transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity('');
                  } else {
                    const clean = val.replace(/[^0-9]/g, '');
                    setQuantity(clean === '' ? '' : Number(clean));
                  }
                }}
                onBlur={() => {
                  if (!quantity || Number(quantity) < 1) {
                    setQuantity(1);
                  }
                }}
                className="w-16 h-8 bg-[#151226] border border-purple-900/40 rounded-lg text-center font-mono font-bold text-white text-sm outline-none"
              />
              <button
                onClick={() => setQuantity((Number(quantity) || 1) + 1)}
                className="w-9 h-8 rounded-lg bg-[#2a244d] hover:bg-[#342e5c] text-white flex items-center justify-center font-black transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Multiplier Quick Pills */}
          <div className="flex justify-end gap-1.5 overflow-x-auto no-scrollbar">
            {[1, 5, 10, 20, 50, 100].map((mult) => (
              <button
                key={mult}
                onClick={() => setMultiplier(mult)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  multiplier === mult
                    ? theme.activeBtn + ' shadow-md'
                    : 'bg-[#2a244d] text-gray-400 hover:text-white'
                }`}
              >
                X{mult}
              </button>
            ))}
          </div>

          {/* Presale Rules Agreement */}
          <div className="flex items-center gap-2 pt-1 text-xs">
            <button
              onClick={() => setAgreed(!agreed)}
              className={`w-4 h-4 rounded flex items-center justify-center transition ${
                agreed ? 'bg-amber-400 text-black font-bold' : 'bg-gray-700'
              }`}
            >
              {agreed && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span className="text-gray-300">
              I agree <span className="text-red-400 font-semibold cursor-pointer hover:underline">Presale Rules</span>
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-3 border-t border-purple-900/30">
          <button
            onClick={onClose}
            className="col-span-1 py-3.5 bg-[#251f3e] hover:bg-[#2e274d] text-gray-300 font-bold text-sm transition text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!agreed || totalAmount > userBalance}
            className={`col-span-2 py-3.5 font-black text-sm tracking-wide text-white transition flex items-center justify-center gap-1 shadow-xl ${
              agreed && totalAmount <= userBalance
                ? theme.bg + ' hover:brightness-110 active:scale-[0.99]'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {totalAmount > userBalance ? (
              <span>Insufficient Balance (₹{userBalance.toFixed(2)})</span>
            ) : (
              <span>Total Amount ₹{totalAmount.toFixed(2)}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
