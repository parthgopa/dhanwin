import React, { useState, useEffect } from 'react';
import {
  X, User, Shield, Phone, Mail, Calendar, Wallet, ArrowDownLeft,
  ArrowUpRight, Gamepad2, Flame, Sparkles, CheckCircle2, XCircle,
  RefreshCw, TrendingUp, TrendingDown, EyeOff, UserCheck, Check, AlertTriangle
} from 'lucide-react';
import { superAdminAPI } from '../../services/api';

export const User360Modal = ({ isOpen, onClose, userId, onUserUpdated, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('BETS'); // 'BETS' | 'TRANSACTIONS'
  const [actionLoading, setActionLoading] = useState(false);
  const [txActionLoading, setTxActionLoading] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await superAdminAPI.getUser360(userId);
      setProfileData(res);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to load user 360 profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const handleToggleBlock = async () => {
    setActionLoading(true);
    try {
      const res = await superAdminAPI.toggleBlockUser(userId);
      if (showToast) showToast(res.message, 'success');
      setProfileData((prev) => prev ? { ...prev, user: { ...prev.user, isBlocked: res.isBlocked } } : prev);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleExclude = async () => {
    setActionLoading(true);
    try {
      const res = await superAdminAPI.toggleExcludeUser(userId);
      if (showToast) showToast(res.message, 'success');
      setProfileData((prev) => prev ? { ...prev, user: { ...prev.user, isExcludedFromStats: res.isExcludedFromStats } } : prev);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessTx = async (txId, action) => {
    setTxActionLoading(txId);
    try {
      const res = await superAdminAPI.processTransaction(txId, action, adminNote);
      if (showToast) showToast(res.message, 'success');
      setAdminNote('');
      fetchProfile();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setTxActionLoading(null);
    }
  };

  const user = profileData?.user;
  const summary = profileData?.summary;
  const unifiedBets = profileData?.unifiedBets || [];
  const transactions = profileData?.transactions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="bg-[#0f0921] border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#2b1b4a] flex items-center justify-between gap-3 bg-gradient-to-r from-[#180e33] to-[#0d071c] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-black font-black text-base shadow-lg shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">{user?.username || 'Loading Player...'}</h3>
                {user?.role === 'ADMIN' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/30">
                    ADMIN
                  </span>
                )}
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  user?.isBlocked ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {user?.isBlocked ? 'SUSPENDED / BLOCKED' : 'ACTIVE ACCOUNT'}
                </span>
                {user?.isExcludedFromStats && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                    TEST ACCOUNT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 font-mono mt-0.5 flex-wrap">
                <span>📱 {user?.phone || '—'}</span>
                {user?.email && <span>✉️ {user?.email}</span>}
                <span>📅 Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1d1238] hover:bg-white/10 text-gray-400 hover:text-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-gray-400 font-mono">Compiling 360 User Dossier...</p>
            </div>
          ) : (
            <>
              {/* Summary Metrics KPI Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-[#170e30] p-3 rounded-2xl border border-[#2b1b4a] space-y-0.5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Wallet Holding</span>
                  <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                    ₹{(summary?.walletBalance || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-[#170e30] p-3 rounded-2xl border border-[#2b1b4a] space-y-0.5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Total Deposited</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                    ₹{(summary?.totalDeposited || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-[#170e30] p-3 rounded-2xl border border-[#2b1b4a] space-y-0.5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Total Withdrawn</span>
                  <div className="text-lg sm:text-xl font-black text-blue-400 font-mono">
                    ₹{(summary?.totalWithdrawn || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border space-y-0.5 ${
                  (summary?.netPlayerProfit || 0) > 0
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}>
                  <span className="text-[10px] uppercase font-bold flex items-center justify-between">
                    <span>Player Net P&L</span>
                    {(summary?.netPlayerProfit || 0) > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </span>
                  <div className="text-lg sm:text-xl font-black font-mono">
                    {(summary?.netPlayerProfit || 0) > 0 ? `+₹${summary?.netPlayerProfit}` : `-₹${Math.abs(summary?.netPlayerProfit || 0)}`}
                  </div>
                </div>
              </div>

              {/* ── 🌟 PLAYER RETURN CONSISTENCY & DAILY RETENTION CARD 🌟 ── */}
              {profileData?.consistency && (
                <div className="bg-gradient-to-r from-[#1b0e36] via-[#120826] to-[#0d051c] border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2d1b52] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg shrink-0">
                        👑
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                            Player Return Consistency & Retention
                          </h4>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${profileData.consistency.tierColor}`}>
                            {profileData.consistency.tierBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono">
                          Measures daily player activity, visits, bets & consecutive retention streaks
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-black font-mono flex items-center gap-1">
                        <span>🔥 Streak:</span>
                        <span>{profileData.consistency.loginStreak || 1}d</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-black font-mono flex items-center gap-1">
                        <span>⭐ Best:</span>
                        <span>{profileData.consistency.maxLoginStreak || 1}d</span>
                      </span>
                    </div>
                  </div>

                  {/* 4 Consistency Metric Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-[#0b0417] p-2.5 rounded-xl border border-[#261545] space-y-0.5">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">7-Day Consistency</span>
                      <div className="text-sm sm:text-base font-black text-emerald-400">
                        {profileData.consistency.consistencyScore7d}%
                      </div>
                      <p className="text-[9px] text-gray-500">{profileData.consistency.activeDays7d} / 7 Days Active</p>
                    </div>

                    <div className="bg-[#0b0417] p-2.5 rounded-xl border border-[#261545] space-y-0.5">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">30-Day Consistency</span>
                      <div className="text-sm sm:text-base font-black text-amber-300">
                        {profileData.consistency.consistencyScore30d}%
                      </div>
                      <p className="text-[9px] text-gray-500">{profileData.consistency.activeDays30d} / 30 Days Active</p>
                    </div>

                    <div className="bg-[#0b0417] p-2.5 rounded-xl border border-[#261545] space-y-0.5">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">Total Active Days</span>
                      <div className="text-sm sm:text-base font-black text-purple-300">
                        {profileData.consistency.totalActiveDaysRecorded || 1} Days
                      </div>
                      <p className="text-[9px] text-gray-500">Recorded in Database</p>
                    </div>

                    <div className="bg-[#0b0417] p-2.5 rounded-xl border border-[#261545] space-y-0.5">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">Last Activity</span>
                      <div className="text-xs font-bold text-gray-200 truncate">
                        {profileData.consistency.lastActiveAt
                          ? new Date(profileData.consistency.lastActiveAt).toLocaleDateString()
                          : 'Today'}
                      </div>
                      <p className="text-[9px] text-gray-500">
                        {profileData.consistency.lastActiveAt
                          ? new Date(profileData.consistency.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Online'}
                      </p>
                    </div>
                  </div>

                  {/* 14-Day Activity Heatmap Matrix Strip */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold">
                      <span>14-Day Daily Return Heatmap (Past 2 Weeks)</span>
                      <span className="text-emerald-400">🟢 Active &bull; ⚪ Inactive</span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                      {(profileData.consistency.matrix14d || []).map((slot, idx) => (
                        <div
                          key={idx}
                          title={`${slot.date} (${slot.dayName}): ${slot.isActive ? 'Active on platform' : 'No visit'}`}
                          className={`rounded-xl p-1.5 text-center flex flex-col items-center justify-center border transition-all ${
                            slot.isActive
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20 scale-105'
                              : 'bg-[#080212] border-[#22123d] text-gray-600 opacity-60'
                          }`}
                        >
                          <span className="text-[8px] font-bold text-gray-400 uppercase">{slot.dayName}</span>
                          <span className="text-[10px] font-mono font-black">{slot.dayNumber}</span>
                          <div className={`w-2 h-2 rounded-full mt-0.5 ${slot.isActive ? 'bg-emerald-400 shadow shadow-emerald-400 animate-pulse' : 'bg-gray-700'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick User Action Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  disabled={actionLoading}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                    user?.isBlocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  } disabled:opacity-50`}
                >
                  {user?.isBlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{user?.isBlocked ? 'Unblock Player Account' : 'Block / Suspend Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleExclude}
                  disabled={actionLoading}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                    user?.isExcludedFromStats
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  } disabled:opacity-50`}
                >
                  {user?.isExcludedFromStats ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{user?.isExcludedFromStats ? 'Include in Stats (Real)' : 'Exclude from Stats (Test Mode)'}</span>
                </button>
              </div>

              {/* Sub-Tabs: Bets vs Financial Transactions */}
              <div className="border-t border-[#2b1b4a] pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setActiveTab('BETS')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      activeTab === 'BETS'
                        ? 'bg-amber-500 text-black shadow-lg font-black'
                        : 'bg-[#170e30] text-gray-400 hover:text-white border border-[#2b1b4a]'
                    }`}
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Unified Game Bets ({unifiedBets.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      activeTab === 'TRANSACTIONS'
                        ? 'bg-amber-500 text-black shadow-lg font-black'
                        : 'bg-[#170e30] text-gray-400 hover:text-white border border-[#2b1b4a]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Transactions & Payouts ({transactions.length})</span>
                  </button>
                </div>

                {/* ── 1. UNIFIED BETS TABLE ── */}
                {activeTab === 'BETS' && (
                  <div className="bg-[#0a0518] rounded-2xl border border-[#2b1b4a] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#140b2b] border-b border-[#2b1b4a] text-gray-400 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="p-3">Game / Type</th>
                            <th className="p-3">Bet Amount</th>
                            <th className="p-3">Multiplier</th>
                            <th className="p-3">Payout</th>
                            <th className="p-3">Result</th>
                            <th className="p-3">Placed Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e133a]">
                          {unifiedBets.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                                No bets recorded for this player yet.
                              </td>
                            </tr>
                          ) : (
                            unifiedBets.map((b) => (
                              <tr key={b.id} className="hover:bg-white/5 transition">
                                <td className="p-3 font-sans font-bold text-white">
                                  <div className="flex items-center gap-1.5">
                                    {b.game.includes('AVIATOR') ? (
                                      <Flame className="w-3.5 h-3.5 text-red-400" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    )}
                                    <span>{b.game}</span>
                                  </div>
                                  {b.target && <span className="text-[10px] text-gray-400 font-normal">{b.target}</span>}
                                </td>
                                <td className="p-3 font-black text-gray-200">₹{b.betAmount}</td>
                                <td className="p-3 font-bold text-amber-400">{b.multiplier ? `${b.multiplier}x` : '—'}</td>
                                <td className="p-3 font-black text-emerald-400">₹{Math.round(b.payoutAmount || 0)}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase ${
                                    b.status === 'WON' || b.status === 'CASHOUT'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-400 text-[10px] whitespace-nowrap">
                                  {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── 2. TRANSACTIONS & APPROVALS TABLE ── */}
                {activeTab === 'TRANSACTIONS' && (
                  <div className="space-y-3">
                    <div className="bg-[#0a0518] rounded-2xl border border-[#2b1b4a] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#140b2b] border-b border-[#2b1b4a] text-gray-400 uppercase font-bold text-[10px]">
                            <tr>
                              <th className="p-3">Type</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">UTR / Bank Details</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e133a]">
                            {transactions.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                                  No deposit or withdrawal requests found.
                                </td>
                              </tr>
                            ) : (
                              transactions.map((tx) => (
                                <tr key={tx._id} className="hover:bg-white/5 transition">
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                      tx.type === 'DEPOSIT'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="p-3 font-black text-amber-400 text-sm">
                                    ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-3 text-[11px] text-gray-300 font-mono">
                                    {tx.utrNumber || tx.paymentDetails?.upiId || tx.paymentDetails?.accountNumber || '—'}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                      tx.status === 'APPROVED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : tx.status === 'REJECTED'
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-400 text-[10px] whitespace-nowrap">
                                    {new Date(tx.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-3">
                                    {tx.status === 'PENDING' ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleProcessTx(tx._id, 'APPROVE')}
                                          disabled={txActionLoading === tx._id}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow"
                                        >
                                          {txActionLoading === tx._id ? '...' : 'Approve'}
                                        </button>
                                        <button
                                          onClick={() => handleProcessTx(tx._id, 'REJECT')}
                                          disabled={txActionLoading === tx._id}
                                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shadow"
                                        >
                                          {txActionLoading === tx._id ? '...' : 'Reject'}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 text-[10px]">Processed</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-[#2b1b4a] bg-[#0c0618] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#231540] hover:bg-[#32205a] text-xs font-bold text-white transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
