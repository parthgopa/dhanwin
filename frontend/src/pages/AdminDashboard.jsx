import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, CheckCircle2, XCircle, Clock, Users, ArrowUpRight,
  ArrowDownLeft, RefreshCw, Flame, TrendingUp, AlertTriangle,
  Gamepad2, BarChart2, Wallet, Activity,
  ChevronRight, Zap, Star, Award, Radio, Sparkles, LogOut
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AviatorAdmin } from '../components/admin/AviatorAdmin';
import { ChickenRoadAdmin } from '../components/admin/ChickenRoadAdmin';
import { WinGoAdmin } from '../components/admin/WinGoAdmin';
import { HouseProfitAnalytics } from '../components/admin/HouseProfitAnalytics';
import { UserFinancialAuditModal } from '../components/admin/UserFinancialAuditModal';

// ── Game registry — add new games here ───────────────────────────────────────
const GAMES = [
  {
    id: 'WINGO',
    label: 'WinGo',
    icon: Sparkles,
    color: 'amber',
    status: 'LIVE',
    description: '4-Room Color & Number Prediction',
    bgClass: 'from-purple-950/60 to-[#151a23]',
    borderClass: 'border-purple-500/40',
    accentClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'AVIATOR',
    label: 'Aviator',
    icon: Flame,
    color: 'red',
    status: 'LIVE',
    description: 'Crash Multiplier Game',
    bgClass: 'from-red-950/60 to-[#151a23]',
    borderClass: 'border-red-500/40',
    accentClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    id: 'CHICKEN',
    label: 'Chicken Road 2',
    icon: Gamepad2,
    color: 'amber',
    status: 'LIVE',
    description: 'Mines & Obstacles',
    bgClass: 'from-amber-950/40 to-[#151a23]',
    borderClass: 'border-amber-500/30',
    accentClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'FORTUNE_GEMS',
    label: 'Fortune Gems 2',
    icon: Star,
    color: 'purple',
    status: 'SOON',
    description: 'Slots & Wheels',
    bgClass: 'from-purple-950/30 to-[#151a23]',
    borderClass: 'border-purple-500/20',
    accentClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 'LUCKY_8',
    label: 'Lucky 8 Ball',
    icon: Award,
    color: 'teal',
    status: 'SOON',
    description: 'PVP Table Game',
    bgClass: 'from-teal-950/30 to-[#151a23]',
    borderClass: 'border-teal-500/20',
    accentClass: 'text-teal-400',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
];

export const AdminDashboard = ({ onNavigate }) => {
  const { user, logout, showToast } = useAuth();
  const socket = getSocket();

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeGame, setActiveGame] = useState('WINGO');

  // ── Financial tabs ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('PENDING');

  // ── Data state ────────────────────────────────────────────────────────────
  const [pendingTx, setPendingTx] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  // ── User Audit Modal state ────────────────────────────────────────────────
  const [selectedAuditUser, setSelectedAuditUser] = useState(null);
  const [selectedAuditTx, setSelectedAuditTx] = useState(null);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchFinancials = useCallback(async (tab = activeTab) => {
    setLoading(true);
    try {
      // Always fetch pending transactions so count badge and pending list are always accurate
      const pendingRes = await adminAPI.getPendingTransactions();
      const pList = pendingRes.pendingTransactions || [];
      setPendingTx(pList);

      if (tab === 'WITHDRAWALS') {
        const res = await adminAPI.getAllTransactions('?type=WITHDRAWAL');
        setAllTx(res.transactions || []);
      } else if (tab === 'DEPOSITS') {
        const res = await adminAPI.getAllTransactions('?type=DEPOSIT');
        setAllTx(res.transactions || []);
      } else if (tab === 'ALL') {
        const res = await adminAPI.getAllTransactions();
        setAllTx(res.transactions || []);
      } else if (tab === 'USERS') {
        const res = await adminAPI.getUsers();
        setUsers(res.users || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  // Initial load and tab changes
  useEffect(() => {
    fetchFinancials(activeTab);
  }, [activeTab, activeGame, fetchFinancials]);

  // Real-Time Socket Connection & Live Pending Transaction Push
  useEffect(() => {
    socket.emit('admin:join_room');

    const handleNewTx = (data) => {
      if (data?.transaction) {
        setPendingTx((prev) => {
          if (prev.some((t) => t._id === data.transaction._id)) return prev;
          return [data.transaction, ...prev];
        });
        showToast(`New ${data.transaction.type} request of ₹${data.transaction.amount} received!`, 'info');
      }
    };

    const handleTxProcessed = (data) => {
      if (data?.transactionId) {
        setPendingTx((prev) => prev.filter((t) => t._id !== data.transactionId));
      }
    };

    socket.on('admin:new_transaction', handleNewTx);
    socket.on('admin:transaction_processed', handleTxProcessed);

    // Fast 3-second background polling fallback to guarantee pending transactions are always up to date
    const interval = setInterval(() => {
      adminAPI.getPendingTransactions().then((res) => {
        if (res?.pendingTransactions) {
          setPendingTx(res.pendingTransactions);
        }
      }).catch(() => {});
    }, 3000);

    return () => {
      socket.off('admin:new_transaction', handleNewTx);
      socket.off('admin:transaction_processed', handleTxProcessed);
      clearInterval(interval);
    };
  }, [socket, showToast]);

  // ── Admin socket emit handlers ────────────────────────────────────
  const handleProcess = async (transactionId, action) => {
    setActionLoading(transactionId);
    try {
      const res = await adminAPI.processTransaction(transactionId, action, adminNote);
      showToast(res.message, 'success');
      setAdminNote('');
      fetchFinancials(activeTab);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async (userId) => {
    try {
      const res = await adminAPI.toggleBlock(userId);
      showToast(res.message, 'success');
      fetchFinancials('USERS');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const selectedGame = GAMES.find(g => g.id === activeGame);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-[#0b0e14] text-white font-sans select-none">

      {/* ── DEDICATED STANDALONE ADMIN HEADER (NO REGULAR CASINO NAVBAR) ──── */}
      <header className="bg-[#0f131a] border-b border-[#232b3b] px-5 py-3 flex items-center justify-between gap-4 z-40 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg border border-red-400/40">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
              DHANWIN <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-mono border border-red-500/30">ADMIN MASTER</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">Platform Operations & Risk Control Center</p>
          </div>
        </div>

        {/* Right Admin Utilities */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate ? onNavigate('home') : (window.location.href = '/')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Exit to Casino</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151a23] border border-[#232b3b] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-gray-300 font-bold">{user?.username || 'Admin'}</span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR: Games Portal ─────────────────────────────────── */}
        <div className="w-52 shrink-0 border-r border-[#232b3b] bg-[#0b0e14] flex flex-col py-4 gap-1 hidden md:flex">
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold px-4 pb-2">Games Portal</p>

          {GAMES.map((game) => {
            const GIcon = game.icon;
            const isActive = activeGame === game.id;
            const isLive = game.status === 'LIVE';
            return (
              <button
                key={game.id}
                onClick={() => isLive && setActiveGame(game.id)}
                disabled={!isLive}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition rounded-none border-l-2 ${isActive
                  ? `bg-gradient-to-r ${game.bgClass} border-${game.color}-500 ${game.accentClass}`
                  : isLive
                    ? 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    : 'border-transparent text-gray-600 cursor-not-allowed'
                  }`}
              >
                <GIcon className={`w-4 h-4 shrink-0 ${isActive ? game.accentClass : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{game.label}</div>
                  <div className="text-[9px] text-gray-600 truncate">{game.description}</div>
                </div>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${game.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 text-gray-600 border-gray-700'
                  }`}>
                  {game.status}
                </span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="border-t border-[#232b3b] my-2" />
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold px-4 pb-2">Platform & Analytics</p>

          {[
            { id: 'HOUSE_PROFIT', label: 'House Profit & Analytics', icon: TrendingUp, tab: true },
            { id: 'FINANCIALS', label: 'Financials Ledger', icon: Wallet, tab: true },
            { id: 'PLAYERS', label: 'Players', icon: Users, tab: true },
          ].map(({ id, label, icon: LIcon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveGame(id);
                if (id === 'FINANCIALS') setActiveTab('PENDING');
                if (id === 'PLAYERS') setActiveTab('USERS');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition rounded-none border-l-2 ${activeGame === id
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <LIcon className="w-4 h-4 shrink-0" />
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-xs font-bold truncate">{label}</span>
                {id === 'FINANCIALS' && pendingTx.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse">
                    {pendingTx.length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT AREA ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── HOUSE PROFIT & CONSOLIDATED ANALYTICS PORTAL ─── */}
          {activeGame === 'HOUSE_PROFIT' && (
            <HouseProfitAnalytics showToast={showToast} />
          )}

          {/* ── WINGO PORTAL — delegated to WinGoAdmin component ─── */}
          {activeGame === 'WINGO' && (
            <WinGoAdmin socket={socket} showToast={showToast} />
          )}

          {/* ── AVIATOR PORTAL — delegated to AviatorAdmin component ─── */}
          {activeGame === 'AVIATOR' && (
            <AviatorAdmin socket={socket} showToast={showToast} />
          )}

          {/* ── CHICKEN ROAD PORTAL — delegated to ChickenRoadAdmin ── */}
          {activeGame === 'CHICKEN' && (
            <ChickenRoadAdmin socket={socket} showToast={showToast} />
          )}

          {/* ── COMING SOON GAMES ───────────────────────────────────────── */}
          {(activeGame === 'FORTUNE_GEMS' || activeGame === 'LUCKY_8') && (
            <div className="space-y-4">
              <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-12 text-center space-y-3">
                <Star className="w-14 h-14 text-purple-400 mx-auto opacity-60" />
                <h3 className="text-base font-bold text-white">{selectedGame?.label} — Admin Portal</h3>
                <p className="text-xs text-gray-400">This game is coming soon. Admin controls will appear here once the game engine is live.</p>
              </div>
            </div>
          )}

          {/* ── FINANCIALS PORTAL ───────────────────────────────────────── */}
          {activeGame === 'FINANCIALS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Financial Ledger & Payouts</h2>
                    <p className="text-xs text-gray-400">Manage manual deposit approvals and withdrawal payouts</p>
                  </div>
                </div>
                
                {/* Ledger Filter Tabs */}
                <div className="flex flex-wrap bg-[#0b0e14] p-1 rounded-2xl border border-[#232b3b] text-xs font-bold gap-1">
                  {[
                    { id: 'PENDING', label: `Pending Requests (${pendingTx.length})`, color: 'amber' },
                    { id: 'WITHDRAWALS', label: 'Withdrawals Only', color: 'blue' },
                    { id: 'DEPOSITS', label: 'Deposits Only', color: 'emerald' },
                    { id: 'ALL', label: 'All Transactions', color: 'purple' },
                  ].map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`px-3 py-1.5 rounded-xl transition ${
                        activeTab === id
                          ? `bg-${color}-500 text-black shadow font-black scale-105`
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 1. PENDING REQUESTS CARDS ── */}
              {activeTab === 'PENDING' && (
                pendingTx.length === 0 ? (
                  <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl p-12 text-center space-y-2 shadow-xl">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-base font-bold text-white">All Clear! No pending deposit or withdrawal requests.</h3>
                    <p className="text-xs text-gray-400">All user submissions have been processed.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingTx.map((tx) => (
                      <div
                        key={tx._id}
                        className="bg-[#151a23] border border-[#232b3b] hover:border-amber-500/50 rounded-3xl p-5 shadow-xl space-y-4 transition"
                      >
                        <div className="flex items-center justify-between border-b border-[#232b3b] pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`p-2 rounded-2xl ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {tx.type === 'DEPOSIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">{tx.type} REQUEST</h4>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">PENDING</span>
                              </div>
                              <p className="text-xs text-gray-300 font-sans mt-0.5">
                                User: <strong className="text-white">{tx.userId?.username || 'Player'}</strong> ({tx.userId?.phone || 'No phone'})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-amber-400 font-mono">₹{Math.round(tx.amount).toLocaleString('en-IN')}</span>
                            <span className="block text-[10px] text-gray-500">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Payment Target / UTR details */}
                        <div className="bg-[#0b0e14] p-3.5 rounded-2xl border border-[#232b3b] text-xs font-mono space-y-1.5">
                          {tx.type === 'DEPOSIT' ? (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">UTR / Reference:</span>
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono">{tx.utrNumber}</span>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs text-gray-300">
                              <div className="text-gray-400 font-sans border-b border-[#232b3b] pb-1 font-bold uppercase text-[10px]">Withdrawal Payout Details:</div>
                              {tx.paymentDetails?.upiId && <div>UPI ID: <strong className="text-emerald-400">{tx.paymentDetails.upiId}</strong></div>}
                              {tx.paymentDetails?.accountNumber && <div>Bank A/C: <strong className="text-emerald-400">{tx.paymentDetails.accountNumber}</strong> ({tx.paymentDetails.ifscCode})</div>}
                              {tx.paymentDetails?.accountHolderName && <div>A/C Holder: <strong className="text-white">{tx.paymentDetails.accountHolderName}</strong></div>}
                            </div>
                          )}
                        </div>

                        {/* Audit & Quick History Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAuditUser(tx.userId?._id || tx.userId);
                            setSelectedAuditTx(tx);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-500/30 text-purple-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span>🔍 View Player Profile, Total Earned & History</span>
                        </button>

                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Admin Note / Ref No. (Optional)"
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcess(tx._id, 'APPROVE')}
                              disabled={actionLoading === tx._id}
                              className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> APPROVE
                            </button>
                            <button
                              onClick={() => handleProcess(tx._id, 'REJECT')}
                              disabled={actionLoading === tx._id}
                              className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" /> REJECT
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── 2. TABLE VIEW (WITHDRAWALS / DEPOSITS / ALL) ── */}
              {activeTab !== 'PENDING' && (
                <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#0b0e14] border-b border-[#232b3b] text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          {['Player', 'Type', 'Amount', 'Target / UTR Info', 'Status', 'Date', 'Action'].map(h => (
                            <th key={h} className="p-3.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232b3b] text-gray-200">
                        {allTx.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500 font-sans">
                              No {activeTab.toLowerCase()} records found.
                            </td>
                          </tr>
                        ) : (
                          allTx.map((tx) => (
                            <tr key={tx._id} className="hover:bg-white/5 transition">
                              <td className="p-3.5 font-sans font-bold text-white">
                                {tx.userId?.username || 'Player'}
                                <span className="block text-[10px] text-gray-500 font-normal font-mono">{tx.userId?.phone || '—'}</span>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                                  tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono font-black text-amber-400 text-sm">
                                ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3.5 font-mono text-gray-300 text-[11px]">
                                {tx.utrNumber || tx.paymentDetails?.upiId || tx.paymentDetails?.accountNumber || '—'}
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                                  tx.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : tx.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-gray-400 text-[11px] font-sans">
                                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="p-3.5 font-sans">
                                <div className="flex items-center gap-1.5">
                                  {tx.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleProcess(tx._id, 'APPROVE')}
                                        disabled={actionLoading === tx._id}
                                        title="Approve Transaction"
                                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1 text-[11px] font-bold px-2"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>✔</span>
                                      </button>
                                      <button
                                        onClick={() => handleProcess(tx._id, 'REJECT')}
                                        disabled={actionLoading === tx._id}
                                        title="Reject Transaction"
                                        className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1 text-[11px] font-bold px-2"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>✖</span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedAuditUser(tx.userId?._id || tx.userId);
                                      setSelectedAuditTx(tx);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition flex items-center gap-1"
                                  >
                                    <span>🔍 Audit</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAYERS PORTAL ──────────────────────────────────────────── */}
          {activeGame === 'PLAYERS' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Registered Players</h2>
              </div>
              <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0b0e14] border-b border-[#232b3b] text-gray-400 uppercase font-bold text-[10px]">
                      <tr>
                        {['Username', 'Phone', 'Role', 'Wallet Balance', 'Status', 'Audit', 'Action'].map(h => (
                          <th key={h} className="p-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232b3b]">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-bold text-white font-sans">{u.username}</td>
                          <td className="p-3.5 text-gray-300">{u.phone}</td>
                          <td className="p-3.5 font-bold text-amber-400">{u.role}</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">₹{Math.round(u.walletBalance || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${u.isBlocked ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                              {u.isBlocked ? 'SUSPENDED' : 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans">
                            <button
                              onClick={() => {
                                setSelectedAuditUser(u._id);
                                setSelectedAuditTx(null);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition"
                            >
                              📊 Audit Profile
                            </button>
                          </td>
                          <td className="p-3.5 font-sans">
                            <button
                              onClick={() => handleToggleBlock(u._id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${u.isBlocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                            >
                              {u.isBlocked ? 'UNBLOCK' : 'BLOCK'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── USER FINANCIAL AUDIT MODAL ─────────────────────────────────────── */}
      <UserFinancialAuditModal
        isOpen={!!selectedAuditUser}
        onClose={() => {
          setSelectedAuditUser(null);
          setSelectedAuditTx(null);
        }}
        userId={selectedAuditUser}
        initialTx={selectedAuditTx}
        onProcessTx={async (id, action, note) => {
          await handleProcess(id, action, note);
          fetchFinancials(activeTab);
        }}
        showToast={showToast}
      />

    </div>
  );
};
