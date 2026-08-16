import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame, TrendingUp, AlertTriangle, Wallet, Lock, Activity,
  Zap, Sliders, Cpu, Radio, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';
import { adminAPI } from '../../services/api';

// ── AviatorAdmin — all Aviator-specific admin controls ───────────────────────
// Props: socket (shared instance), showToast (from AuthContext)
export const AviatorAdmin = ({ socket, showToast }) => {
  const [activeSection, setActiveSection] = useState('ANALYTICS');
  const [dateRange, setDateRange] = useState('today');

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [lastCrashRefresh, setLastCrashRefresh] = useState(null);
  const [crashCount, setCrashCount] = useState(0);

  // Live telemetry
  const [telemetry, setTelemetry] = useState(null);
  const [countdownSec, setCountdownSec] = useState(5);
  const [gamePhase, setGamePhase] = useState('BETTING');
  const [lastCrashedAt, setLastCrashedAt] = useState(null);

  // Controls
  const [controlMode, setControlMode] = useState('AUTOMATED');
  const [forcedMultiplier, setForcedMultiplier] = useState(1.50);
  const [riskCapCeiling, setRiskCapCeiling] = useState(50000);
  const [riskCapEnabled, setRiskCapEnabled] = useState(true);
  const [forceCrashing, setForceCrashing] = useState(false);

  // Task 2: Auto-crash on cashout toggle
  const [autoCrashEnabled, setAutoCrashEnabled] = useState(false);
  const [autoCrashThreshold, setAutoCrashThreshold] = useState(20);

  // New round popup
  const [showNewRoundPopup, setShowNewRoundPopup] = useState(false);
  const newRoundTimerRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await adminAPI.getAviatorAnalytics(dateRange);
      setAnalytics(res);
      setLastCrashRefresh(new Date());
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [dateRange, showToast]);

  useEffect(() => {
    if (activeSection === 'ANALYTICS') fetchAnalytics();
  }, [activeSection, dateRange]);

  useEffect(() => {
    if (!socket) return;
    socket.on('admin:telemetry_sync', (data) => {
      setTelemetry(data);
      if (data.status) setGamePhase(data.status);
      if (data.adminControlConfig) {
        setControlMode(data.adminControlConfig.mode);
        if (data.adminControlConfig.forcedNextCrashPoint) setForcedMultiplier(data.adminControlConfig.forcedNextCrashPoint);
        setRiskCapCeiling(data.adminControlConfig.maxExposureCeiling);
        setRiskCapEnabled(data.adminControlConfig.riskAlertEnabled ?? true);
      }
      if (data.autoCrashOnCashout !== undefined) setAutoCrashEnabled(data.autoCrashOnCashout);
      if (data.autoCrashCashoutThreshold !== undefined) setAutoCrashThreshold(Math.round(data.autoCrashCashoutThreshold * 100));
    });

    socket.on('aviator:round_preparing', (data) => {
      setGamePhase('BETTING');
      setCountdownSec(data?.countdownSec ?? 5);
      setShowNewRoundPopup(true);
    });

    socket.on('aviator:countdown_tick', (data) => {
      setCountdownSec(data.countdownSec);
      setGamePhase('BETTING');
    });

    socket.on('aviator:round_started', () => {
      setGamePhase('RUNNING');
      setCountdownSec(0);
      setShowNewRoundPopup(true);
      if (newRoundTimerRef.current) clearTimeout(newRoundTimerRef.current);
      newRoundTimerRef.current = setTimeout(() => setShowNewRoundPopup(false), 2000);
    });

    socket.on('aviator:crashed', (data) => {
      setGamePhase('CRASHED');
      setCrashCount(c => c + 1);
      if (data?.crashPoint) setLastCrashedAt(Number(data.crashPoint));
      setTimeout(() => fetchAnalytics(), 1500);
    });

    socket.on('admin:risk_alert', (data) => showToast(`⚠️ RISK ALERT: ${data.message}`, 'error'));

    return () => {
      socket.off('admin:telemetry_sync');
      socket.off('aviator:round_preparing');
      socket.off('aviator:countdown_tick');
      socket.off('aviator:round_started');
      socket.off('aviator:crashed');
      socket.off('admin:risk_alert');
      if (newRoundTimerRef.current) clearTimeout(newRoundTimerRef.current);
    };
  }, [socket, fetchAnalytics, showToast]);

  const handleToggleMode = (mode) => {
    setControlMode(mode);
    socket.emit('admin:set_control_mode', { mode });
    showToast(`Aviator mode → ${mode}`, 'info');
  };
  const handleSetForcedMultiplier = (e) => {
    e.preventDefault();
    socket.emit('admin:set_forced_multiplier', { crashPoint: forcedMultiplier });
    showToast(`Next crash forced to ${forcedMultiplier}x`, 'success');
  };
  const handleSetRiskCap = (e) => {
    e.preventDefault();
    socket.emit('admin:set_risk_cap', { ceiling: riskCapCeiling, enabled: riskCapEnabled });
    showToast(`Risk ceiling updated to ₹${riskCapCeiling.toLocaleString()}`, 'success');
  };
  const handleForceCrash = () => {
    if (telemetry?.status !== 'RUNNING' && gamePhase !== 'RUNNING') return showToast('No round currently in flight', 'error');
    setForceCrashing(true);
    socket.emit('admin:force_crash_now');
    showToast(`⚡ Force crash at ${(telemetry?.currentMultiplier || 1).toFixed(2)}x`, 'success');
    setTimeout(() => setForceCrashing(false), 3000);
  };
  const handleToggleAutoCrash = () => {
    const newEnabled = !autoCrashEnabled;
    setAutoCrashEnabled(newEnabled);
    socket.emit('admin:toggle_auto_crash_cashout', { enabled: newEnabled, threshold: autoCrashThreshold / 100 });
    showToast(`Auto-crash ${newEnabled ? '🟢 ENABLED' : '🔴 DISABLED'} @ ${autoCrashThreshold}%`, newEnabled ? 'success' : 'info');
  };

  const effectiveStatus = telemetry?.status || gamePhase;

  return (
    <div className="space-y-4 relative">
      {/* Admin New Round Banner / Notification with Remaining Seconds */}
      {showNewRoundPopup && (
        <div className="fixed top-20 left-1/2 z-[9999] pointer-events-none"
          style={{ transform: 'translateX(-50%)', animation: 'adminRoundPop 0.5s ease forwards' }}>
          <div className="flex items-center gap-4 px-6 py-3.5 rounded-2xl shadow-2xl bg-gradient-to-r from-emerald-950 via-gray-900 to-emerald-950 border border-emerald-500/60 text-white backdrop-blur-lg">
            <span className="text-3xl animate-bounce">✈️</span>
            <div>
              <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-black flex items-center gap-2">
                <span>Aviator Session</span>
                {effectiveStatus === 'BETTING' && (
                  <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 text-[9px]">
                    COUNTDOWN
                  </span>
                )}
              </div>
              <div className="text-base font-black flex items-center gap-2">
                {effectiveStatus === 'BETTING' ? (
                  <>
                    <span>New Round Starting in</span>
                    <span className="text-amber-400 font-mono text-lg font-black">{countdownSec}.0s</span>
                  </>
                ) : (
                  <span className="text-emerald-400">Flight Started! Multiplier Active</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-400 fill-red-400" />
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Aviator Control Portal</h2>
          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">LIVE</span>
        </div>
        <div className="flex bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] text-xs font-bold gap-1">
          {['ANALYTICS', 'CONTROL', 'LIVE FEED'].map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`px-3 py-1.5 rounded-lg transition ${activeSection === s ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#151a23] border border-[#232b3b] p-3 rounded-2xl shadow-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><Wallet className="w-3 h-3" /> Round Pool</div>
          <div className="text-xl font-black font-mono text-amber-400">₹{(telemetry?.roundPoolINR || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="text-[10px] text-gray-500">{(telemetry?.totalBetsCount || 0)} bets placed</div>
        </div>
        {(() => {
          const profit = telemetry?.currentRoundNetProfit ?? 0;
          const isProfit = profit >= 0;
          return (
            <div className={`bg-[#151a23] border p-3 rounded-2xl shadow-xl space-y-0.5 ${isProfit ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><TrendingUp className="w-3 h-3" /> Round Profit</div>
              <div className={`text-xl font-black font-mono ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                {isProfit ? '+' : ''}₹{Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-gray-500">House P&L this round</div>
            </div>
          );
        })()}
        <div className="bg-[#151a23] border border-red-500/20 p-3 rounded-2xl shadow-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><AlertTriangle className="w-3 h-3 text-red-400" /> Max Risk</div>
          <div className="text-xl font-black font-mono text-red-400">₹{(telemetry?.activeExposureINR || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="text-[10px] text-gray-500">If all cash out @ {(telemetry?.currentMultiplier || 1).toFixed(2)}x</div>
        </div>
        {(() => {
          const total = telemetry?.totalBetsCount || 0;
          const active = telemetry?.activeBetsCount || 0;
          const cashedOut = Math.max(0, total - active);
          const pct = total > 0 ? Math.round((cashedOut / total) * 100) : 0;
          return (
            <div className="bg-[#151a23] border border-[#232b3b] p-3 rounded-2xl shadow-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><Radio className="w-3 h-3" /> Bets</div>
              <div className="text-xl font-black font-mono">
                <span className="text-emerald-400">{cashedOut}</span>
                <span className="text-gray-500 text-sm font-normal"> / {total}</span>
              </div>
              <div className="text-[10px] text-gray-500">Cashed out / Total</div>
              <div className="h-1 w-full bg-[#232b3b] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })()}

        {/* Multiplier / Next Round Countdown card */}
        <div className="bg-[#151a23] border border-emerald-500/20 p-3 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
              <Activity className="w-3 h-3" />
              {effectiveStatus === 'BETTING' ? 'Next Flight In' : 'Multiplier'}
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${effectiveStatus === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : effectiveStatus === 'BETTING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
              {effectiveStatus}
            </span>
          </div>

          {effectiveStatus === 'BETTING' ? (
            <div className="space-y-1">
              <div className="text-2xl font-black font-mono text-amber-400 animate-pulse">
                {countdownSec}.0s
              </div>
              <div className="w-full h-1 bg-[#0b0e14] rounded-full overflow-hidden border border-[#232b3b]">
                <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(countdownSec / 5) * 100}%` }} />
              </div>
            </div>
          ) : effectiveStatus === 'CRASHED' ? (
            <div className="text-2xl font-black font-mono text-red-400">
              {Number(lastCrashedAt || telemetry?.currentMultiplier || 1).toFixed(2)}x
            </div>
          ) : (
            <div className="text-2xl font-black font-mono text-emerald-400">
              {(telemetry?.currentMultiplier || 1).toFixed(2)}x
            </div>
          )}

          {telemetry?.scheduledCrashPoint && (
            <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${telemetry.scheduledCrashPoint >= 10 ? 'bg-pink-500/10 border-pink-500/40'
              : telemetry.scheduledCrashPoint >= 2 ? 'bg-purple-500/10 border-purple-500/40'
                : 'bg-red-500/10 border-red-500/40'
              }`}>
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Will Fly Away At</div>
                <div className={`text-xl font-black font-mono ${telemetry.scheduledCrashPoint >= 10 ? 'text-pink-400' : telemetry.scheduledCrashPoint >= 2 ? 'text-purple-400' : 'text-red-400'}`}>
                  {Number(telemetry.scheduledCrashPoint).toFixed(2)}x
                </div>
              </div>
              <div className="text-2xl opacity-40">{telemetry.scheduledCrashPoint >= 10 ? '🚀' : telemetry.scheduledCrashPoint >= 2 ? '✈️' : '💥'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ANALYTICS SECTION */}
      {activeSection === 'ANALYTICS' && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${telemetry?.status === 'RUNNING' ? 'bg-red-950/40 border-red-500/50' : 'bg-[#151a23] border-[#232b3b] opacity-60'}`}>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" /> Force Crash Now
                {telemetry?.status === 'RUNNING'
                  ? <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">ROUND IN FLIGHT</span>
                  : <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">{telemetry?.status || 'BETTING'}</span>}
              </h3>
              <p className="text-[11px] text-gray-400">Instantly crashes the current flying round at the live multiplier{telemetry?.status === 'RUNNING' && <strong className="text-white"> ({(telemetry?.currentMultiplier || 1).toFixed(2)}x right now)</strong>}.</p>
            </div>
            <button onClick={handleForceCrash} disabled={telemetry?.status !== 'RUNNING' || forceCrashing}
              className={`shrink-0 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition shadow-lg ${telemetry?.status === 'RUNNING' && !forceCrashing ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse hover:animate-none' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
              <Zap className="w-4 h-4" />
              {forceCrashing ? 'Crashing...' : telemetry?.status === 'RUNNING' ? '⚡ FLY AWAY & CRASH' : 'Waiting for Flight...'}
            </button>
          </div>

          <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232b3b] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase">Historical Performance & House Edge</h3>
                <span className="text-[9px] text-gray-500 font-mono bg-[#0b0e14] px-2 py-0.5 rounded border border-[#232b3b]">Auto-refreshes on crash ⚡</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchAnalytics} className="p-1.5 rounded-lg bg-[#232b3b] hover:bg-gray-700 transition"><RefreshCw className="w-3.5 h-3.5 text-gray-400" /></button>
                <div className="flex bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] text-xs font-bold gap-1">
                  {['today', 'week', 'month', 'all'].map(r => (
                    <button key={r} onClick={() => setDateRange(r)}
                      className={`px-3 py-1 rounded-lg capitalize transition ${dateRange === r ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            {analytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Gross Volume', value: `₹${Math.round(analytics.totalVolume || 0).toLocaleString('en-IN')}`, sub: `${analytics.totalBetsCount ?? 0} rounds`, color: 'white' },
                  { label: 'Player Payouts', value: `₹${Math.round(analytics.totalPayouts || 0).toLocaleString('en-IN')}`, sub: 'Total won by players', color: 'amber' },
                  { label: 'Net House Profit', value: `₹${Math.round(analytics.netHouseProfit || 0).toLocaleString('en-IN')}`, sub: 'Platform retention', color: 'emerald' },
                  { label: 'House Edge', value: `${Math.round(analytics.houseEdgePercentage ?? 0)}%`, sub: `RTP: ${Math.round(analytics.rtpPercentage ?? 0)}%`, color: 'amber' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className={`bg-[#0b0e14] border border-${color === 'emerald' ? 'emerald-500/30' : '[#232b3b]'} p-4 rounded-xl space-y-1`}>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{label}</div>
                    <div className={`text-xl font-black font-mono text-${color === 'white' ? 'white' : color + '-400'}`}>{value}</div>
                    <div className="text-[10px] text-gray-500">{sub}</div>
                  </div>
                ))}
              </div>
            ) : <div className="py-8 text-center text-gray-500 text-sm">Loading analytics…</div>}
          </div>

          {telemetry?.history && (
            <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-4 shadow-xl">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Recent Crash Points (last 50 rounds)</h4>
              <div className="flex flex-wrap gap-1.5">
                {telemetry.history.map((h, i) => {
                  const cp = Number(h.crashPoint || h);
                  return (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${cp >= 10 ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : cp >= 2 ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>{cp.toFixed(2)}x</span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTROL SECTION */}
      {activeSection === 'CONTROL' && (
        <div className="space-y-4">
          {/* Task 2: Auto-Crash Toggle */}
          <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${autoCrashEnabled ? 'bg-amber-950/30 border-amber-500/50' : 'bg-[#151a23] border-[#232b3b]'}`}>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                {autoCrashEnabled ? <ToggleRight className="w-5 h-5 text-amber-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                Auto-Crash on Cashout Threshold
                <span className={`text-[9px] px-2 py-0.5 rounded border font-black ${autoCrashEnabled ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                  {autoCrashEnabled ? '🟡 ACTIVE' : '⚫ INACTIVE'}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">When enabled, auto-crashes if player cashouts reach <strong className="text-white">{autoCrashThreshold}%</strong> of the round pool.</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-gray-400">Threshold:</span>
                <input type="number" min="1" max="99" value={autoCrashThreshold} onChange={(e) => setAutoCrashThreshold(Number(e.target.value))}
                  className="w-16 bg-[#0b0e14] border border-[#232b3b] rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 outline-none text-center" />
                <span className="text-[10px] text-gray-400">% of round pool</span>
              </div>
            </div>
            <button onClick={handleToggleAutoCrash} className={`shrink-0 w-14 h-7 rounded-full p-1 transition-all duration-300 ${autoCrashEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${autoCrashEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-[#151a23] border border-red-500/30 rounded-2xl p-5 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232b3b] pb-4">
              <div className="flex items-center gap-2"><Sliders className="w-4 h-4 text-red-400" /><h3 className="text-sm font-black text-white uppercase">Multiplier Control & Risk Override</h3></div>
              <div className="flex bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] text-xs font-bold gap-1">
                <button onClick={() => handleToggleMode('AUTOMATED')} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${controlMode === 'AUTOMATED' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Cpu className="w-3 h-3" /> AUTOMATED</button>
                <button onClick={() => handleToggleMode('OVERRIDE')} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${controlMode === 'OVERRIDE' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Sliders className="w-3 h-3" /> OVERRIDE</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <form onSubmit={handleSetForcedMultiplier} className="space-y-3 bg-[#0b0e14] p-4 rounded-xl border border-[#232b3b]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Force Next Round Target</h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${controlMode === 'OVERRIDE' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>{controlMode === 'OVERRIDE' ? '🔴 OVERRIDE ACTIVE' : '🟢 AUTOMATED'}</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.05" min="1.00" max="60.00" value={forcedMultiplier} onChange={(e) => setForcedMultiplier(Number(e.target.value))} disabled={controlMode !== 'OVERRIDE'} className="flex-1 bg-[#151a23] border border-[#232b3b] rounded-xl px-4 py-2 text-base font-mono font-bold text-amber-400 outline-none disabled:opacity-40" />
                  <button type="submit" disabled={controlMode !== 'OVERRIDE'} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shadow transition disabled:opacity-40">Set</button>
                </div>
              </form>
              <form onSubmit={handleSetRiskCap} className="space-y-3 bg-[#0b0e14] p-4 rounded-xl border border-[#232b3b]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Risk Alert Ceiling</h4>
                  <button type="button" onClick={() => setRiskCapEnabled(!riskCapEnabled)} className={`w-8 h-4 rounded-full p-0.5 transition ${riskCapEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition ${riskCapEnabled ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">₹</span>
                    <input type="number" step="1000" min="1000" value={riskCapCeiling} onChange={(e) => setRiskCapCeiling(Number(e.target.value))} className="w-full bg-[#151a23] border border-[#232b3b] rounded-xl pl-7 pr-4 py-2 text-base font-mono font-bold text-emerald-400 outline-none" /></div>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow transition">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LIVE FEED SECTION */}
      {activeSection === 'LIVE FEED' && (
        <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-3 bg-[#0b0e14] border-b border-[#232b3b] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white flex items-center gap-2"><Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> LIVE BET STREAM MONITOR</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b0e14] text-gray-400 uppercase font-bold sticky top-0 border-b border-[#232b3b] text-[10px]">
                <tr><th className="p-3">Player</th><th className="p-3">Type</th><th className="p-3">Bet ₹</th><th className="p-3">Target</th><th className="p-3">Cashed At</th><th className="p-3">Payout ₹</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#232b3b]">
                {(telemetry?.simulatedBets || []).concat(telemetry?.userBets || []).map((bet, i) => (
                  <tr key={i} className="hover:bg-[#0b0e14]/50">
                    <td className="p-3 font-sans font-bold text-white flex items-center gap-1.5"><span>{bet.avatar || '👤'}</span><span className="truncate max-w-[80px]">{bet.username}</span></td>
                    <td className="p-3"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${bet.personality === 'GAMBLER' ? 'bg-red-500/20 text-red-400 border-red-500/30' : bet.personality === 'AGGRESSIVE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : bet.personality === 'MODERATE' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{bet.personality || 'USER'}</span></td>
                    <td className="p-3 text-white font-bold">₹{Number(bet.betAmount).toFixed(0)}</td>
                    <td className="p-3 text-amber-400">{bet.targetMultiplier ? `${Number(bet.targetMultiplier).toFixed(2)}x` : 'Manual'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{bet.cashOutMultiplier ? `${Number(bet.cashOutMultiplier).toFixed(2)}x` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{bet.payoutAmount ? `₹${Number(bet.payoutAmount).toFixed(0)}` : '₹0'}</td>
                    <td className="p-3"><span className={`px-1.5 py-0.5 rounded font-sans font-bold text-[9px] border ${bet.status === 'CASHOUT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : bet.status === 'LOST' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{bet.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
