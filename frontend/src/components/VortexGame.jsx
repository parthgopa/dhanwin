import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Info,
  History,
  Settings,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  Coins,
  Minus,
  Plus,
  RotateCcw,
  X,
  ShieldCheck,
  Award,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

// ── MULTIPLIERS DEFINITIONS ───────────────────────────────────────────────────
const FIRE_SECTORS = [
  { label: '3.9X', mult: 3.9 },
  { label: '12.5X', mult: 12.5 },
  { label: '28X', mult: 28 },
  { label: '52X', mult: 52 },
  { label: '85X', mult: 85 },
  { label: '133X', mult: 133 },
  { label: '200X', mult: 200 },
  { label: 'BONUS ⓘ', mult: 'BONUS' },
];

const EARTH_SECTORS = [
  { label: '2.5X', mult: 2.5 },
  { label: '7.7X', mult: 7.7 },
  { label: '16X', mult: 16 },
  { label: '27.5X', mult: 27.5 },
  { label: '44X', mult: 44 },
  { label: '+20.5X', mult: 20.5, isFreeCashout: true },
];

const WATER_SECTORS = [
  { label: '1.55X', mult: 1.55 },
  { label: '4.85X', mult: 4.85 },
  { label: '10X', mult: 10 },
  { label: '+7X', mult: 7.0, isFreeCashout: true },
];

const PRESET_BETS = [5, 8, 10, 20, 50, 100, 200, 500, 1000, 5000, 10000];

export const VortexGame = ({ onBack, onOpenDeposit, onOpenAuth }) => {
  const { user, updateBalance, showToast } = useAuth();

  // Board State
  const [betAmount, setBetAmount] = useState(5);
  const [fireSegments, setFireSegments] = useState(0); // 0 to 8
  const [earthSegments, setEarthSegments] = useState(0); // 0 to 6
  const [waterSegments, setWaterSegments] = useState(0); // 0 to 4
  const [fireMult, setFireMult] = useState(0);
  const [earthMult, setEarthMult] = useState(0);
  const [waterMult, setWaterMult] = useState(0);
  const [totalMultiplier, setTotalMultiplier] = useState(0);
  const [currentPayout, setCurrentPayout] = useState(0);
  const [partPayoutAvailable, setPartPayoutAvailable] = useState(false);
  const [partPayoutDelta, setPartPayoutDelta] = useState(0);
  const [partPayoutAmount, setPartPayoutAmount] = useState(0);

  // Gameplay & Animation States
  const [isSpinning, setIsSpinning] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSymbol, setLastSymbol] = useState(null); // 'FIRE' | 'EARTH' | 'WATER' | 'WIND' | 'SKULL'
  const [symbolBurst, setSymbolBurst] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // Modals
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusWheelDeg, setBonusWheelDeg] = useState(0);
  const [bonusResultData, setBonusResultData] = useState(null);
  const [freeCashoutBanner, setFreeCashoutBanner] = useState(null);

  const socketRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;

  // Board clear condition (Allows changing bet only when board is completely clear)
  const isBoardClear = fireSegments === 0 && earthSegments === 0 && waterSegments === 0;

  // Audio synthesis helper for rich arcade SFX
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'spin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'fire') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'earth') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'skull') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // Audio context fallback
    }
  };

  // ── SOCKET CONNECTION & LISTENERS ───────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Initialize session
    socket.emit('vortex:init', { userId: user?._id || user?.id });

    socket.on('vortex:session_state', (data) => {
      setBetAmount(data.betAmount || 5);
      setFireSegments(data.fireSegments || 0);
      setEarthSegments(data.earthSegments || 0);
      setWaterSegments(data.waterSegments || 0);
      setFireMult(data.fireMult || 0);
      setEarthMult(data.earthMult || 0);
      setWaterMult(data.waterMult || 0);
      setTotalMultiplier(data.totalMultiplier || 0);
      setCurrentPayout(data.currentPayout || 0);
      setPartPayoutAvailable(data.partPayoutAvailable || false);
      setPartPayoutDelta(data.partPayoutDelta || 0);
      setPartPayoutAmount(Number(((data.partPayoutDelta || 0) * (data.betAmount || 5)).toFixed(2)));
    });

    socket.on('vortex:spin_result', (data) => {
      setLastSymbol(data.symbol);
      setSymbolBurst(true);
      setTimeout(() => setSymbolBurst(false), 700);

      // Play Sound FX
      if (data.symbol === 'FIRE') playSound('fire');
      else if (data.symbol === 'EARTH') playSound('earth');
      else if (data.symbol === 'WATER') playSound('water');
      else if (data.symbol === 'SKULL') {
        playSound('skull');
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 400);
      }

      // Update state
      setFireSegments(data.fireSegments);
      setEarthSegments(data.earthSegments);
      setWaterSegments(data.waterSegments);
      setFireMult(data.fireMult);
      setEarthMult(data.earthMult);
      setWaterMult(data.waterMult);
      setTotalMultiplier(data.totalMultiplier);
      setCurrentPayout(data.currentPayout);
      setPartPayoutAvailable(data.partPayoutAvailable);
      setPartPayoutDelta(data.partPayoutDelta);
      setPartPayoutAmount(data.partPayoutAmount);
      setBetAmount(data.betAmount);

      if (data.newBalance !== undefined && updateBalance) {
        updateBalance(data.newBalance);
      }

      // Free Cashout Triggers
      if (data.eventType === 'EARTH_FREE_CASHOUT') {
        playSound('win');
        setFreeCashoutBanner({ text: 'EARTH COMPLETED!', win: `+₹${data.instantWinAmount} (20.5X Free Cashout)` });
        setTimeout(() => setFreeCashoutBanner(null), 3000);
      } else if (data.eventType === 'WATER_FREE_CASHOUT') {
        playSound('win');
        setFreeCashoutBanner({ text: 'WATER COMPLETED!', win: `+₹${data.instantWinAmount} (7.0X Free Cashout)` });
        setTimeout(() => setFreeCashoutBanner(null), 3000);
      } else if (data.eventType === 'BONUS_GAME') {
        playSound('win');
        setBonusResultData(data.bonusData);
        setIsBonusModalOpen(true);
        // Spin bonus wheel animation
        const targetDeg = 1800 + Math.floor(Math.random() * 360);
        setBonusWheelDeg(targetDeg);
      }

      setTimeout(() => {
        setIsSpinning(false);
      }, isTurbo ? 180 : 350);
    });

    socket.on('vortex:part_payout_success', (data) => {
      playSound('win');
      if (data.newBalance !== undefined && updateBalance) {
        updateBalance(data.newBalance);
      }
      showToast(`Part PayOut Collected! +₹${data.payoutAmount}`, 'success');
      setPartPayoutAvailable(false);
      setPartPayoutDelta(0);
      setPartPayoutAmount(0);
    });

    socket.on('vortex:cashout_success', (data) => {
      playSound('win');
      if (data.newBalance !== undefined && updateBalance) {
        updateBalance(data.newBalance);
      }
      showToast(`CASHED OUT! Won ₹${data.payoutAmount} (${data.cashOutMultiplier}X)`, 'success');
      setFireSegments(0);
      setEarthSegments(0);
      setWaterSegments(0);
      setFireMult(0);
      setEarthMult(0);
      setWaterMult(0);
      setTotalMultiplier(0);
      setCurrentPayout(0);
      setPartPayoutAvailable(false);
      setPartPayoutDelta(0);
      setPartPayoutAmount(0);
    });

    socket.on('vortex:error', (data) => {
      setIsSpinning(false);
      setIsHolding(false);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      showToast(data.message || 'Error occurred', 'error');
    });

    return () => {
      socket.off('vortex:session_state');
      socket.off('vortex:spin_result');
      socket.off('vortex:part_payout_success');
      socket.off('vortex:cashout_success');
      socket.off('vortex:error');
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [user?._id, isTurbo]);

  // ── TRIGGER SPIN ─────────────────────────────────────────────────────────────
  const triggerSpin = () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    if (user.walletBalance < betAmount) {
      showToast('Insufficient wallet balance. Please deposit.', 'error');
      if (onOpenDeposit) onOpenDeposit();
      return;
    }
    if (isSpinningRef.current) return;

    setIsSpinning(true);
    playSound('spin');

    socketRef.current?.emit('vortex:spin', {
      userId: user?._id || user?.id,
      betAmount,
    });
  };

  // ── HOLD TO SPIN HANDLERS ────────────────────────────────────────────────────
  const handleHoldStart = (e) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    setIsHolding(true);
    triggerSpin();

    // Auto-repeat spins every 450ms (or 250ms on turbo)
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      triggerSpin();
    }, isTurbo ? 250 : 450);
  };

  const handleHoldEnd = (e) => {
    e?.preventDefault();
    setIsHolding(false);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // ── CASHOUT HANDLERS ─────────────────────────────────────────────────────────
  const handleCashout = () => {
    if (totalMultiplier <= 0) return;
    socketRef.current?.emit('vortex:cashout', { userId: user?._id || user?.id });
  };

  const handlePartPayout = () => {
    if (!partPayoutAvailable || partPayoutDelta <= 0) return;
    socketRef.current?.emit('vortex:part_payout', { userId: user?._id || user?.id });
  };

  // ── BET ADJUSTERS ────────────────────────────────────────────────────────────
  const adjustBet = (delta) => {
    if (!isBoardClear) {
      showToast('You can only change your bet when the playfield is clear.', 'info');
      return;
    }
    const currentIndex = PRESET_BETS.indexOf(betAmount);
    let nextBet = betAmount;
    if (currentIndex !== -1) {
      const nextIndex = Math.max(0, Math.min(PRESET_BETS.length - 1, currentIndex + delta));
      nextBet = PRESET_BETS[nextIndex];
    } else {
      nextBet = Math.max(5, betAmount + (delta * 5));
    }
    setBetAmount(nextBet);
  };

  const selectPresetBet = (amount) => {
    if (!isBoardClear) {
      showToast('You can only change your bet when the playfield is clear.', 'info');
      return;
    }
    setBetAmount(amount);
    setIsBetModalOpen(false);
  };

  // ── RENDER CONCENTRIC RING SVGS ─────────────────────────────────────────────
  // Outer Ring (Fire: 8 segments, R=140 to 180)
  // Middle Ring (Earth: 6 segments, R=100 to 135)
  // Inner Ring (Water: 4 segments, R=65 to 95)
  // Center (R=0 to 60)
  const renderRingSegments = (totalSegments, activeCount, innerR, outerR, colorHex, activeColorHex, sectorsData) => {
    const segments = [];
    const angleStep = 360 / totalSegments;
    const gap = 3; // Degree gap between sectors

    for (let i = 0; i < totalSegments; i++) {
      const startAngle = i * angleStep + gap / 2 - 90;
      const endAngle = (i + 1) * angleStep - gap / 2 - 90;
      const isActive = i < activeCount;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = 200 + outerR * Math.cos(startRad);
      const y1 = 200 + outerR * Math.sin(startRad);
      const x2 = 200 + outerR * Math.cos(endRad);
      const y2 = 200 + outerR * Math.sin(endRad);
      const x3 = 200 + innerR * Math.cos(endRad);
      const y3 = 200 + innerR * Math.sin(endRad);
      const x4 = 200 + innerR * Math.cos(startRad);
      const y4 = 200 + innerR * Math.sin(startRad);

      const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;

      // Middle text point
      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      const textR = (innerR + outerR) / 2;
      const tx = 200 + textR * Math.cos(midAngle);
      const ty = 200 + textR * Math.sin(midAngle) + 4;

      segments.push(
        <g key={`seg_${outerR}_${i}`}>
          <path
            d={d}
            fill={isActive ? activeColorHex : colorHex}
            stroke={isActive ? '#ffffff' : '#232b3b'}
            strokeWidth={isActive ? '1.5' : '1'}
            className="transition-all duration-300"
            filter={isActive ? 'url(#glow)' : undefined}
          />
          <text
            x={tx}
            y={ty}
            textAnchor="middle"
            fill={isActive ? '#ffffff' : '#8899ac'}
            fontSize={outerR > 140 ? '11' : outerR > 100 ? '10' : '9'}
            fontWeight="bold"
            className="font-mono select-none pointer-events-none"
          >
            {sectorsData[i]?.label}
          </text>
        </g>
      );
    }
    return segments;
  };

  return (
    <div className={`min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-between pb-6 select-none font-sans overflow-x-hidden ${screenShake ? 'animate-bounce' : ''}`}>

      {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
      <header className="w-full max-w-lg px-4 py-3 flex items-center justify-between border-b border-[#182030] bg-[#0c1017]/80 backdrop-blur-md sticky top-0 z-30">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-[#151c28] hover:bg-[#1f2a3c] text-gray-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-lg font-black tracking-widest bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              VORTEX
            </span>
          </div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Official Game</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-[#151c28] hover:bg-[#1f2a3c] text-gray-300 hover:text-white transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="p-2 rounded-xl bg-[#151c28] hover:bg-[#1f2a3c] text-gray-300 hover:text-white transition cursor-pointer"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </header>

      {/* ── FREE CASHOUT ALERT TOAST BANNER ─────────────────────────────────── */}
      {freeCashoutBanner && (
        <div className="fixed top-16 z-40 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl shadow-emerald-500/40 border border-emerald-300 animate-pulse text-center">
          <div className="text-xs font-black tracking-wider uppercase">{freeCashoutBanner.text}</div>
          <div className="text-sm font-extrabold font-mono">{freeCashoutBanner.win}</div>
        </div>
      )}

      {/* ── MAIN INTERACTIVE DIAL (3 CONCENTRIC RINGS) ──────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-2 relative my-2">

        {/* SVG Concentric Gauge */}
        <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full drop-shadow-[0_0_35px_rgba(147,51,234,0.25)]"
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="vortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7e22ce" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>

            {/* Outer Ring: FIRE (8 Sectors) */}
            {renderRingSegments(8, fireSegments, 140, 185, '#221013', '#dc2626', FIRE_SECTORS)}

            {/* Middle Ring: EARTH (6 Sectors) */}
            {renderRingSegments(6, earthSegments, 98, 136, '#0f2416', '#16a34a', EARTH_SECTORS)}

            {/* Inner Ring: WATER (4 Sectors) */}
            {renderRingSegments(4, waterSegments, 58, 94, '#0d1e2e', '#2563eb', WATER_SECTORS)}

            {/* Center Swirling Vortex Chamber */}
            <circle cx="200" cy="200" r="54" fill="#0d111a" stroke="#4c1d95" strokeWidth="2.5" />
          </svg>

          {/* Central Animated Vortex Portal & Symbol */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden transition-transform duration-500 ${isSpinning ? 'animate-spin' : ''}`}>
              {/* Radial gradient background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-purple-700 to-indigo-950 opacity-80 animate-pulse" />
              <div className="absolute inset-1 rounded-full border-2 border-dashed border-purple-400/60 animate-spin" style={{ animationDuration: '6s' }} />

              {/* Rolled Symbol Display */}
              <div className={`relative z-10 text-center transition-all transform ${symbolBurst ? 'scale-125' : 'scale-100'}`}>
                {lastSymbol === 'FIRE' && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl animate-bounce">🔥</span>
                    <span className="text-[9px] font-black text-red-400 font-mono tracking-wider">FIRE</span>
                  </div>
                )}
                {lastSymbol === 'EARTH' && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl animate-bounce">🌿</span>
                    <span className="text-[9px] font-black text-emerald-400 font-mono tracking-wider">EARTH</span>
                  </div>
                )}
                {lastSymbol === 'WATER' && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl animate-bounce">💧</span>
                    <span className="text-[9px] font-black text-blue-400 font-mono tracking-wider">WATER</span>
                  </div>
                )}
                {lastSymbol === 'WIND' && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl animate-spin">🌪️</span>
                    <span className="text-[9px] font-black text-gray-300 font-mono tracking-wider">WIND</span>
                  </div>
                )}
                {lastSymbol === 'SKULL' && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl animate-pulse">💀</span>
                    <span className="text-[9px] font-black text-amber-400 font-mono tracking-wider">SKULL -1</span>
                  </div>
                )}
                {!lastSymbol && (
                  <div className="w-10 h-10 rounded-full border-2 border-purple-400/50 flex items-center justify-center">
                    <span className="text-lg">🌀</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Active Multiplier HUD */}
        <div className="mt-1 flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-mono font-bold flex items-center gap-1">
            <span>🔥</span>
            <span>{fireMult > 0 ? `${fireMult}X` : '0X'}</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
            <span>🌿</span>
            <span>{earthMult > 0 ? `${earthMult}X` : '0X'}</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-400 text-xs font-mono font-bold flex items-center gap-1">
            <span>💧</span>
            <span>{waterMult > 0 ? `${waterMult}X` : '0X'}</span>
          </div>
        </div>
      </main>

      {/* ── CONTROLS DECK (BOTTOM DOCK) ─────────────────────────────────────── */}
      <footer className="w-full max-w-lg px-4 space-y-3">

        {/* Bet Selector Bar */}
        <div className="flex items-center justify-between bg-[#0e131d] border border-[#212b3e] rounded-2xl p-2 px-3 shadow-lg">
          {/* Bet Chips Modal Button */}
          <button
            onClick={() => isBoardClear && setIsBetModalOpen(true)}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${isBoardClear
                ? 'bg-[#182030] hover:bg-[#232f46] border-purple-500/40 text-purple-300'
                : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            title="Open Bet Presets"
          >
            <Coins className="w-4 h-4" />
          </button>

          {/* Minus Button */}
          <button
            onClick={() => adjustBet(-1)}
            disabled={!isBoardClear || betAmount <= 5}
            className="p-2 rounded-xl bg-[#151c28] hover:bg-[#1f2a3c] text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Bet Amount Display */}
          <div className="text-center font-mono">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Bet Amount</span>
            <span className="text-base font-black text-white">{betAmount.toFixed(2)} INR</span>
          </div>

          {/* Plus Button */}
          <button
            onClick={() => adjustBet(1)}
            disabled={!isBoardClear}
            className="p-2 rounded-xl bg-[#151c28] hover:bg-[#1f2a3c] text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Turbo Toggle */}
          <button
            onClick={() => setIsTurbo(!isTurbo)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${isTurbo
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#151c28] border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            title="Toggle Turbo Mode"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons: CASH OUT • HOLD TO SPIN • PART PAYOUT */}
        <div className="grid grid-cols-3 gap-2.5 items-center">

          {/* CASH OUT BUTTON */}
          <button
            onClick={handleCashout}
            disabled={totalMultiplier <= 0}
            className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center border transition shadow-xl cursor-pointer ${totalMultiplier > 0
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-400 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
                : 'bg-[#121620] border-[#1e2638] text-gray-600 opacity-60 cursor-not-allowed'
              }`}
          >
            <span>CASH OUT</span>
            <span className="font-mono text-[11px] font-bold">
              {currentPayout > 0 ? `₹${currentPayout.toFixed(2)}` : '-'}
            </span>
          </button>

          {/* HOLD TO SPIN BUTTON (CENTER VORTEX SPINNER) */}
          <div className="flex justify-center">
            <button
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              disabled={isSpinning && !isHolding}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 flex flex-col items-center justify-center transition-all transform active:scale-90 shadow-2xl cursor-pointer select-none ${isHolding || isSpinning
                  ? 'bg-gradient-to-tr from-purple-700 via-pink-600 to-purple-800 border-pink-400 text-white shadow-purple-500/60 scale-105 animate-pulse'
                  : 'bg-gradient-to-tr from-[#3b0764] via-[#581c87] to-[#1e1b4b] border-purple-500/60 text-purple-200 hover:border-purple-400 shadow-purple-900/40 hover:scale-105'
                }`}
            >
              <span className="text-xl">🌀</span>
              <span className="text-[9px] font-black tracking-tighter uppercase mt-0.5 leading-tight">
                {isHolding ? 'SPINNING...' : 'HOLD TO SPIN'}
              </span>
            </button>
          </div>

          {/* PART PAYOUT BUTTON */}
          <button
            onClick={handlePartPayout}
            disabled={!partPayoutAvailable || partPayoutDelta <= 0}
            className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center border transition shadow-xl cursor-pointer ${partPayoutAvailable && partPayoutDelta > 0
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 border-cyan-400 text-white hover:scale-105 active:scale-95 shadow-cyan-500/20'
                : 'bg-[#121620] border-[#1e2638] text-gray-600 opacity-60 cursor-not-allowed'
              }`}
          >
            <span>PART PAYOUT</span>
            <span className="font-mono text-[11px] font-bold">
              {partPayoutAmount > 0 ? `+₹${partPayoutAmount.toFixed(2)}` : '-'}
            </span>
          </button>
        </div>

        {/* Footer Real-Time Summary */}
        <div className="flex items-center justify-between text-xs px-2 text-gray-400 font-mono">
          <div>
            <span>Payout: </span>
            <span className="font-bold text-white">₹{currentPayout.toFixed(2)} INR</span>
          </div>
          <div>
            <span>Part PayOut: </span>
            <span className="font-bold text-cyan-400">
              {partPayoutDelta > 0 ? `+${partPayoutDelta}X (₹${partPayoutAmount.toFixed(2)})` : '-'}
            </span>
          </div>
        </div>
      </footer>

      {/* ════ MODAL 1: BET PRESETS GRID MODAL ════ */}
      {isBetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#121824] border border-[#26334a] rounded-3xl p-5 w-full max-w-xs shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <span className="font-black text-sm text-gray-200 uppercase tracking-wider">Select Bet Amount</span>
              <button
                onClick={() => setIsBetModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono font-bold text-sm">
              {PRESET_BETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => selectPresetBet(preset)}
                  className={`py-3 rounded-2xl border transition cursor-pointer ${betAmount === preset
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
                      : 'bg-[#182030] border-[#222d42] text-gray-300 hover:border-gray-500'
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL 2: RULES & PAYTABLE MODAL ════ */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101520] border border-[#26334a] rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-gray-300">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>VORTEX RULES & PAYTABLE</span>
              </h3>
              <button
                onClick={() => setIsRulesModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 text-xs pr-1 leading-relaxed custom-scrollbar">
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl text-purple-200">
                <strong>Experience the power of nature in Vortex!</strong> Harness the forces of Fire, Earth, and Water to reach new heights!
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-amber-400 text-sm">Paytable & Symbols</h4>

                {/* Fire */}
                <div className="p-3 bg-[#171b26] rounded-xl border border-red-500/30 space-y-1">
                  <div className="font-bold text-red-400 flex items-center gap-1.5">
                    <span>🔥 Fire Symbol (Outer Ring)</span>
                  </div>
                  <p>Multipliers: x3.9, x12.5, x28, x52, x85, x133, x200, BONUS.</p>
                  <p className="text-gray-400 text-[11px]">Fill all 8 red sectors to trigger the BONUS GAME with ×100 to ×500 prizes + ×200 sum credited immediately!</p>
                </div>

                {/* Earth */}
                <div className="p-3 bg-[#171b26] rounded-xl border border-emerald-500/30 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🌿 Earth Symbol (Middle Ring)</span>
                  </div>
                  <p>Multipliers: x2.5, x7.7, x16, x27.5, x44, +x20.5 Free Cashout.</p>
                  <p className="text-gray-400 text-[11px]">Fill all 6 green sectors and instantly receive 20.5x payout, then move 1 step back to x44.</p>
                </div>

                {/* Water */}
                <div className="p-3 bg-[#171b26] rounded-xl border border-blue-500/30 space-y-1">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <span>💧 Water Symbol (Inner Ring)</span>
                  </div>
                  <p>Multipliers: x1.55, x4.85, x10, +x7.0 Free Cashout.</p>
                  <p className="text-gray-400 text-[11px]">Fill all 4 blue sectors and instantly receive 7.0x payout, then move 1 step back to x10.</p>
                </div>

                {/* Wind & Skull */}
                <div className="p-3 bg-[#171b26] rounded-xl border border-gray-700 space-y-1.5">
                  <p><strong>🌪️ Wind Symbol:</strong> Neutral. Bet is consumed, but all rings stay intact.</p>
                  <p><strong>💀 Skull Symbol:</strong> Danger! Pushes all rings back by 1 segment.</p>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-400">Part PayOut Strategy</h4>
                <p>Available when at least 2 sectors are filled in any circle. Receive the difference between the last and penultimate segments without clearing your board!</p>
              </div>

              <div className="space-y-1 border-t border-gray-800 pt-2 text-[11px] text-gray-400">
                <p><strong>RTP:</strong> 93.56% – 97.16% statistical average with Provably Fair cryptographic hash generation.</p>
                <p><strong>Disconnection Policy:</strong> Active game progress is preserved securely on server during network reconnects.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL 3: BONUS GAME WHEEL CELEBRATION ════ */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fadeIn">
          <div className="bg-gradient-to-b from-purple-950 via-[#130d24] to-black border-2 border-yellow-400 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
            <div className="text-3xl animate-bounce">🌟 🎰 🌟</div>
            <h3 className="text-2xl font-black text-yellow-400 tracking-wider font-mono">
              VORTEX BONUS GAME!
            </h3>
            <p className="text-xs text-gray-300">
              Fire Ring Completed! You won the grand bonus prize + 200x Fire Sum!
            </p>

            <div className="p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-2xl font-mono space-y-1">
              <span className="text-xs text-yellow-300 uppercase tracking-widest block">Multiplier Won</span>
              <span className="text-3xl font-black text-yellow-400">
                +{bonusResultData?.bonusMultiplierWon || 200}X BONUS
              </span>
              <span className="text-xs text-emerald-400 block font-bold">
                Total Payout: +₹{(bonusResultData?.instantWinAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <button
              onClick={() => setIsBonusModalOpen(false)}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black py-3 rounded-2xl text-sm transition transform hover:scale-105 cursor-pointer shadow-xl shadow-yellow-500/30"
            >
              Collect & Continue Playing
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
