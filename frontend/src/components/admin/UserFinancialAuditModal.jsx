import React, { useState, useEffect } from 'react';
import {
  X, User, Wallet, ArrowDownLeft, ArrowUpRight,
  Clock, CheckCircle2, XCircle, TrendingUp, Trophy,
  CreditCard, RefreshCw, AlertCircle, Sparkles, Flame
} from 'lucide-react';
import { adminAPI } from '../../services/api';

export const UserFinancialAuditModal = ({ isOpen, onClose, userId, initialTx, onProcessTx, showToast }) => {
  const [activeTab, setActiveTab] = useState('BETS_24H');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getUserFinancialProfile(userId);
        if (res.success) {
          setProfile(res);
        }
      } catch (err) {
        if (showToast) showToast(err.message || 'Failed to fetch user audit data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId, showToast]);

  if (!isOpen) return null;

  const summary = profile?.summary || {
    totalDepositsApproved: 0,
    totalWithdrawalsApproved: 0,
    pendingWithdrawals: 0,
    totalGameEarnings: 0,
    totalGameTurnover: 0,
    netPlayerProfit: 0,
  };

  const summary24h = profile?.last24hSummary || {
    turnover24h: 0,
    payout24h: 0,
    netProfit24h: 0,
    totalBetsCount: 0,
    wonBetsCount: 0,
  };

  const last24hBets = profile?.last24hBets || [];
  const user = profile?.user || initialTx?.userId || {};
  const deposits = profile?.deposits || [];
  const withdrawals = profile?.withdrawals || [];

  const handleAction = async (action) => {
    if (!initialTx?._id || !onProcessTx) return;
    try {
      setActionLoading(true);
      await onProcessTx(initialTx._id, action, adminNote);
      // Refresh profile after processing
      const res = await adminAPI.getUserFinancialProfile(userId);
      if (res.success) setProfile(res);
    } catch (err) {
      if (showToast) showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#151a23] border border-[#232b3b] rounded-3xl p-5 sm:p-6 shadow-2xl text-white flex flex-col overflow-hidden">
        
        {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-sans">{user.username || 'User Profile'}</h3>
                {user.isBlocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                    BLOCKED
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Phone: {user.phone || '—'} | Current Balance: <strong className="text-emerald-400">₹{Math.round(user.walletBalance || 0).toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. SCROLLABLE BODY ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 no-scrollbar">

          {/* ── ACTIVE TRANSACTION DECISION CARD (Tick & Cross Buttons for Quick Action) ── */}
          {initialTx && initialTx.status === 'PENDING' && (
            <div className="bg-[#0b0e14] border-2 border-amber-500/50 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${initialTx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {initialTx.type === 'DEPOSIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </span>
                  <div>
                    <span className="text-xs font-black text-white uppercase block">
                      Pending {initialTx.type} Request
                    </span>
                    <span className="text-[10px] text-gray-400">Review details & click Tick (✔) or Cross (✖)</span>
                  </div>
                </div>
                <span className="text-xl font-black text-amber-400 font-mono">₹{Math.round(initialTx.amount).toLocaleString('en-IN')}</span>
              </div>

              {/* Deposit UTR info or Withdrawal Target */}
              {initialTx.type === 'DEPOSIT' ? (
                <div className="bg-[#151a23] p-3 rounded-xl border border-[#232b3b] text-xs font-mono flex items-center justify-between">
                  <span className="text-gray-400">12-Digit UTR / Reference:</span>
                  <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {initialTx.utrNumber || 'No UTR Submitted'}
                  </span>
                </div>
              ) : (
                initialTx.paymentDetails && (
                  <div className="bg-[#151a23] p-3 rounded-xl border border-[#232b3b] text-xs font-mono space-y-1 text-gray-300">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Withdrawal Target Details:</div>
                    {initialTx.paymentDetails.upiId && <div>UPI ID: <strong className="text-emerald-400">{initialTx.paymentDetails.upiId}</strong></div>}
                    {initialTx.paymentDetails.accountNumber && <div>Bank A/C: <strong className="text-emerald-400">{initialTx.paymentDetails.accountNumber}</strong> ({initialTx.paymentDetails.ifscCode})</div>}
                    {initialTx.paymentDetails.accountHolderName && <div>A/C Holder: <strong className="text-white">{initialTx.paymentDetails.accountHolderName}</strong></div>}
                  </div>
                )
              )}

              <input
                type="text"
                placeholder="Admin Note / Ref No. (Optional)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-[#151a23] border border-[#232b3b] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-400"
              />

              {/* TICK (APPROVE) & CROSS (REJECT) ACTION BUTTONS */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => handleAction('APPROVE')}
                  disabled={actionLoading}
                  className="w-1/2 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>✔ APPROVE {initialTx.type}</span>
                </button>
                <button
                  onClick={() => handleAction('REJECT')}
                  disabled={actionLoading}
                  className="w-1/2 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5 text-white" />
                  <span>✖ REJECT {initialTx.type}</span>
                </button>
              </div>
            </div>
          )}

          {/* 24-HOUR BETTING AUDIT STRIP */}
          <div className="bg-gradient-to-r from-purple-950/40 via-[#0d131f] to-blue-950/40 border border-purple-500/30 rounded-2xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-2.5">
              <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Last 24 Hours Betting Activity (All Games)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                {summary24h.totalBetsCount} Bets Placed
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-xs font-mono text-center">
              <div className="bg-[#0b0e14] p-2 rounded-xl border border-[#232b3b]">
                <div className="text-[9px] text-gray-400 uppercase">24h Bet Volume</div>
                <div className="text-sm font-black text-white mt-0.5">₹{summary24h.turnover24h.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-[#0b0e14] p-2 rounded-xl border border-[#232b3b]">
                <div className="text-[9px] text-gray-400 uppercase">24h Total Won</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">₹{summary24h.payout24h.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-[#0b0e14] p-2 rounded-xl border border-[#232b3b]">
                <div className="text-[9px] text-gray-400 uppercase">24h Net P&L</div>
                <div className={`text-sm font-black mt-0.5 ${summary24h.netProfit24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary24h.netProfit24h >= 0 ? '+' : ''}₹{summary24h.netProfit24h.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-[#0b0e14] p-2 rounded-xl border border-[#232b3b]">
                <div className="text-[9px] text-gray-400 uppercase">Won / Total</div>
                <div className="text-sm font-black text-blue-400 mt-0.5">{summary24h.wonBetsCount} / {summary24h.totalBetsCount}</div>
              </div>
            </div>
          </div>

          {/* LIFETIME FINANCIAL TOTALS */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="bg-[#0b0e14] border border-[#232b3b] p-3 rounded-2xl">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> Approved Deposits
              </div>
              <div className="text-base font-black text-emerald-400 mt-1">
                ₹{summary.totalDepositsApproved.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-[#0b0e14] border border-[#232b3b] p-3 rounded-2xl">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" /> Approved Withdraws
              </div>
              <div className="text-base font-black text-blue-400 mt-1">
                ₹{summary.totalWithdrawalsApproved.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-[#0b0e14] border border-[#232b3b] p-3 rounded-2xl">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Lifetime Won
              </div>
              <div className="text-base font-black text-amber-400 mt-1">
                ₹{summary.totalGameEarnings.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* ── 3. TABS: 24H BETS | PREVIOUS WITHDRAWALS | PREVIOUS DEPOSITS ── */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-[#232b3b] pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('BETS_24H')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'BETS_24H'
                      ? 'bg-amber-500 text-black shadow font-black'
                      : 'bg-[#0b0e14] text-gray-400 hover:text-white border border-[#232b3b]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Last 24h Bets ({last24hBets.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('WITHDRAWALS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'WITHDRAWALS'
                      ? 'bg-blue-500 text-black shadow font-black'
                      : 'bg-[#0b0e14] text-gray-400 hover:text-white border border-[#232b3b]'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Withdrawals ({withdrawals.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('DEPOSITS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'DEPOSITS'
                      ? 'bg-emerald-500 text-black shadow font-black'
                      : 'bg-[#0b0e14] text-gray-400 hover:text-white border border-[#232b3b]'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Deposits ({deposits.length})</span>
                </button>
              </div>

              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
            </div>

            {/* TAB 1: LAST 24 HOURS BETS TABLE */}
            {activeTab === 'BETS_24H' && (
              <div className="space-y-2">
                {last24hBets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs bg-[#0b0e14] rounded-2xl border border-[#232b3b]">
                    No bets placed by this user in the last 24 hours.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {last24hBets.map((bet) => (
                      <div
                        key={bet._id}
                        className="bg-[#0b0e14] border border-[#232b3b] rounded-xl p-2.5 flex items-center justify-between text-xs font-mono hover:border-purple-500/40 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-[11px]">{bet.game}</span>
                            {bet.mode && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold text-[9px]">
                                {bet.mode}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border ${
                                bet.status === 'WON'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : bet.status === 'LOST'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {bet.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-sans">
                            {bet.details || 'Standard Bet'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-gray-400">Bet: <strong className="text-white">₹{bet.betAmount}</strong></span>
                            <span className="text-gray-400">➔</span>
                            <span className={`font-black ${bet.status === 'WON' ? 'text-emerald-400' : 'text-gray-400'}`}>
                              Payout: ₹{bet.payoutAmount}
                            </span>
                          </div>
                          <div className="text-[9px] text-gray-500 font-sans">
                            {new Date(bet.createdAt).toLocaleTimeString()} · {new Date(bet.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WITHDRAWALS TAB */}
            {activeTab === 'WITHDRAWALS' && (
              <div className="space-y-2">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs bg-[#0b0e14] rounded-2xl border border-[#232b3b]">
                    No withdrawal history recorded for this user.
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div
                      key={w._id}
                      className="bg-[#0b0e14] border border-[#232b3b] rounded-2xl p-3 flex items-center justify-between text-xs font-mono hover:border-blue-500/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-blue-400">₹{Math.round(w.amount).toLocaleString('en-IN')}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black font-sans border ${
                            w.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            w.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-sans">
                          Target: {w.paymentDetails?.upiId || `${w.paymentDetails?.accountNumber || ''} (${w.paymentDetails?.ifscCode || ''})`}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-gray-500 font-sans">
                        <div>{new Date(w.createdAt).toLocaleDateString()}</div>
                        <div>{new Date(w.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: DEPOSITS TAB */}
            {activeTab === 'DEPOSITS' && (
              <div className="space-y-2">
                {deposits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs bg-[#0b0e14] rounded-2xl border border-[#232b3b]">
                    No deposit history recorded for this user.
                  </div>
                ) : (
                  deposits.map((d) => (
                    <div
                      key={d._id}
                      className="bg-[#0b0e14] border border-[#232b3b] rounded-2xl p-3 flex items-center justify-between text-xs font-mono hover:border-emerald-500/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-emerald-400">₹{Math.round(d.amount).toLocaleString('en-IN')}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black font-sans border ${
                            d.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            d.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        {d.utrNumber && (
                          <div className="text-[11px] text-gray-400">
                            UTR: <span className="text-amber-400">{d.utrNumber}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-gray-500 font-sans">
                        <div>{new Date(d.createdAt).toLocaleDateString()}</div>
                        <div>{new Date(d.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
