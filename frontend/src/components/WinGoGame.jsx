import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { WinGoHeader } from './wingo/WinGoHeader';
import { WinGoBettingGrid } from './wingo/WinGoBettingGrid';
import { WinGoBetModal } from './wingo/WinGoBetModal';
import { WinGoLockOverlay } from './wingo/WinGoLockOverlay';
import { WinGoHistoryTabs } from './wingo/WinGoHistoryTabs';
import { WinGoUserOutcomeModal } from './wingo/WinGoUserOutcomeModal';
import { wingoAPI } from '../services/api';
import { BookOpen, X } from 'lucide-react';

import { GameConnectionWatchdog } from './common/GameConnectionWatchdog';

export const WinGoGame = ({ onOpenDeposit, onOpenAuth }) => {
  const { user, updateBalance, showToast } = useAuth();
  const socketRef = useRef(null);
  const [lastEventTime, setLastEventTime] = useState(Date.now());

  // Active Mode State: '30s' | '1m' | '3m' | '5m' (Default 30s)
  const [activeMode, setActiveMode] = useState('30s');

  // Room State
  const [periodId, setPeriodId] = useState('20260815100000001');
  const [remainingSec, setRemainingSec] = useState(30);
  const [roomStatus, setRoomStatus] = useState('BETTING'); // 'BETTING' | 'LOCKED' | 'SETTLING'
  const [recentBalls, setRecentBalls] = useState([4, 1, 1, 8, 1]);
  const [lastRoundEvent, setLastRoundEvent] = useState(null);

  // Modals & Popups
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null); // { type, value, label, initialMultiplier }
  const [userOutcome, setUserOutcome] = useState(null); // Personal Win / Lose Modal
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  // Bet Placed Top Toast
  const [betToast, setBetToast] = useState(null);
  const [betToastHiding, setBetToastHiding] = useState(false);
  const toastTimerRef = useRef(null);

  const showBetToast = (label, amount) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setBetToast({ label, amount });
    setBetToastHiding(false);
    toastTimerRef.current = setTimeout(() => {
      setBetToastHiding(true);
      setTimeout(() => setBetToast(null), 300);
    }, 2500);
  };

  // Fetch Initial History for Balls preview
  const fetchRecentBalls = async (mode) => {
    try {
      const res = await wingoAPI.getGameHistory(mode, 1, 5);
      if (res.history && res.history.length > 0) {
        setRecentBalls(res.history.map(h => h.winningNumber));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReconnect = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('wingo:join_room', { mode: activeMode });
    }
    fetchRecentBalls(activeMode);
    setLastEventTime(Date.now());
  };

  // Socket Connection & Room Subscription
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('wingo:join_room', { mode: activeMode });
    fetchRecentBalls(activeMode);

    socket.on('wingo:room_state', (data) => {
      if (data.mode === activeMode) {
        setPeriodId(data.periodId);
        setRemainingSec(data.remainingSec);
        setRoomStatus(data.status);
        setLastEventTime(Date.now());
      }
    });

    socket.on('wingo:tick', (data) => {
      if (data.mode === activeMode) {
        setPeriodId(data.periodId);
        setRemainingSec(data.remainingSec);
        setRoomStatus(data.status);
        setLastEventTime(Date.now());
      }
    });

    socket.on('wingo:round_locked', (data) => {
      if (data.mode === activeMode) {
        setRoomStatus('LOCKED');
        setBetModalOpen(false); // Close bet modal if user had it open
        setLastEventTime(Date.now());
      }
    });

    socket.on('wingo:new_round', (data) => {
      if (data.mode === activeMode) {
        setPeriodId(data.periodId);
        setRemainingSec(data.remainingSec);
        setRoomStatus('BETTING');
        setLastEventTime(Date.now());
      }
    });

    // Prediction outcome: Update recent balls and table SILENTLY (No popup!)
    socket.on('wingo:round_result', (data) => {
      if (data.mode === activeMode) {
        setLastRoundEvent(data);
        setRecentBalls(prev => [data.winningNumber, ...prev.slice(0, 4)]);
        setLastEventTime(Date.now());
      }
    });

    // Personal Bettor Outcome (Win or Lose popup for 1.5s - 3s)
    socket.on('wingo:user_round_result', (data) => {
      setUserOutcome(data);
      if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
      }
      setLastEventTime(Date.now());
    });

    socket.on('wingo:bet_placed', (data) => {
      updateBalance(data.newBalance);
      showBetToast(data.selectValue, data.totalAmount);
      setLastEventTime(Date.now());
    });

    socket.on('wingo:bet_error', (data) => {
      showToast(data.message, 'error');
    });

    return () => {
      socket.off('wingo:room_state');
      socket.off('wingo:tick');
      socket.off('wingo:round_locked');
      socket.off('wingo:new_round');
      socket.off('wingo:round_result');
      socket.off('wingo:user_round_result');
      socket.off('wingo:bet_placed');
      socket.off('wingo:bet_error');
    };
  }, [activeMode]);

  // Mode Switcher Handler
  const handleSelectMode = (mode) => {
    setActiveMode(mode);
    setRemainingSec(mode === '30s' ? 30 : mode === '1m' ? 60 : mode === '3m' ? 180 : 300);
    setRoomStatus('BETTING');
    if (socketRef.current) {
      socketRef.current.emit('wingo:join_room', { mode });
    }
  };

  // Click on any betting option (Color, Number, Big/Small) with active multiplier
  const handleSelectOption = (opt, multiplier = 1) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.isBlocked) {
      showToast('Your account is blocked. You cannot place bets.', 'error');
      return;
    }
    if (roomStatus === 'LOCKED' || remainingSec <= 5) {
      showToast('Betting is locked for the current period', 'error');
      return;
    }
    setSelectedOption({
      ...opt,
      initialMultiplier: multiplier,
    });
    setBetModalOpen(true);
  };

  // Confirm Bet Placement
  const handleConfirmBet = (betData) => {
    if (!socketRef.current) return;
    if (user?.isBlocked) {
      showToast('Your account is blocked. You cannot place bets.', 'error');
      return;
    }
    socketRef.current.emit('wingo:place_bet', {
      mode: activeMode,
      ...betData,
    });
  };

  const isLocked = roomStatus === 'LOCKED' || remainingSec <= 5;
  const activeModeLabels = {
    '30s': 'WinGo 30sec',
    '1m':  'WinGo 1 Min',
    '3m':  'WinGo 3 Min',
    '5m':  'WinGo 5 Min',
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-36 sm:pb-20 font-sans relative">
      
      {/* Bet Placed Notification Banner */}
      {betToast && (
        <div
          className={`fixed top-20 left-1/2 z-[999] pointer-events-none px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold
            bg-emerald-900/95 border-emerald-500/60 text-emerald-300 backdrop-blur-lg
            ${betToastHiding ? 'bet-pop-toast hiding' : 'bet-pop-toast'}`}
          style={{ transform: 'translateX(-50%)' }}
        >
          <span className="text-xl">✅</span>
          <div className="text-left">
            <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Bet Placed!</div>
            <div className="text-white font-mono">₹{Number(betToast.amount).toFixed(2)} on {betToast.label}</div>
          </div>
        </div>
      )}

      {/* ── RESPONSIVE FULL-SCREEN COMPUTER GRID (2-COL ON DESKTOP, 1-COL ON MOBILE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: Header + Ticket + Betting Grid */}
        <div className="lg:col-span-6 space-y-4">
          <WinGoHeader
            activeMode={activeMode}
            onSelectMode={handleSelectMode}
            periodId={periodId}
            remainingSec={remainingSec}
            recentBalls={recentBalls}
            onOpenHowToPlay={() => setHowToPlayOpen(true)}
          />

          <div className="relative">
            <WinGoBettingGrid
              onSelectOption={handleSelectOption}
              isLocked={isLocked}
            />

            {/* 5-Second Lock Countdown Screen */}
            <WinGoLockOverlay remainingSec={remainingSec} />
          </div>
        </div>

        {/* RIGHT COLUMN: History Tabs (Game History, Trend Chart, My History with Pagination) */}
        <div className="lg:col-span-6 space-y-4">
          <WinGoHistoryTabs
            activeMode={activeMode}
            lastRoundResult={lastRoundEvent}
          />
        </div>

      </div>

      {/* ── BET SELECTION MODAL (MATCHING USER REFERENCE SCREENSHOTS) ───────── */}
      <WinGoBetModal
        isOpen={betModalOpen}
        onClose={() => setBetModalOpen(false)}
        selection={selectedOption}
        modeLabel={activeModeLabels[activeMode]}
        userBalance={user?.walletBalance ?? 0}
        onConfirmBet={handleConfirmBet}
      />

      {/* ── PERSONAL USER WIN / LOSE POPUP (MATCHING USER REFERENCE SCREENSHOTS) ── */}
      {userOutcome && (
        <WinGoUserOutcomeModal
          outcome={userOutcome}
          onClose={() => setUserOutcome(null)}
        />
      )}

      {/* ── HOW TO PLAY MODAL ──────────────────────────────────────────────── */}
      {howToPlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#1e1938] border border-purple-900/40 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
              <div className="flex items-center gap-2 text-base font-black text-amber-400">
                <BookOpen className="w-5 h-5" />
                <span>WinGo Rules & Odds</span>
              </div>
              <button
                onClick={() => setHowToPlayOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300 overflow-y-auto max-h-80 pr-1 font-sans leading-relaxed">
              <div>
                <strong className="text-white block mb-1">🎮 Game Modes</strong>
                4 timer variations: 30-sec, 1-min, 3-min, and 5-min. Betting closes when 5 seconds remain.
              </div>
              <div>
                <strong className="text-emerald-400 block mb-1">🟢 Green (1, 3, 7, 9)</strong>
                Bet 100 ₹ & win: Returns ₹196 (2x minus 2% fee). If outcome is 5 (Green+Violet), returns ₹147 (1.5x).
              </div>
              <div>
                <strong className="text-red-400 block mb-1">🔴 Red (2, 4, 6, 8)</strong>
                Bet 100 ₹ & win: Returns ₹196 (2x minus 2% fee). If outcome is 0 (Red+Violet), returns ₹147 (1.5x).
              </div>
              <div>
                <strong className="text-purple-400 block mb-1">🟣 Violet (0, 5)</strong>
                Bet 100 ₹ & win: Returns ₹441 (4.5x minus 2% fee).
              </div>
              <div>
                <strong className="text-amber-400 block mb-1">🔢 Exact Numbers (0 to 9)</strong>
                Bet 100 ₹ & match exact number: Returns ₹294 (3x minus 2% fee).
              </div>
              <div>
                <strong className="text-blue-400 block mb-1">⚖️ Big (5, 6, 7, 8, 9) & Small (0, 1, 2, 3, 4)</strong>
                Bet 100 ₹ & win: Returns ₹196 (2x minus 2% fee).
              </div>
            </div>

            <button
              onClick={() => setHowToPlayOpen(false)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ── CONNECTION & BACKGROUND RESILIENCE WATCHDOG ─────────────────────── */}
      <GameConnectionWatchdog
        gameName="WinGo Lottery"
        lastEventTimestamp={lastEventTime}
        onReconnect={handleReconnect}
      />
    </div>
  );
};
