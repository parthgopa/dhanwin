import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, CheckCircle2, XCircle, Clock, Users, ArrowUpRight,
  ArrowDownLeft, RefreshCw, Flame, TrendingUp, AlertTriangle,
  Gamepad2, BarChart2, Wallet, Activity,
  ChevronRight, Zap, Star, Award, Radio, Sparkles, LogOut,
  Sliders, EyeOff, Search, UserCheck, UserX, AlertCircle, ShieldAlert, Check, X
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AviatorAdmin } from '../components/admin/AviatorAdmin';
import { ChickenRoadAdmin } from '../components/admin/ChickenRoadAdmin';
import { WinGoAdmin } from '../components/admin/WinGoAdmin';
import { HouseProfitAnalytics } from '../components/admin/HouseProfitAnalytics';
import { UserFinancialAuditModal } from '../components/admin/UserFinancialAuditModal';

// ── Game registry ───────────────────────────────────────────────────────────
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

  // ── Live Players State ───────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState({
    totalOnline: 0,
    aviatorPlayers: 0,
    wingoPlayers: 0,
    liveUsers: [],
  });
  const [showLiveModal, setShowLiveModal] = useState(false);

  // ── Test Account Exclusion Filter State ──────────────────────────────────
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [testFilterTab, setTestFilterTab] = useState('ALL'); // 'ALL' | 'EXCLUDED' | 'INCLUDED'
  const [excludeLoading, setExcludeLoading] = useState(null);

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

      // Always fetch users so count and exclusion status are accessible
      const uRes = await adminAPI.getUsers();
      setUsers(uRes.users || []);

      if (tab === 'WITHDRAWALS') {
        const res = await adminAPI.getAllTransactions('?type=WITHDRAWAL');
        setAllTx(res.transactions || []);
      } else if (tab === 'DEPOSITS') {
        const res = await adminAPI.getAllTransactions('?type=DEPOSIT');
        setAllTx(res.transactions || []);
      } else if (tab === 'ALL') {
        const res = await adminAPI.getAllTransactions();
        setAllTx(res.transactions || []);
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

  // Real-Time Socket Connection, Live Pending Transactions & Live Players Stream
  useEffect(() => {
    socket.emit('admin:join_room');

    // Fetch initial live player telemetry
    adminAPI.getLivePlayers().then((res) => {
      if (res?.success) setLiveStats(res);
    }).catch(() => {});

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

    const handleLivePlayersCount = (stats) => {
      if (stats) setLiveStats(stats);
    };

    socket.on('admin:new_transaction', handleNewTx);
    socket.on('admin:transaction_processed', handleTxProcessed);
    socket.on('admin:live_players_count', handleLivePlayersCount);

    // Fast 3-second background polling fallback
    const interval = setInterval(() => {
      adminAPI.getPendingTransactions().then((res) => {
        if (res?.pendingTransactions) {
          setPendingTx(res.pendingTransactions);
        }
      }).catch(() => {});

      adminAPI.getLivePlayers().then((res) => {
        if (res?.success) setLiveStats(res);
      }).catch(() => {});
    }, 3000);

    return () => {
      socket.off('admin:new_transaction', handleNewTx);
      socket.off('admin:transaction_processed', handleTxProcessed);
      socket.off('admin:live_players_count', handleLivePlayersCount);
      clearInterval(interval);
    };
  }, [socket, showToast]);

  // ── Admin Action Handlers ─────────────────────────────────────────────────
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
      fetchFinancials(activeTab);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleExclude = async (userId) => {
    setExcludeLoading(userId);
    try {
      const res = await adminAPI.toggleAccountExclusion(userId);
      showToast(res.message, 'success');
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isExcludedFromStats: res.isExcludedFromStats } : u))
      );
      fetchFinancials(activeTab);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExcludeLoading(null);
    }
  };

  const excludedUsers = users.filter((u) => u.isExcludedFromStats);
  const excludedAccountsCount = excludedUsers.length;

  const filteredTestUsers = users.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      (u.phone || '').includes(testSearchQuery) ||
      (u.email || '').toLowerCase().includes(testSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (testFilterTab === 'EXCLUDED') return u.isExcludedFromStats;
    if (testFilterTab === 'INCLUDED') return !u.isExcludedFromStats;
    return true;
  });

  const selectedGame = GAMES.find((g) => g.id === activeGame);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-[#0b0e14] text-white font-sans select-none">

      {/* ── DEDICATED STANDALONE ADMIN HEADER ───────────────────────────────── */}
      <header className="bg-[#0f131a] border-b border-[#232b3b] px-4 sm:px-5 py-3 flex items-center justify-between gap-4 z-40 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg border border-red-400/40">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
              DHANWIN <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-mono border border-red-500/30">ADMIN MASTER</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono hidden sm:block">Platform Operations, Risk & Test Accounts Filter</p>
          </div>
        </div>

        {/* Live Online Users Badge & Admin Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Live Playing Users Header Pill */}
          <button
            onClick={() => setShowLiveModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition shadow animate-pulse cursor-pointer"
            title="Click to view live connected players"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-mono">{liveStats.totalOnline} Live Playing</span>
          </button>

          {/* Excluded Test Accounts Badge */}
          {excludedAccountsCount > 0 && (
            <button
              onClick={() => setActiveGame('TEST_ACCOUNTS')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition shadow"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>{excludedAccountsCount} Test Accounts Ignored</span>
            </button>
          )}

          <button
            onClick={() => (onNavigate ? onNavigate('home') : (window.location.href = '/'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit to Casino</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151a23] border border-[#232b3b] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
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

        {/* ── LEFT SIDEBAR: Games & Filter Portal ─────────────────────────── */}
        <div className="w-60 shrink-0 border-r border-[#232b3b] bg-[#0b0e14] flex flex-col py-3 gap-1 hidden md:flex overflow-y-auto">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold px-4 pb-1.5">Casino Games</p>

          {GAMES.map((game) => {
            const GIcon = game.icon;
            const isActive = activeGame === game.id;
            const isLive = game.status === 'LIVE';
            return (
              <button
                key={game.id}
                onClick={() => isLive && setActiveGame(game.id)}
                disabled={!isLive}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition rounded-none border-l-2 ${isActive
                  ? `bg-gradient-to-r ${game.bgClass} border-${game.color}-500 ${game.accentClass}`
                  : isLive
                    ? 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    : 'border-transparent text-gray-600 cursor-not-allowed'
                  }`}
              >
                <GIcon className={`w-4 h-4 shrink-0 ${isActive ? game.accentClass : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{game.label}</div>
                  <div className="text-[9px] text-gray-500 truncate">{game.description}</div>
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
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold px-4 pb-1.5">Operations & Filter</p>

          {[
            { id: 'HOUSE_PROFIT', label: 'House Profit & Analytics', icon: TrendingUp },
            { id: 'FINANCIALS', label: 'Financials Ledger', icon: Wallet },
            { id: 'PLAYERS', label: 'Registered Players', icon: Users },
            {
              id: 'TEST_ACCOUNTS',
              label: 'Filter Test Accounts',
              icon: Sliders,
              badge: excludedAccountsCount > 0 ? `${excludedAccountsCount} Ignored` : null,
              badgeColor: 'purple',
            },
          ].map(({ id, label, icon: LIcon, badge, badgeColor }) => (
            <button
              key={id}
              onClick={() => {
                setActiveGame(id);
                if (id === 'FINANCIALS') setActiveTab('PENDING');
                if (id === 'PLAYERS') setActiveTab('USERS');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition rounded-none border-l-2 ${activeGame === id
                ? id === 'TEST_ACCOUNTS'
                  ? 'bg-purple-950/40 border-purple-500 text-purple-300 font-black'
                  : 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <LIcon className={`w-4 h-4 shrink-0 ${id === 'TEST_ACCOUNTS' ? 'text-purple-400' : ''}`} />
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-xs font-bold truncate">{label}</span>
                {id === 'FINANCIALS' && pendingTx.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse">
                    {pendingTx.length}
                  </span>
                )}
                {badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {badge}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* ── Real-Time Live Players Widget ──────────────────────────────── */}
          <div className="mt-auto mx-3 p-3.5 rounded-2xl bg-gradient-to-b from-[#151a23] to-[#0d1117] border border-[#232b3b] space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE PLAYERS</span>
              </div>
              <span className="text-base font-mono font-black text-white">{liveStats.totalOnline}</span>
            </div>
            
            <div className="space-y-1.5 text-[11px] text-gray-400 font-mono bg-[#0b0e14] p-2 rounded-xl border border-[#232b3b]/60">
              <div className="flex justify-between items-center">
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Aviator:
                </span>
                <span className="text-white font-bold">{liveStats.aviatorPlayers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> WinGo:
                </span>
                <span className="text-white font-bold">{liveStats.wingoPlayers}</span>
              </div>
            </div>

            <button
              onClick={() => setShowLiveModal(true)}
              className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 shadow"
            >
              <Radio className="w-3 h-3" />
              <span>Inspect Live Users</span>
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── 1. TEST ACCOUNTS & PROFIT EXCLUSION FILTER PORTAL ─────────── */}
          {activeGame === 'TEST_ACCOUNTS' && (
            <div className="space-y-5">
              
              {/* Header & Overview Card */}
              <div className="bg-[#151a23] border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232b3b] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Sliders className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Test Accounts & Profit Exclusion Filter</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/40">
                          {excludedAccountsCount} EXCLUDED
                        </span>
                      </h2>
                      <p className="text-xs text-gray-400">
                        Mark test, demo, or developer accounts to exclude their bets, turnover, and wins from platform profit analytics.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchFinancials(activeTab)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#232b3b] hover:bg-[#323d53] text-xs font-bold text-gray-200 transition shadow self-start md:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
                    <span>Refresh Accounts</span>
                  </button>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0b0e14] p-4 rounded-2xl border border-[#232b3b] space-y-1">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Total Accounts</div>
                    <div className="text-2xl font-black text-white font-mono">{users.length}</div>
                    <p className="text-[10px] text-gray-500">Registered platform accounts</p>
                  </div>

                  <div className="bg-[#1e0f2b]/80 p-4 rounded-2xl border border-purple-500/40 space-y-1 shadow-lg shadow-purple-950/40">
                    <div className="text-[10px] text-purple-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> Excluded (Test Accounts)
                    </div>
                    <div className="text-2xl font-black text-purple-300 font-mono">{excludedAccountsCount}</div>
                    <p className="text-[10px] text-purple-300/70">Bets ignored from house profit & stats</p>
                  </div>

                  <div className="bg-[#081f14]/80 p-4 rounded-2xl border border-emerald-500/40 space-y-1 shadow-lg shadow-emerald-950/40">
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Real Players (Included)
                    </div>
                    <div className="text-2xl font-black text-emerald-300 font-mono">{users.length - excludedAccountsCount}</div>
                    <p className="text-[10px] text-emerald-300/70">Actively tracked in platform turnover</p>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      placeholder="Search by username, phone, or email..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0b0e14] border border-[#232b3b] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-2xl border border-[#232b3b] text-xs font-bold w-full sm:w-auto">
                    {[
                      { id: 'ALL', label: `All (${users.length})` },
                      { id: 'EXCLUDED', label: `Excluded (${excludedAccountsCount})` },
                      { id: 'INCLUDED', label: `Included (${users.length - excludedAccountsCount})` },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setTestFilterTab(id)}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition ${
                          testFilterTab === id
                            ? 'bg-purple-600 text-white font-black shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTestUsers.length === 0 ? (
                  <div className="col-span-full bg-[#151a23] border border-[#232b3b] rounded-3xl p-12 text-center space-y-2">
                    <Search className="w-12 h-12 text-gray-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">No accounts found matching your query</h3>
                    <p className="text-xs text-gray-400">Try changing your search terms or filter selection.</p>
                  </div>
                ) : (
                  filteredTestUsers.map((u) => {
                    const isExcluded = u.isExcludedFromStats;
                    const isProcessing = excludeLoading === u._id;

                    return (
                      <div
                        key={u._id}
                        className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 shadow-xl ${
                          isExcluded
                            ? 'bg-[#180d24] border-purple-500/60 shadow-purple-950/40'
                            : 'bg-[#151a23] border-[#232b3b] hover:border-gray-600'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {u.role === 'ADMIN' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/30">
                                    ADMIN
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                📱 {u.phone || 'No phone'}
                              </p>
                              {u.email && (
                                <p className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]">
                                  ✉️ {u.email}
                                </p>
                              )}
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${
                                isExcluded
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isExcluded ? '🧪 EXCLUDED' : '✅ INCLUDED'}
                            </span>
                          </div>

                          <div className="bg-[#0b0e14] p-3 rounded-2xl border border-[#232b3b] flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">Wallet Balance:</span>
                            <span className="text-amber-400 font-black text-sm">
                              ₹{Math.round(u.walletBalance || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleToggleExclude(u._id)}
                            disabled={isProcessing}
                            className={`w-full py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                              isExcluded
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50'
                            } disabled:opacity-50`}
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : isExcluded ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Include in Stats & Profits</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4" />
                                <span>Exclude Bets from Stats (Mark as Test)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAuditUser(u._id);
                              setSelectedAuditTx(null);
                            }}
                            className="w-full py-1.5 bg-[#0b0e14] hover:bg-white/5 border border-[#232b3b] text-gray-300 hover:text-white rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Audit Bets & Transactions</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
                                {tx.userId?.isExcludedFromStats && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                    TEST
                                  </span>
                                )}
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
                            placeholder="Add admin note (optional)..."
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#0b0e14] border border-[#232b3b] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleProcess(tx._id, 'APPROVE')}
                              disabled={actionLoading === tx._id}
                              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{actionLoading === tx._id ? 'Processing...' : 'Approve'}</span>
                            </button>
                            <button
                              onClick={() => handleProcess(tx._id, 'REJECT')}
                              disabled={actionLoading === tx._id}
                              className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{actionLoading === tx._id ? 'Processing...' : 'Reject'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── 2. TRANSACTION LOG TABLE ── */}
              {activeTab !== 'PENDING' && (
                <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#0b0e14] border-b border-[#232b3b] text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          {['Player', 'Type', 'Amount', 'Reference / Details', 'Status', 'Date', 'Action'].map(h => (
                            <th key={h} className="p-3.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232b3b]">
                        {allTx.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500 font-sans">
                              No records found for this view.
                            </td>
                          </tr>
                        ) : (
                          allTx.map((tx) => (
                            <tr key={tx._id} className="hover:bg-white/5 transition">
                              <td className="p-3.5 font-sans font-bold text-white">
                                <div className="flex items-center gap-1.5">
                                  <span>{tx.userId?.username || 'Player'}</span>
                                  {tx.userId?.isExcludedFromStats && (
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                                      TEST
                                    </span>
                                  )}
                                </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Registered Players</h2>
                </div>

                <button
                  onClick={() => setActiveGame('TEST_ACCOUNTS')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition shadow"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Manage Test / Excluded Accounts ({excludedAccountsCount})</span>
                </button>
              </div>

              <div className="bg-[#151a23] border border-[#232b3b] rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0b0e14] border-b border-[#232b3b] text-gray-400 uppercase font-bold text-[10px]">
                      <tr>
                        {['Username', 'Phone / Email', 'Role', 'Wallet Balance', 'Stats Filter', 'Account Status', 'Audit', 'Action'].map(h => (
                          <th key={h} className="p-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232b3b]">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-bold text-white font-sans">
                            <div className="flex items-center gap-1.5">
                              <span>{u.username}</span>
                              {u.isExcludedFromStats && (
                                <span className="text-[8px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/40 font-bold">
                                  TEST
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300">
                            <div>{u.phone}</div>
                            {u.email && <div className="text-[10px] text-gray-500">{u.email}</div>}
                          </td>
                          <td className="p-3.5 font-bold text-amber-400">{u.role}</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">₹{Math.round(u.walletBalance || 0).toLocaleString('en-IN')}</td>
                          
                          {/* Test / Real Account Toggle */}
                          <td className="p-3.5 font-sans">
                            <button
                              onClick={() => handleToggleExclude(u._id)}
                              disabled={excludeLoading === u._id}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border flex items-center gap-1 transition ${
                                u.isExcludedFromStats
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                              }`}
                            >
                              {u.isExcludedFromStats ? '🧪 Excluded (Test)' : '✅ Included (Real)'}
                            </button>
                          </td>

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

      {/* ── LIVE ACTIVE PLAYERS MODAL ───────────────────────────────────────── */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#151a23] border border-emerald-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[#232b3b] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Live Connected Players</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                      {liveStats.totalOnline} ONLINE
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Aviator: <strong className="text-red-400">{liveStats.aviatorPlayers}</strong> | WinGo: <strong className="text-amber-400">{liveStats.wingoPlayers}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLiveModal(false)}
                className="p-2 rounded-xl bg-[#0b0e14] hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {liveStats.liveUsers?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs font-mono">
                  No active sockets detected right now.
                </div>
              ) : (
                liveStats.liveUsers.map((u, i) => (
                  <div
                    key={u.socketId || i}
                    className="bg-[#0b0e14] p-3.5 rounded-2xl border border-[#232b3b] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                        {u.username?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {u.phone && <span className="text-[10px] text-gray-500 font-mono">({u.phone})</span>}
                        </div>
                        {u.email && <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${
                          u.game === 'AVIATOR'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : u.game === 'WINGO'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-gray-800 text-gray-300 border-gray-700'
                        }`}
                      >
                        {u.game}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#232b3b] pt-3 flex justify-end">
              <button
                onClick={() => setShowLiveModal(false)}
                className="px-5 py-2 rounded-xl bg-[#232b3b] hover:bg-[#323d53] text-xs font-bold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
