import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, Zap, Shield, Users, Wallet, Trophy, TrendingUp } from 'lucide-react';
import { WinGoBall } from '../wingo/WinGoBall';

const MODES = [
  { id: '30s', label: 'WinGo 30sec', durationSec: 30 },
  { id: '1m',  label: 'WinGo 1 Min',  durationSec: 60 },
  { id: '3m',  label: 'WinGo 3 Min',  durationSec: 180 },
  { id: '5m',  label: 'WinGo 5 Min',  durationSec: 300 },
];

export const WinGoAdmin = ({ socket, showToast }) => {
  const [telemetry, setTelemetry] = useState({});
  const [selectedRoom, setSelectedRoom] = useState('30s');

  useEffect(() => {
    if (!socket) return;

    socket.emit('wingo:join_admin');

    const handleTelemetry = (data) => {
      setTelemetry(data);
    };

    const handleInfo = (data) => {
      if (showToast) showToast(data.message, 'info');
    };

    socket.on('wingo:admin_telemetry', handleTelemetry);
    socket.on('wingo:admin_info', handleInfo);

    return () => {
      socket.off('wingo:admin_telemetry', handleTelemetry);
      socket.off('wingo:admin_info', handleInfo);
    };
  }, [socket, showToast]);

  // Set number override
  const handleSetNumber = (mode, num) => {
    if (!socket) return;
    socket.emit('wingo:admin_set_override', { mode, forcedNumber: num });
    if (showToast) showToast(`WinGo ${mode} forced to Number ${num}`, 'success');
  };

  // Set color override
  const handleSetColor = (mode, color) => {
    if (!socket) return;
    socket.emit('wingo:admin_set_override', { mode, forcedColor: color });
    if (showToast) showToast(`WinGo ${mode} forced to Color ${color}`, 'success');
  };

  // Set size override
  const handleSetSize = (mode, size) => {
    if (!socket) return;
    socket.emit('wingo:admin_set_override', { mode, forcedSize: size });
    if (showToast) showToast(`WinGo ${mode} forced to Size ${size}`, 'success');
  };

  // Clear override (Auto RNG / Lowest Exposure)
  const handleClearOverride = (mode) => {
    if (!socket) return;
    socket.emit('wingo:admin_set_override', { mode, clear: true });
    if (showToast) showToast(`WinGo ${mode} reset to AUTO (Lowest Exposure)`, 'info');
  };

  // Helper to calculate total liability for any number
  const getNumberLiability = (data, n) => {
    if (!data?.exposure) return 0;
    const betOnNum = data.exposure.numbers?.[n] || 0;
    const isBig = n >= 5;
    const sizeLiab = isBig ? (data.exposure.sizes?.BIG || 0) * 1.96 : (data.exposure.sizes?.SMALL || 0) * 1.96;
    const numLiab = betOnNum * 2.94;
    const colLiab = (n === 0 || n === 5)
      ? (data.exposure.colors?.VIOLET || 0) * 4.41 + ((n === 0 ? data.exposure.colors?.RED : data.exposure.colors?.GREEN) || 0) * 1.47
      : [2, 4, 6, 8].includes(n)
      ? (data.exposure.colors?.RED || 0) * 1.96
      : (data.exposure.colors?.GREEN || 0) * 1.96;
    return numLiab + sizeLiab + colLiab;
  };

  const currentRoom = telemetry[selectedRoom] || {
    mode: selectedRoom,
    label: selectedRoom === '30s' ? 'WinGo 30sec' : 'WinGo 1 Min',
    periodId: '—',
    remainingSec: 0,
    status: 'BETTING',
    totalPool: 0,
    totalBetsCount: 0,
    playersCount: 0,
    exposure: { numbers: {}, colors: {}, sizes: {} },
    projectedOutcome: { number: 0, color: 'RED_VIOLET', size: 'SMALL', liability: 0, algorithmMode: 'LOWEST_EXPOSURE' },
    manualOverride: null,
  };

  const isOverridden = currentRoom.manualOverride !== null && currentRoom.manualOverride !== undefined;

  // Active winning attributes
  const activeWinningNumber = isOverridden
    ? Number(currentRoom.manualOverride)
    : currentRoom.projectedOutcome?.number ?? 0;

  const activeWinningSize = activeWinningNumber >= 5 ? 'BIG' : 'SMALL';

  const activeWinningColor = activeWinningNumber === 0
    ? 'RED_VIOLET'
    : activeWinningNumber === 5
    ? 'GREEN_VIOLET'
    : [2, 4, 6, 8].includes(activeWinningNumber)
    ? 'RED'
    : 'GREEN';

  // Projected Net Profit & Margin for current active room
  const currentPool = Number(currentRoom.totalPool || 0);
  const currentLiability = getNumberLiability(currentRoom, activeWinningNumber);
  const currentNetProfit = currentPool - currentLiability;
  const currentMargin = currentPool > 0 ? ((currentNetProfit / currentPool) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-4 font-sans select-none pb-8">
      
      {/* ── 1. TOP LIVE SUMMATION CARDS (30s, 1m, 3m, 5m) ────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Live Room Telemetry & Pool Summation</h2>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODES.map((m) => {
            const data = telemetry[m.id] || {
              periodId: '—',
              remainingSec: m.durationSec,
              status: 'BETTING',
              totalPool: 0,
              totalBetsCount: 0,
              playersCount: 0,
              manualOverride: null,
              projectedOutcome: { number: 0, color: 'RED', size: 'SMALL' },
            };
            const isSelected = selectedRoom === m.id;
            const hasOverride = data.manualOverride !== null && data.manualOverride !== undefined;
            const winNum = hasOverride ? data.manualOverride : data.projectedOutcome?.number ?? 0;
            const winSize = winNum >= 5 ? 'BIG' : 'SMALL';

            const cardPool = Number(data.totalPool || 0);
            const cardLiab = getNumberLiability(data, winNum);
            const cardProfit = cardPool - cardLiab;
            const cardMargin = cardPool > 0 ? ((cardProfit / cardPool) * 100).toFixed(0) : '100';

            return (
              <div
                key={m.id}
                onClick={() => setSelectedRoom(m.id)}
                className={`cursor-pointer rounded-2xl p-3.5 border transition-all relative overflow-hidden shadow-lg ${
                  isSelected
                    ? 'bg-[#1e1438] border-amber-400 ring-2 ring-amber-400/40 scale-[1.01]'
                    : 'bg-[#151a23] border-[#232b3b] hover:border-purple-500/50'
                }`}
              >
                {/* Header: Label + Countdown */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white">{m.label}</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                    data.remainingSec <= 5
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {data.remainingSec}s
                  </span>
                </div>

                {/* Period ID */}
                <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">
                  Period: <strong className="text-gray-200">{data.periodId}</strong>
                </div>

                {/* Total Pool & Projected House Net Profit */}
                <div className="mt-2.5 flex items-baseline justify-between gap-1">
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Period Pool</div>
                    <div className="text-lg font-black font-mono text-amber-400">
                      ₹{cardPool.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">House Profit</div>
                    <div className={`text-sm font-black font-mono ${cardProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cardProfit >= 0 ? '+' : ''}₹{cardProfit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      <span className="text-[10px] text-gray-400 ml-1 font-sans">({cardMargin}%)</span>
                    </div>
                  </div>
                </div>

                {/* Bets Count & Players Count */}
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-gray-300">
                  <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-amber-400" />
                    <span>{data.totalBetsCount || 0} Bets</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-400" />
                    <span>{data.playersCount || 0} Players</span>
                  </div>
                </div>

                {/* Target Pill with Winning Number, Color, and Size */}
                <div className="mt-2.5 pt-1.5 border-t border-white/5 text-[10px] font-bold">
                  {hasOverride ? (
                    <div className="text-red-400 flex items-center gap-1 font-mono">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <span>FORCED: #{winNum} · {winSize}</span>
                    </div>
                  ) : (
                    <div className="text-emerald-400 flex items-center gap-1 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>AUTO: #{winNum} · {winSize}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. FULL CONTROLLER FOR SELECTED ROOM ─────────────────────────── */}
      <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl">
        
        {/* Active Room Title & Target Status Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#232b3b] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/40">
                ACTIVE ROOM: {currentRoom.label}
              </span>
              <span className="text-xs text-gray-400 font-mono">Period: {currentRoom.periodId}</span>
            </div>
            <div className="text-xs text-gray-300 font-bold">
              Pool: <strong className="text-amber-400 font-mono">₹{Math.round(currentPool).toLocaleString('en-IN')}</strong> | Total Bets: <strong className="text-white">{currentRoom.totalBetsCount || 0}</strong> | Total Bettors: <strong className="text-blue-400">{currentRoom.playersCount || 0} Persons</strong>
            </div>
          </div>

          {/* Top Prominent House Net Profit & Winning Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* House Net Profit Highlight Card */}
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Net House Profit</div>
                <div className="text-sm sm:text-base font-black font-mono text-emerald-400 flex items-center gap-1.5">
                  <span>{currentNetProfit >= 0 ? '+' : ''}₹{Math.round(currentNetProfit).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-sans font-bold">
                    {Math.round(currentMargin)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Target Status Indicator */}
            <div className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${
              isOverridden
                ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-lg shadow-red-950/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-950/40'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOverridden ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} />
              <div className="flex items-center gap-1.5 font-mono">
                <span className="uppercase">{isOverridden ? 'FORCED:' : 'AUTO:'}</span>
                <strong className="text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/20">
                  #{activeWinningNumber}
                </strong>
                <span className="text-amber-300">[{activeWinningColor}]</span>
                <span className={`px-1.5 py-0.5 rounded font-black ${
                  activeWinningSize === 'BIG' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                }`}>
                  {activeWinningSize}
                </span>
              </div>
            </div>

            {isOverridden && (
              <button
                onClick={() => handleClearOverride(selectedRoom)}
                className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold text-xs transition shadow"
              >
                Reset to Auto
              </button>
            )}
          </div>
        </div>

        {/* ── A. DIRECT NUMBER CONTROLLER (0–9 WITH POOL & AUTO SELECTION HIGHLIGHT) ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <span>🎯 Force Winning Number (Click Any Number to Set)</span>
            </label>
            <span className="text-[11px] text-gray-400">Green = Auto Selected | Red = Manually Forced</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3 bg-[#0b0e14] p-3.5 rounded-2xl border border-[#232b3b]">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const isForced = isOverridden && currentRoom.manualOverride === num;
              const isAutoWinner = !isOverridden && currentRoom.projectedOutcome?.number === num;
              const isWinningNode = isForced || isAutoWinner;
              const betOnNum = currentRoom.exposure?.numbers?.[num] || 0;

              return (
                <div
                  key={num}
                  onClick={() => handleSetNumber(selectedRoom, num)}
                  className={`cursor-pointer flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    isForced
                      ? 'bg-red-500/25 border-red-400 ring-2 ring-red-400/80 scale-105 shadow-xl shadow-red-950/60'
                      : isAutoWinner
                      ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/80 scale-105 shadow-xl shadow-emerald-950/60'
                      : 'bg-[#151a23] border-[#232b3b] hover:border-amber-400/50 hover:scale-105'
                  }`}
                >
                  {/* Winning Ribbon Tag */}
                  {isWinningNode ? (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase mb-1 ${
                      isForced ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'
                    }`}>
                      {isForced ? 'FORCED' : 'WINNER'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-500 font-bold mb-1">Set #{num}</span>
                  )}

                  {/* Ball Graphic */}
                  <WinGoBall num={num} size="md" />

                  {/* Bet Amount Under This Number */}
                  <div className="mt-2 text-center w-full">
                    <div className="text-[11px] font-mono font-black text-amber-400">
                      ₹{betOnNum.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold truncate">
                      {num >= 5 ? 'Big' : 'Small'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── B. DIRECT COLOR & BIG/SMALL CONTROLLER WITH AMOUNTS & WINNER HIGHLIGHT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Force Color with Bet Amounts */}
          <div className="space-y-2 bg-[#0b0e14] p-4 rounded-2xl border border-[#232b3b]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                🎨 Force Color Outcome
              </label>
              <span className="text-[10px] text-gray-400">Shows current color bets</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* GREEN */}
              {(() => {
                const isWinner = activeWinningColor === 'GREEN' || activeWinningColor === 'GREEN_VIOLET';
                const colorAmount = currentRoom.exposure?.colors?.GREEN || 0;
                return (
                  <button
                    onClick={() => handleSetColor(selectedRoom, 'GREEN')}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow ${
                      isWinner
                        ? 'bg-[#00b977] text-white ring-4 ring-emerald-400/60 scale-105 font-black'
                        : 'bg-[#00b977]/80 hover:bg-[#00b977] text-white font-bold'
                    }`}
                  >
                    <span className="text-xs uppercase flex items-center gap-1">
                      Green {isWinner && '★'}
                    </span>
                    <span className="text-[11px] font-mono font-black mt-0.5 opacity-95">
                      ₹{colorAmount.toFixed(0)}
                    </span>
                  </button>
                );
              })()}

              {/* VIOLET */}
              {(() => {
                const isWinner = activeWinningColor === 'VIOLET' || activeWinningColor === 'RED_VIOLET' || activeWinningColor === 'GREEN_VIOLET';
                const colorAmount = currentRoom.exposure?.colors?.VIOLET || 0;
                return (
                  <button
                    onClick={() => handleSetColor(selectedRoom, 'VIOLET')}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow ${
                      isWinner
                        ? 'bg-[#8c52ff] text-white ring-4 ring-purple-400/60 scale-105 font-black'
                        : 'bg-[#8c52ff]/80 hover:bg-[#8c52ff] text-white font-bold'
                    }`}
                  >
                    <span className="text-xs uppercase flex items-center gap-1">
                      Violet {isWinner && '★'}
                    </span>
                    <span className="text-[11px] font-mono font-black mt-0.5 opacity-95">
                      ₹{colorAmount.toFixed(0)}
                    </span>
                  </button>
                );
              })()}

              {/* RED */}
              {(() => {
                const isWinner = activeWinningColor === 'RED' || activeWinningColor === 'RED_VIOLET';
                const colorAmount = currentRoom.exposure?.colors?.RED || 0;
                return (
                  <button
                    onClick={() => handleSetColor(selectedRoom, 'RED')}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow ${
                      isWinner
                        ? 'bg-[#ff4d61] text-white ring-4 ring-red-400/60 scale-105 font-black'
                        : 'bg-[#ff4d61]/80 hover:bg-[#ff4d61] text-white font-bold'
                    }`}
                  >
                    <span className="text-xs uppercase flex items-center gap-1">
                      Red {isWinner && '★'}
                    </span>
                    <span className="text-[11px] font-mono font-black mt-0.5 opacity-95">
                      ₹{colorAmount.toFixed(0)}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Force Big / Small with Bet Amounts & Active Indicator */}
          <div className="space-y-2 bg-[#0b0e14] p-4 rounded-2xl border border-[#232b3b]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                ⚖️ Force Size Outcome (Big / Small)
              </label>
              <span className="text-[10px] text-gray-400">Shows current size bets</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* BIG (5 to 9) */}
              {(() => {
                const isWinner = activeWinningSize === 'BIG';
                const sizeAmount = currentRoom.exposure?.sizes?.BIG || 0;
                return (
                  <button
                    onClick={() => handleSetSize(selectedRoom, 'BIG')}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow ${
                      isWinner
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black ring-4 ring-amber-400/60 scale-105 font-black'
                        : 'bg-[#251f3e] hover:bg-amber-500/20 text-gray-300 hover:text-amber-400 font-bold border border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs uppercase font-black">
                      <Trophy className={`w-3.5 h-3.5 ${isWinner ? 'text-black' : 'text-amber-400'}`} />
                      <span>BIG (5-9)</span>
                      {isWinner && <span className="text-[10px] bg-black text-amber-400 px-1 rounded">WIN</span>}
                    </div>
                    <span className={`text-xs font-mono font-black mt-0.5 ${isWinner ? 'text-black' : 'text-amber-400'}`}>
                      ₹{sizeAmount.toFixed(0)}
                    </span>
                  </button>
                );
              })()}

              {/* SMALL (0 to 4) */}
              {(() => {
                const isWinner = activeWinningSize === 'SMALL';
                const sizeAmount = currentRoom.exposure?.sizes?.SMALL || 0;
                return (
                  <button
                    onClick={() => handleSetSize(selectedRoom, 'SMALL')}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow ${
                      isWinner
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white ring-4 ring-blue-400/60 scale-105 font-black'
                        : 'bg-[#251f3e] hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 font-bold border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs uppercase font-black">
                      <Trophy className={`w-3.5 h-3.5 ${isWinner ? 'text-white' : 'text-blue-400'}`} />
                      <span>SMALL (0-4)</span>
                      {isWinner && <span className="text-[10px] bg-white text-blue-600 px-1 rounded">WIN</span>}
                    </div>
                    <span className={`text-xs font-mono font-black mt-0.5 ${isWinner ? 'text-white' : 'text-blue-400'}`}>
                      ₹{sizeAmount.toFixed(0)}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

        </div>

        {/* ── C. LIVE MONETARY EXPOSURE BREAKDOWN MATRIX ────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-gray-300">
              📊 Live Monetary Liability & Exposure Table
            </label>
            <span className="text-[10px] text-gray-400">Lowest liability = Maximum house profit</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#232b3b] bg-[#0b0e14]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#151a23] text-gray-400 uppercase text-[10px] border-b border-[#232b3b]">
                  <th className="p-3">Candidate Ball</th>
                  <th className="p-3">Color / Size</th>
                  <th className="p-3 text-right">Bets on Number</th>
                  <th className="p-3 text-right">Payout Liability</th>
                  <th className="p-3 text-right text-emerald-400 font-black">House Net Profit</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232b3b] text-gray-200">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                  const betOnNum = currentRoom.exposure?.numbers?.[n] || 0;
                  const isForced = isOverridden && currentRoom.manualOverride === n;
                  const isAutoWinner = !isOverridden && currentRoom.projectedOutcome?.number === n;

                  // Combined liability calculation
                  const isBig = n >= 5;
                  const sizeLiab = isBig ? (currentRoom.exposure?.sizes?.BIG || 0) * 1.96 : (currentRoom.exposure?.sizes?.SMALL || 0) * 1.96;
                  const numLiab = betOnNum * 2.94;
                  const colLiab = (n === 0 || n === 5)
                    ? (currentRoom.exposure?.colors?.VIOLET || 0) * 4.41 + ((n === 0 ? currentRoom.exposure?.colors?.RED : currentRoom.exposure?.colors?.GREEN) || 0) * 1.47
                    : [2, 4, 6, 8].includes(n)
                    ? (currentRoom.exposure?.colors?.RED || 0) * 1.96
                    : (currentRoom.exposure?.colors?.GREEN || 0) * 1.96;
                  const totalLiab = numLiab + sizeLiab + colLiab;
                  const houseProfit = (currentRoom.totalPool || 0) - totalLiab;

                  return (
                    <tr
                      key={n}
                      onClick={() => handleSetNumber(selectedRoom, n)}
                      className={`cursor-pointer transition hover:bg-white/5 ${
                        isForced ? 'bg-red-500/15 font-bold' : isAutoWinner ? 'bg-emerald-500/15 font-bold' : ''
                      }`}
                    >
                      <td className="p-2.5 pl-3">
                        <div className="flex items-center gap-2">
                          <WinGoBall num={n} size="xs" />
                          <span className="font-bold text-white font-sans">Number {n}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-[11px] font-sans">
                        <span className="text-gray-400 font-bold">
                          {n === 0 ? 'Red+Violet' : n === 5 ? 'Green+Violet' : [2, 4, 6, 8].includes(n) ? 'Red' : 'Green'} · {n >= 5 ? 'Big' : 'Small'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-gray-300">
                        ₹{Math.round(betOnNum).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        <span className={isAutoWinner ? 'text-emerald-400' : isForced ? 'text-red-400' : 'text-gray-200'}>
                          ₹{Math.round(totalLiab).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black">
                        <span className={houseProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {houseProfit >= 0 ? '+' : ''}₹{Math.round(houseProfit).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        {isForced ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30">
                            FORCED TARGET
                          </span>
                        ) : isAutoWinner ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                            MAX PROFIT (AUTO)
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Click to Set</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
