import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Wallet, Flame, Sparkles, Gamepad2,
  Calendar, RefreshCw, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, Filter, Layers, PieChart, Activity,
  Clock, ShieldCheck
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const GAME_OPTIONS = [
  { id: 'ALL', label: 'All Games (Consolidated)', icon: Layers, color: 'emerald' },
  { id: 'WINGO', label: 'WinGo (4 Rooms)', icon: Sparkles, color: 'amber' },
  { id: 'AVIATOR', label: 'Aviator', icon: Flame, color: 'red' },
  { id: 'CHICKEN_ROAD', label: 'Chicken Road 2', icon: Gamepad2, color: 'orange' },
];

const RANGE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

export const HouseProfitAnalytics = ({ showToast }) => {
  const [selectedGame, setSelectedGame] = useState('ALL');
  const [selectedRange, setSelectedRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getConsolidatedAnalytics({
        game: selectedGame,
        range: selectedRange,
        startDate: selectedRange === 'custom' ? customStartDate : '',
        endDate: selectedRange === 'custom' ? customEndDate : '',
      });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedRange, customStartDate, customEndDate, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    totalTurnover: 0,
    totalPayouts: 0,
    netHouseProfit: 0,
    overallMarginPercent: 0,
    totalBets: 0,
    totalRounds: 0,
  };

  const gameBreakdown = data?.gameBreakdown || [];
  const auditFeed = data?.auditFeed || [];

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      
      {/* ── 1. HEADER & FILTER BAR ────────────────────────────────────────── */}
      <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232b3b] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>House Profit & Financial Overview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  ALL-GAMES LEDGER
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Consolidated turnover, player payouts, and net house profit across all casino games
              </p>
            </div>
          </div>

          {/* Live Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#232b3b] hover:bg-[#323d53] active:scale-95 text-xs font-bold text-gray-200 transition shadow self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{loading ? 'Calculating...' : 'Refresh Metrics'}</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Game Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Game:
            </span>
            {GAME_OPTIONS.map((g) => {
              const isSelected = selectedGame === g.id;
              const GIcon = g.icon;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-950/50 font-black scale-105'
                      : 'bg-[#0b0e14] text-gray-400 hover:text-white border border-[#232b3b]'
                  }`}
                >
                  <GIcon className="w-3.5 h-3.5" />
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Range Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0b0e14] p-1.5 rounded-2xl border border-[#232b3b]">
            {RANGE_PRESETS.map((r) => {
              const isSelected = selectedRange === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRange(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-black shadow font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Custom Date Range Picker (shown when Custom is selected) */}
        {selectedRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#232b3b] animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0b0e14] border border-[#232b3b] text-white font-mono focus:border-emerald-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0b0e14] border border-[#232b3b] text-white font-mono focus:border-emerald-400 outline-none"
              />
            </div>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-black hover:brightness-110 active:scale-95 transition"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* ── 2. TOP SUMMARY METRIC CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Net House Profit */}
        <div className="bg-[#151a23] border border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden ring-1 ring-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">
              Net House Profit
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-mono font-black ${
              summary.netHouseProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {summary.netHouseProfit >= 0 ? '+' : ''}₹{Math.round(summary.netHouseProfit).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-300 font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                {Math.round(summary.overallMarginPercent)}% Margin
              </span>
              <span className="text-gray-400 text-[11px]">of turnover</span>
            </div>
          </div>
        </div>

        {/* Total Turnover (Gross Pool) */}
        <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              Total Bets Turnover
            </span>
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
              ₹{Math.round(summary.totalTurnover).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-bold">
              {summary.totalBets} total bets placed
            </div>
          </div>
        </div>

        {/* Total Player Payouts */}
        <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              Total Player Payouts
            </span>
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-blue-400">
              ₹{Math.round(summary.totalPayouts).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-bold">
              {summary.totalTurnover > 0 ? Math.round((summary.totalPayouts / summary.totalTurnover) * 100) : 0}% RTP paid out
            </div>
          </div>
        </div>

        {/* Completed Game Rounds */}
        <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              Completed Rounds
            </span>
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-purple-400">
              {summary.totalRounds}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-bold">
              Across active rooms
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. GAME-BY-GAME BREAKDOWN CARDS ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
            Per-Game Financial Performance & Retention
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gameBreakdown.map((g) => {
            const isWingo = g.gameId === 'WINGO';
            const isAviator = g.gameId === 'AVIATOR';

            return (
              <div
                key={g.gameId}
                className="bg-[#151a23] border border-[#232b3b] hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-4 transition"
              >
                <div className="flex items-center justify-between border-b border-[#232b3b] pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`p-2 rounded-xl ${
                      isWingo ? 'bg-amber-500/20 text-amber-400' :
                      isAviator ? 'bg-red-500/20 text-red-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isWingo ? <Sparkles className="w-4 h-4" /> : isAviator ? <Flame className="w-4 h-4" /> : <Gamepad2 className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white">{g.game}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">{g.totalRounds} Rounds · {g.totalBets} Bets</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                    {Math.round(g.marginPercent)}% Margin
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Turnover (Pool):</span>
                    <span className="text-amber-400 font-bold">₹{Math.round(g.turnover).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Player Payouts:</span>
                    <span className="text-blue-400 font-bold">₹{Math.round(g.payouts).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-sm font-black">
                    <span className="text-white">Net House Profit:</span>
                    <span className={g.houseProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {g.houseProfit >= 0 ? '+' : ''}₹{Math.round(g.houseProfit).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Visual Margin Progress Bar */}
                <div className="w-full bg-[#0b0e14] h-2 rounded-full overflow-hidden border border-[#232b3b]">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, g.marginPercent))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. RECENT ROUNDS SETTLEMENT AUDIT FEED ────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
              Live Settlement Audit Log (Latest Multi-Game Rounds)
            </h3>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">Real-time settlement stream</span>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#232b3b] bg-[#151a23] shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#0b0e14] text-gray-400 uppercase text-[10px] border-b border-[#232b3b]">
                <th className="p-3.5">Game</th>
                <th className="p-3.5">Round / Period</th>
                <th className="p-3.5">Outcome</th>
                <th className="p-3.5 text-right">Turnover</th>
                <th className="p-3.5 text-right">Payouts</th>
                <th className="p-3.5 text-right font-black text-emerald-400">House Profit</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232b3b] text-gray-200">
              {auditFeed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-sans">
                    No settled rounds recorded in this filter period.
                  </td>
                </tr>
              ) : (
                auditFeed.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5 font-sans font-bold">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                        row.game === 'WinGo'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {row.game} {row.mode ? `(${row.mode})` : ''}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-300 font-bold">{row.identifier}</td>
                    <td className="p-3.5 text-white font-sans font-bold">{row.outcome}</td>
                    <td className="p-3.5 text-right text-amber-400 font-bold">
                      ₹{Math.round(Number(row.turnover || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right text-blue-400 font-bold">
                      ₹{Math.round(Number(row.payout || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-black">
                      <span className={Number(row.houseProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {Number(row.houseProfit || 0) >= 0 ? '+' : ''}₹{Math.round(Number(row.houseProfit || 0)).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right text-gray-400 text-[11px]">
                      {new Date(row.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
