import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Flame, ShieldCheck, Plus, Minus, X, History, Lock, Wifi } from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

// ─── SVG ray sprite drawn once ─────────────────────────────────────────────
const RAY_COUNT = 20;
const RAY_SVG = (() => {
  const rays = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * 360;
    rays.push(`<line x1="500" y1="500" x2="${500 + 600 * Math.cos((angle * Math.PI) / 180)}" y2="${500 + 600 * Math.sin((angle * Math.PI) / 180)}" stroke="rgba(220,38,38,0.07)" stroke-width="40"/>`);
  }
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'>${rays.join('')}</svg>`;
})();

export const AviatorGame = ({ onOpenDeposit, onOpenAuth }) => {
  const { user, updateBalance, showToast } = useAuth();

  // Loading screen
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectProgress, setConnectProgress] = useState(0);
  const [connectStatusText, setConnectStatusText] = useState('Initializing Secure Session...');

  // Game state
  const [gameState, setGameState] = useState('BETTING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(5);
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [serverSeed, setServerSeed] = useState('');
  const [history, setHistory] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Left panel
  const [simulatedBets, setSimulatedBets] = useState([]);
  const [totalWinINR, setTotalWinINR] = useState(0);
  const [activeBetsCount, setActiveBetsCount] = useState(0);
  const [totalBetsCount, setTotalBetsCount] = useState(0);
  const [leftPanelTab, setLeftPanelTab] = useState('ALL');

  // ── Minimum bet enforcement ──────────────────────────────────────────
  const MIN_BET = 10;
  const MAX_BET = 8000;

  // Bet Box 1
  const [panel1Tab, setPanel1Tab] = useState('BET');
  const [bet1Amount, setBet1Amount] = useState(10);
  const [autoBet1Enabled, setAutoBet1Enabled] = useState(false);
  const [autoCashOut1Enabled, setAutoCashOut1Enabled] = useState(false);
  const [autoCashOut1Mult, setAutoCashOut1Mult] = useState(2.00);
  const [hasBet1, setHasBet1] = useState(false);
  const [isCashedOut1, setIsCashedOut1] = useState(false);
  const [cashoutDetails1, setCashoutDetails1] = useState(null);
  // Queued bet state — bet placed while round is RUNNING, fires on next round
  const [isQueued1, setIsQueued1] = useState(false);
  const [queuedAmount1, setQueuedAmount1] = useState(0);

  // Bet Box 2
  const [panel2Tab, setPanel2Tab] = useState('BET');
  const [bet2Amount, setBet2Amount] = useState(10);
  const [autoBet2Enabled, setAutoBet2Enabled] = useState(false);
  const [autoCashOut2Enabled, setAutoCashOut2Enabled] = useState(false);
  const [autoCashOut2Mult, setAutoCashOut2Mult] = useState(2.00);
  const [hasBet2, setHasBet2] = useState(false);
  const [isCashedOut2, setIsCashedOut2] = useState(false);
  const [cashoutDetails2, setCashoutDetails2] = useState(null);
  const [isQueued2, setIsQueued2] = useState(false);
  const [queuedAmount2, setQueuedAmount2] = useState(0);

  // New-round full-overlay popup (Task 3)


  // ── Bug 3: Bet-placed toast state ──────────────────────────────────────
  const [betToast, setBetToast] = useState(null); // { panel, amount }
  const [betToastHiding, setBetToastHiding] = useState(false);
  const betToastTimerRef = useRef(null);

  const showBetToast = useCallback((panel, amount) => {
    if (betToastTimerRef.current) clearTimeout(betToastTimerRef.current);
    setBetToastHiding(false);
    setBetToast({ panel, amount });
    betToastTimerRef.current = setTimeout(() => {
      setBetToastHiding(true);
      setTimeout(() => setBetToast(null), 320);
    }, 2200);
  }, []);

  // Refs (stale closure prevention)
  const socketRef = useRef(null);
  const hasBet1Ref = useRef(false);
  const hasBet2Ref = useRef(false);
  const isQueued1Ref = useRef(false);
  const isQueued2Ref = useRef(false);
  const queuedAmount1Ref = useRef(0);
  const queuedAmount2Ref = useRef(0);
  const autoBet1EnabledRef = useRef(false);
  const autoBet2EnabledRef = useRef(false);
  const autoCashOut1EnabledRef = useRef(false);
  const autoCashOut2EnabledRef = useRef(false);
  const autoCashOut1MultRef = useRef(2.00);
  const autoCashOut2MultRef = useRef(2.00);
  const bet1AmountRef = useRef(10);
  const bet2AmountRef = useRef(10);
  const startTimeRef = useRef(Date.now());
  const canvasRef = useRef(null);

  useEffect(() => { autoBet1EnabledRef.current = autoBet1Enabled; }, [autoBet1Enabled]);
  useEffect(() => { autoBet2EnabledRef.current = autoBet2Enabled; }, [autoBet2Enabled]);
  useEffect(() => { autoCashOut1EnabledRef.current = autoCashOut1Enabled; }, [autoCashOut1Enabled]);
  useEffect(() => { autoCashOut2EnabledRef.current = autoCashOut2Enabled; }, [autoCashOut2Enabled]);
  useEffect(() => { autoCashOut1MultRef.current = autoCashOut1Mult; }, [autoCashOut1Mult]);
  useEffect(() => { autoCashOut2MultRef.current = autoCashOut2Mult; }, [autoCashOut2Mult]);
  useEffect(() => { bet1AmountRef.current = bet1Amount; }, [bet1Amount]);
  useEffect(() => { bet2AmountRef.current = bet2Amount; }, [bet2Amount]);
  // Sync queue refs
  useEffect(() => { isQueued1Ref.current = isQueued1; }, [isQueued1]);
  useEffect(() => { isQueued2Ref.current = isQueued2; }, [isQueued2]);
  useEffect(() => { queuedAmount1Ref.current = queuedAmount1; }, [queuedAmount1]);
  useEffect(() => { queuedAmount2Ref.current = queuedAmount2; }, [queuedAmount2]);

  // ── Loading screen sequence ─────────────────────────────────────────────
  useEffect(() => {
    let step = 0;
    const t = setInterval(() => {
      step += 25;
      setConnectProgress(step);
      if (step === 25) setConnectStatusText('Verifying HMAC-SHA256 Seeds...');
      else if (step === 50) setConnectStatusText('Connecting to WebSocket Engine...');
      else if (step === 75) setConnectStatusText('Synchronizing Live Multiplier Pool...');
      else if (step >= 100) { clearInterval(t); setIsConnecting(false); }
    }, 450);
    return () => clearInterval(t);
  }, []);

  // ── WebSocket listener setup ────────────────────────────────────────────
  useEffect(() => {
    if (isConnecting) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('aviator:state_sync', (data) => {
      setGameState(data.status);
      setServerSeedHash(data.serverSeedHash);
      setMultiplier(data.currentMultiplier || 1.00);
      setCountdown(data.countdownSec || 5);
      if (data.history) setHistory(data.history);
      if (data.simulatedBets) setSimulatedBets(data.simulatedBets);
      if (data.totalWinINR !== undefined) setTotalWinINR(data.totalWinINR);
      if (data.activeBetsCount) setActiveBetsCount(data.activeBetsCount);
      if (data.totalBetsCount) setTotalBetsCount(data.totalBetsCount);
    });

    socket.on('aviator:round_preparing', (data) => {
      setGameState('BETTING');
      setServerSeedHash(data.serverSeedHash);
      setCountdown(data.countdownSec || 5);
      setMultiplier(1.00);
      setServerSeed('');
      hasBet1Ref.current = false;
      hasBet2Ref.current = false;
      setHasBet1(false);
      setHasBet2(false);
      setIsCashedOut1(false);
      setIsCashedOut2(false);
      setCashoutDetails1(null);
      setCashoutDetails2(null);
      if (data.simulatedBets) setSimulatedBets(data.simulatedBets);
      if (data.activeBetsCount !== undefined) setActiveBetsCount(data.activeBetsCount);
      if (data.totalBetsCount !== undefined) setTotalBetsCount(data.totalBetsCount);

      if (user) {
        // Auto-fire queued bets first
        if (isQueued1Ref.current) {
          hasBet1Ref.current = true;
          setHasBet1(true);
          socket.emit('aviator:place_bet', { amount: queuedAmount1Ref.current, autoCashOut: autoCashOut1EnabledRef.current ? Number(autoCashOut1MultRef.current) : null });
          isQueued1Ref.current = false;
          setIsQueued1(false);
          setQueuedAmount1(0);
        } else if (autoBet1EnabledRef.current) {
          hasBet1Ref.current = true;
          setHasBet1(true);
          socket.emit('aviator:place_bet', { amount: bet1AmountRef.current, autoCashOut: autoCashOut1EnabledRef.current ? Number(autoCashOut1MultRef.current) : null });
        }
        if (isQueued2Ref.current) {
          hasBet2Ref.current = true;
          setHasBet2(true);
          socket.emit('aviator:place_bet', { amount: queuedAmount2Ref.current, autoCashOut: autoCashOut2EnabledRef.current ? Number(autoCashOut2MultRef.current) : null });
          isQueued2Ref.current = false;
          setIsQueued2(false);
          setQueuedAmount2(0);
        } else if (autoBet2EnabledRef.current) {
          hasBet2Ref.current = true;
          setHasBet2(true);
          socket.emit('aviator:place_bet', { amount: bet2AmountRef.current, autoCashOut: autoCashOut2EnabledRef.current ? Number(autoCashOut2MultRef.current) : null });
        }
      }
    });

    socket.on('aviator:countdown_tick', (data) => setCountdown(data.countdownSec));

    socket.on('aviator:round_started', () => {
      setGameState('RUNNING');
      startTimeRef.current = Date.now();

    });

    socket.on('aviator:tick', (data) => {
      const cur = data.multiplier;
      setMultiplier(cur);
      if (hasBet1Ref.current && autoCashOut1EnabledRef.current && cur >= Number(autoCashOut1MultRef.current)) {
        hasBet1Ref.current = false;
        socket.emit('aviator:cashout');
      }
      if (hasBet2Ref.current && autoCashOut2EnabledRef.current && cur >= Number(autoCashOut2MultRef.current)) {
        hasBet2Ref.current = false;
        socket.emit('aviator:cashout');
      }
    });

    socket.on('aviator:bet_success', (data) => {
      // Determine which panel placed the bet by checking refs
      const panel = !hasBet2Ref.current ? 1 : 2;
      hasBet1Ref.current = true;
      setHasBet1(true);
      showBetToast(panel, bet1AmountRef.current);
    });

    socket.on('aviator:cashout_success', (data) => {
      setIsCashedOut1(true);
      setCashoutDetails1(data);
      updateBalance(data.newBalance);
      showToast(`Cashed out at ${data.cashOutMultiplier}x! Won ₹${data.payoutAmount}`, 'success');
    });

    socket.on('aviator:player_cashed_out', (data) => {
      if (data.totalWinINR !== undefined) setTotalWinINR(data.totalWinINR);
      if (data.simulatedBets) setSimulatedBets(data.simulatedBets);
      // Server-authoritative counts — decrement happens on server, we just mirror it
      if (data.activeBetsCount !== undefined) setActiveBetsCount(data.activeBetsCount);
      if (data.totalBetsCount !== undefined) setTotalBetsCount(data.totalBetsCount);
    });

    // Also handle bets_update (when a real user joins a round)
    socket.on('aviator:bets_update', (data) => {
      if (data.activeBetsCount !== undefined) setActiveBetsCount(data.activeBetsCount);
      if (data.totalBetsCount !== undefined) setTotalBetsCount(data.totalBetsCount);
    });

    socket.on('aviator:crashed', (data) => {
      setGameState('CRASHED');
      setMultiplier(data.crashPoint);
      setServerSeed(data.serverSeed);
      if (data.history) setHistory(data.history);
      hasBet1Ref.current = false;
      hasBet2Ref.current = false;
    });

    socket.on('aviator:error', (data) => showToast(data.message, 'error'));

    return () => {
      ['aviator:state_sync', 'aviator:round_preparing', 'aviator:countdown_tick',
        'aviator:round_started', 'aviator:tick', 'aviator:bet_success',
        'aviator:cashout_success', 'aviator:player_cashed_out', 'aviator:crashed',
        'aviator:bets_update', 'aviator:error'].forEach(ev => socket.off(ev));
      socket.disconnect();

    };
  }, [isConnecting]);

  // ── Canvas rendering ────────────────────────────────────────────────────
  useEffect(() => {
    if (isConnecting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const W = canvas.width;
    const H = canvas.height;

    // Bob offset for the plane (driven independently of game multiplier for smooth physics)
    let bobT = 0;

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      if (gameState === 'RUNNING' || gameState === 'CRASHED') {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        const visualProgress = gameState === 'CRASHED'
          ? Math.min((multiplier - 1) / 5, 1)
          : Math.min(1 - Math.exp(-0.35 * elapsedSec), 0.92);

        const startX = 30;
        const startY = H - 30;
        const endX = startX + visualProgress * (W - 120);
        const baseEndY = startY - Math.pow(visualProgress, 0.7) * (H - 80);

        // Plane bob
        bobT += 0.03;
        const bobOffset = gameState === 'RUNNING' ? Math.sin(bobT) * 6 : 0;
        const endY = baseEndY + bobOffset;

        // Fill under curve
        const curveGrad = ctx.createLinearGradient(0, H, 0, endY);
        curveGrad.addColorStop(0, gameState === 'CRASHED' ? 'rgba(153,27,27,0.04)' : 'rgba(220,38,38,0.12)');
        curveGrad.addColorStop(1, gameState === 'CRASHED' ? 'rgba(153,27,27,0.25)' : 'rgba(220,38,38,0.55)');
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Curve line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
        ctx.strokeStyle = gameState === 'CRASHED' ? '#991b1b' : '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = gameState === 'CRASHED' ? 'transparent' : 'rgba(239,68,68,0.6)';
        ctx.shadowBlur = gameState === 'CRASHED' ? 0 : 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Plane
        if (gameState === 'RUNNING') {
          const dx = endX - (startX + (endX - startX) * 0.5);
          const dy = endY - startY;
          const angle = Math.atan2(dy, dx) * 0.4;

          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(angle);

          // Engine glow
          ctx.shadowColor = 'rgba(239,68,68,0.8)';
          ctx.shadowBlur = 18;

          // Body
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(24, 0);
          ctx.lineTo(-14, -7);
          ctx.lineTo(-22, -5);
          ctx.lineTo(-22, 5);
          ctx.lineTo(-14, 7);
          ctx.closePath();
          ctx.fill();

          // Wings
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(-9, -20);
          ctx.lineTo(-16, -20);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-16, 20);
          ctx.lineTo(-9, 20);
          ctx.closePath();
          ctx.fill();

          // Cockpit glass
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.ellipse(7, -2, 5, 2.5, Math.PI / 8, 0, Math.PI * 2);
          ctx.fill();

          // Engine flame
          ctx.shadowColor = 'rgba(251,191,36,1)';
          ctx.shadowBlur = 24;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(-22, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isConnecting, gameState, multiplier]);

  // ── Bet handlers ────────────────────────────────────────────────────────
  const handlePlaceBet1 = () => {
    if (!user) { onOpenAuth(); return; }
    if (bet1Amount < MIN_BET) { showToast(`Minimum bet is ₹${MIN_BET}`, 'error'); setBet1Amount(MIN_BET); return; }
    const clampedBet1 = Math.min(bet1Amount, MAX_BET);
    if (bet1Amount > MAX_BET) setBet1Amount(MAX_BET);
    if ((user?.walletBalance ?? 0) < clampedBet1) { showToast('Insufficient wallet balance', 'error'); onOpenDeposit(); return; }
    if (hasBet1 || isQueued1) return;
    if (gameState === 'RUNNING') {
      setIsQueued1(true);
      setQueuedAmount1(clampedBet1);
      showBetToast(1, clampedBet1);
      return;
    }
    hasBet1Ref.current = true;
    setHasBet1(true);
    if (socketRef.current) socketRef.current.emit('aviator:place_bet', { amount: clampedBet1, autoCashOut: autoCashOut1Enabled ? Number(autoCashOut1Mult) : null });
    showBetToast(1, clampedBet1);
  };

  const handleCancelQueue1 = () => {
    setIsQueued1(false);
    setQueuedAmount1(0);
  };

  const handleCashout1 = () => {
    hasBet1Ref.current = false;
    if (socketRef.current) socketRef.current.emit('aviator:cashout');
  };

  const handlePlaceBet2 = () => {
    if (!user) { onOpenAuth(); return; }
    if (bet2Amount < MIN_BET) { showToast(`Minimum bet is ₹${MIN_BET}`, 'error'); setBet2Amount(MIN_BET); return; }
    const clampedBet2 = Math.min(bet2Amount, MAX_BET);
    if (bet2Amount > MAX_BET) setBet2Amount(MAX_BET);
    if ((user?.walletBalance ?? 0) < clampedBet2) { showToast('Insufficient wallet balance', 'error'); onOpenDeposit(); return; }
    if (hasBet2 || isQueued2) return;
    if (gameState === 'RUNNING') {
      setIsQueued2(true);
      setQueuedAmount2(clampedBet2);
      showBetToast(2, clampedBet2);
      return;
    }
    hasBet2Ref.current = true;
    setHasBet2(true);
    if (socketRef.current) socketRef.current.emit('aviator:place_bet', { amount: clampedBet2, autoCashOut: autoCashOut2Enabled ? Number(autoCashOut2Mult) : null });
    showBetToast(2, clampedBet2);
  };

  const handleCancelQueue2 = () => {
    setIsQueued2(false);
    setQueuedAmount2(0);
  };

  const handleCashout2 = () => {
    hasBet2Ref.current = false;
    if (socketRef.current) socketRef.current.emit('aviator:cashout');
  };

  // ── Loading screen ──────────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <div className="w-full h-[calc(100vh-80px)] bg-[#151a23] border border-[#232b3b] rounded-3xl flex flex-col items-center justify-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-red-500/30 flex items-center justify-center animate-ping" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
        <div className="text-center space-y-2 max-w-sm z-10">
          <h3 className="text-xl font-black tracking-wider text-white uppercase font-sans">CONNECTING TO SECURE SERVER...</h3>
          <p className="text-xs text-amber-400 font-mono flex items-center justify-center gap-2">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>{connectStatusText}</span>
          </p>
        </div>
        <div className="w-72 space-y-2 z-10">
          <div className="w-full h-2 bg-[#0b0e14] rounded-full overflow-hidden border border-[#232b3b]">
            <div className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300 shadow-lg" style={{ width: `${connectProgress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono font-bold">
            <span>PROVABLY FAIR HANDSHAKE</span>
            <span>{connectProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Helper: determine button state for a panel ──────────────────────────
  const getPanel1ButtonState = () => {
    if (gameState === 'RUNNING' && hasBet1 && !isCashedOut1) return 'CASHOUT';
    if (isQueued1) return 'CANCEL_QUEUED'; // queued for next round
    if (gameState === 'RUNNING' && !hasBet1) return 'WAITING';
    if (hasBet1 && !isCashedOut1) return 'BET_PENDING';
    return 'BET';
  };

  const getPanel2ButtonState = () => {
    if (gameState === 'RUNNING' && hasBet2 && !isCashedOut2) return 'CASHOUT';
    if (isQueued2) return 'CANCEL_QUEUED';
    if (gameState === 'RUNNING' && !hasBet2) return 'WAITING';
    if (hasBet2 && !isCashedOut2) return 'BET_PENDING';
    return 'BET';
  };

  const renderBetButton = (panelBtn, betAmount, handleBet, handleCashout, handleCancelQueue, liveMultiplier, queuedAmt) => {
    if (!user) return (
      <button onClick={onOpenAuth} className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-sm shadow-xl transition">
        LOGIN TO BET
      </button>
    );

    if (panelBtn === 'CASHOUT') return (
      <button
        onClick={handleCashout}
        className="w-full h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-black rounded-2xl shadow-xl transition glow-green flex flex-col items-center justify-center"
      >
        <span className="text-xs uppercase tracking-widest">CASH OUT</span>
        <span className="text-xl font-mono">₹{(betAmount * liveMultiplier).toFixed(2)}</span>
      </button>
    );

    // Queued bet — shows red Cancel button matching screenshot
    if (panelBtn === 'CANCEL_QUEUED') return (
      <button
        onClick={handleCancelQueue}
        className="w-full h-20 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black rounded-2xl shadow-xl transition flex flex-col items-center justify-center gap-0.5"
      >
        <span className="text-base uppercase tracking-widest">Cancel</span>
        <span className="text-[11px] font-bold opacity-90">Waiting for next round</span>
        <span className="text-[10px] font-mono opacity-70">₹{queuedAmt?.toFixed(2)} queued</span>
      </button>
    );

    if (panelBtn === 'WAITING') return (
      <button
        disabled
        className="w-full h-20 bg-red-900/40 border border-red-700/60 text-red-400 font-black rounded-2xl text-xs shadow-xl flex flex-col items-center justify-center gap-1 cursor-not-allowed"
      >
        <span className="text-lg">🕐</span>
        <span className="uppercase tracking-wide leading-tight text-center">Waiting for<br />Next Round</span>
      </button>
    );

    if (panelBtn === 'BET_PENDING') return (
      <button
        disabled
        className="w-full h-20 bg-amber-600/30 border border-amber-500/50 text-amber-400 font-black rounded-2xl text-xs shadow-xl flex flex-col items-center justify-center gap-1 cursor-not-allowed"
      >
        <span className="text-sm uppercase tracking-widest">Bet Placed</span>
        <span className="text-xs font-mono font-normal opacity-70">₹{betAmount.toFixed(2)} — Waiting to fly…</span>
      </button>
    );

    return (
      <button
        onClick={handleBet}
        className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-2xl text-base shadow-xl transition flex flex-col items-center justify-center"
      >
        <span>Bet</span>
        <span className="text-xs font-mono font-normal">₹{betAmount.toFixed(2)}</span>
      </button>
    );
  };

  return (
    <div className="w-full space-y-2 font-sans flex flex-col relative" style={{ height: 'calc(100vh - 72px)', minHeight: 480 }}>


      {/* Bug 3: Bet Placed Toast — centered above canvas */}
      {betToast && (
        <div
          className={`fixed top-24 left-1/2 z-[999] pointer-events-none px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold
            bg-emerald-900/95 border-emerald-500/60 text-emerald-300
            ${betToastHiding ? 'bet-pop-toast hiding' : 'bet-pop-toast'}`}
          style={{ transform: 'translateX(-50%)' }}
        >
          <span className="text-xl">✅</span>
          <div className="text-left">
            <div className="text-xs text-emerald-400 uppercase tracking-widest font-black">Bet Placed!</div>
            <div className="text-white font-mono">₹{Number(betToast.amount).toFixed(2)} — Panel {betToast.panel}</div>
          </div>
        </div>
      )}

      {/* HISTORY BAR */}
      <div className="flex items-center justify-between bg-[#151a23] border border-[#232b3b] rounded-xl py-1.5 px-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold font-mono">
          {history.slice(0, 14).map((h, i) => {
            const mult = Number(h.crashPoint || h);
            const isPurple = mult >= 2.0 && mult < 10.0;
            const isMagenta = mult >= 10.0;
            return (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono shrink-0 transition ${isMagenta ? 'text-pink-400 bg-pink-500/10 border border-pink-500/30'
                  : isPurple ? 'text-purple-400 bg-purple-500/10 border border-purple-500/30'
                    : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                  }`}
              >
                {mult.toFixed(2)}x
              </span>
            );
          })}
        </div>
        <button
          onClick={() => setHistoryModalOpen(true)}
          className="p-1 px-2.5 bg-[#232b3b] hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 transition ml-2"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>50</span>
        </button>
      </div>

      {/* MAIN GRID — sidebar + canvas + bet panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-1 min-h-0">

        {/* LEFT PANEL — players feed */}
        <div className="hidden lg:flex lg:col-span-1 bg-[#151a23] border border-[#232b3b] rounded-2xl p-3 flex-col min-h-0">
          <div className="grid grid-cols-3 gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] text-center text-xs font-bold mb-2 shrink-0">
            {['ALL', 'PREVIOUS', 'TOP'].map(tab => (
              <button
                key={tab}
                onClick={() => setLeftPanelTab(tab)}
                className={`py-1 rounded-lg transition ${leftPanelTab === tab ? 'bg-[#232b3b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {tab === 'ALL' ? 'All Bets' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 border-b border-[#232b3b] pb-2 mb-2 shrink-0">
            <span className="font-bold text-white">{activeBetsCount}/{totalBetsCount} Bets</span>
            <span className="text-[10px]">Total win <strong className="text-emerald-400 font-mono">₹{Math.round(totalWinINR).toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 no-scrollbar">
            {simulatedBets.map((player, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-1.5 rounded-xl text-xs font-mono border transition ${player.status === 'CASHOUT'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-[#0b0e14] border-[#232b3b]'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{player.avatar || '👤'}</span>
                  <span className="text-gray-300 text-[11px]">{player.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-[11px]">{player.betAmount.toFixed(2)}</span>
                  {player.status === 'CASHOUT' && (
                    <>
                      <span className="text-emerald-400 font-bold px-1 bg-emerald-500/20 rounded text-[9px]">{Number(player.cashOutMultiplier).toFixed(2)}x</span>
                      <span className="text-emerald-400 font-bold text-[11px]">{player.payoutAmount.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#232b3b] text-[10px] text-gray-500 flex items-center justify-between shrink-0 mt-2">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Provably Fair</span>
            <span>Powered by SPRIBE</span>
          </div>
        </div>

        {/* RIGHT — canvas + bet panels */}
        <div className="lg:col-span-3 flex flex-col gap-2 min-h-0">

          {/* Bug 2 + Bug 4: GAME STAGE — full height, animated background */}
          <div
            className="aviator-bg border border-red-900/30 rounded-2xl relative overflow-hidden flex-1 min-h-0 shadow-2xl"
            style={{ minHeight: 220 }}
          >
            {/* Bug 4: Rotating ray background */}
            <div className="ray-container" style={{ borderRadius: 'inherit' }}>
              <div className="ray-ring" style={{ backgroundImage: `url("${RAY_SVG}")`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-10">
              <span className="text-base font-black tracking-wider text-red-500 flex items-center gap-1">
                <Flame className="w-5 h-5 fill-red-500" /> Aviator
              </span>
              <div className="text-[10px] font-mono text-gray-600">
                HASH: <span className="text-gray-500">{serverSeedHash.substring(0, 12)}…</span>
              </div>
            </div>

            {/* Canvas — fills entire stage */}
            <canvas
              ref={canvasRef}
              width={900}
              height={500}
              className="absolute inset-0 w-full h-full"
              style={{ borderRadius: 'inherit' }}
            />

            {/* Overlay: multiplier / countdown / crashed */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
              {gameState === 'BETTING' && (
                <div className="text-center space-y-2">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">NEXT ROUND IN</div>
                  <div className="text-6xl font-black text-amber-400 font-mono animate-pulse">{countdown}.0s</div>
                  <div className="w-44 h-1.5 bg-black/40 rounded-full overflow-hidden mx-auto border border-amber-900/40">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(countdown / 5) * 100}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 font-semibold">Place your bets!</div>
                </div>
              )}

              {gameState === 'RUNNING' && (
                <div className="text-center">
                  <div
                    className="font-black text-white font-mono tracking-tighter select-none"
                    style={{
                      fontSize: 'clamp(3rem, 10vw, 6rem)',
                      textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(239,68,68,0.4)',
                    }}
                  >
                    {multiplier.toFixed(2)}x
                  </div>
                  {isCashedOut1 && cashoutDetails1 && (
                    <div className="px-4 py-1 rounded-full bg-emerald-500/30 text-emerald-400 font-bold text-sm border border-emerald-500 mt-2">
                      CASHED OUT AT {cashoutDetails1.cashOutMultiplier}x (+₹{cashoutDetails1.payoutAmount})
                    </div>
                  )}
                </div>
              )}

              {gameState === 'CRASHED' && (
                <div className="text-center space-y-1">
                  <div className="text-red-500 text-xl font-black uppercase tracking-widest animate-bounce">FLEW AWAY!</div>
                  <div
                    className="font-black text-red-500 font-mono"
                    style={{ fontSize: 'clamp(3rem, 10vw, 5.5rem)' }}
                  >
                    {multiplier.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DUAL BET PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">

            {/* BET PANEL 1 */}
            <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-3 flex flex-col gap-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#232b3b] pb-2 text-xs font-bold">
                <div className="grid grid-cols-2 gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] w-28 text-center">
                  <button onClick={() => setPanel1Tab('BET')} className={`py-1 rounded-lg transition ${panel1Tab === 'BET' ? 'bg-[#232b3b] text-white' : 'text-gray-500 hover:text-white'}`}>Bet</button>
                  <button onClick={() => setPanel1Tab('AUTO')} className={`py-1 rounded-lg transition ${panel1Tab === 'AUTO' ? 'bg-[#232b3b] text-white' : 'text-gray-500 hover:text-white'}`}>Auto</button>
                </div>
                <span className="text-[10px] text-gray-600 font-mono">Panel 1</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center bg-[#0b0e14] border border-[#232b3b] rounded-xl p-1">
                    <button onClick={() => setBet1Amount(Math.max(MIN_BET, bet1Amount - 10))} className="p-1.5 text-gray-400 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                    <input type="number" value={bet1Amount} min={MIN_BET} max={MAX_BET} onChange={(e) => setBet1Amount(Math.min(MAX_BET, Math.max(MIN_BET, Number(e.target.value))))} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" />
                    <button onClick={() => setBet1Amount(Math.min(MAX_BET, bet1Amount + 10))} className="p-1.5 text-gray-400 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[100, 200, 500, 1000].map(p => (
                      <button key={p} onClick={() => setBet1Amount(Math.min(MAX_BET, p))} className="py-1 bg-[#0b0e14] border border-[#232b3b] hover:border-gray-500 rounded-lg text-[10px] font-bold text-gray-300 transition">{p}</button>
                    ))}
                  </div>
                </div>
                <div className="w-2/5">
                  {renderBetButton(getPanel1ButtonState(), bet1Amount, handlePlaceBet1, handleCashout1, handleCancelQueue1, multiplier, queuedAmount1)}
                </div>
              </div>

              {panel1Tab === 'AUTO' && (
                <div className="flex items-center justify-between pt-2 border-t border-[#232b3b] text-xs font-bold text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>Auto bet</span>
                    <button onClick={() => setAutoBet1Enabled(!autoBet1Enabled)} className={`w-9 h-5 rounded-full p-0.5 transition ${autoBet1Enabled ? 'bg-emerald-500' : 'bg-[#232b3b]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${autoBet1Enabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Auto Out</span>
                    <button onClick={() => setAutoCashOut1Enabled(!autoCashOut1Enabled)} className={`w-9 h-5 rounded-full p-0.5 transition ${autoCashOut1Enabled ? 'bg-emerald-500' : 'bg-[#232b3b]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${autoCashOut1Enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <input type="number" step="0.1" value={autoCashOut1Mult} onChange={(e) => setAutoCashOut1Mult(e.target.value)} className="w-12 bg-[#0b0e14] border border-[#232b3b] rounded-lg text-center font-mono py-0.5 text-xs text-amber-400 outline-none" />
                    <span>x</span>
                  </div>
                </div>
              )}
            </div>

            {/* BET PANEL 2 */}
            <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-3 flex flex-col gap-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#232b3b] pb-2 text-xs font-bold">
                <div className="grid grid-cols-2 gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] w-28 text-center">
                  <button onClick={() => setPanel2Tab('BET')} className={`py-1 rounded-lg transition ${panel2Tab === 'BET' ? 'bg-[#232b3b] text-white' : 'text-gray-500 hover:text-white'}`}>Bet</button>
                  <button onClick={() => setPanel2Tab('AUTO')} className={`py-1 rounded-lg transition ${panel2Tab === 'AUTO' ? 'bg-[#232b3b] text-white' : 'text-gray-500 hover:text-white'}`}>Auto</button>
                </div>
                <span className="text-[10px] text-gray-600 font-mono">Panel 2</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center bg-[#0b0e14] border border-[#232b3b] rounded-xl p-1">
                    <button onClick={() => setBet2Amount(Math.max(MIN_BET, bet2Amount - 10))} className="p-1.5 text-gray-400 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                    <input type="number" value={bet2Amount} min={MIN_BET} max={MAX_BET} onChange={(e) => setBet2Amount(Math.min(MAX_BET, Math.max(MIN_BET, Number(e.target.value))))} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" />
                    <button onClick={() => setBet2Amount(Math.min(MAX_BET, bet2Amount + 10))} className="p-1.5 text-gray-400 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[100, 200, 500, 1000].map(p => (
                      <button key={p} onClick={() => setBet2Amount(Math.min(MAX_BET, p))} className="py-1 bg-[#0b0e14] border border-[#232b3b] hover:border-gray-500 rounded-lg text-[10px] font-bold text-gray-300 transition">{p}</button>
                    ))}
                  </div>
                </div>
                <div className="w-2/5">
                  {renderBetButton(getPanel2ButtonState(), bet2Amount, handlePlaceBet2, handleCashout2, handleCancelQueue2, multiplier, queuedAmount2)}
                </div>
              </div>

              {panel2Tab === 'AUTO' && (
                <div className="flex items-center justify-between pt-2 border-t border-[#232b3b] text-xs font-bold text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>Auto bet</span>
                    <button onClick={() => setAutoBet2Enabled(!autoBet2Enabled)} className={`w-9 h-5 rounded-full p-0.5 transition ${autoBet2Enabled ? 'bg-emerald-500' : 'bg-[#232b3b]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${autoBet2Enabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Auto Out</span>
                    <button onClick={() => setAutoCashOut2Enabled(!autoCashOut2Enabled)} className={`w-9 h-5 rounded-full p-0.5 transition ${autoCashOut2Enabled ? 'bg-emerald-500' : 'bg-[#232b3b]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${autoCashOut2Enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <input type="number" step="0.1" value={autoCashOut2Mult} onChange={(e) => setAutoCashOut2Mult(e.target.value)} className="w-12 bg-[#0b0e14] border border-[#232b3b] rounded-lg text-center font-mono py-0.5 text-xs text-amber-400 outline-none" />
                    <span>x</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* HISTORY MODAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setHistoryModalOpen(false)}>
          <div className="relative w-full max-w-2xl bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 shadow-2xl text-white space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#232b3b] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black">FLIGHT HISTORY (LAST 50 ROUNDS)</h3>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {history.map((h, idx) => {
                const mult = Number(h.crashPoint || h);
                const isPurple = mult >= 2.0 && mult < 10.0;
                const isMagenta = mult >= 10.0;
                return (
                  <div key={idx} className={`p-2 rounded-xl border text-center font-mono font-bold text-sm transition ${isMagenta ? 'bg-pink-500/10 border-pink-500/40 text-pink-400'
                    : isPurple ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                      : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                    }`}>
                    {mult.toFixed(2)}x
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
