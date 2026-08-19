import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Shield, AlertTriangle, Users, TrendingUp, TrendingDown,
  Wallet, RefreshCw, EyeOff, Search, UserCheck, Check, X, Menu,
  Flame, Sparkles, DollarSign, Lock, Unlock, Radio, Calendar,
  ArrowUpRight, ArrowDownLeft, Sliders, LogOut, CheckCircle2,
  XCircle, BarChart2, ShieldAlert, Clock, AlertCircle, Award
} from 'lucide-react';
import { superAdminAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { User360Modal } from '../components/superadmin/User360Modal';

export const SuperAdminDashboard = ({ onNavigate }) => {
  const { user, logout, showToast } = useAuth();
  const socket = getSocket();

  // ── Navigation State ──────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('OVERVIEW');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // ── Overview & Telemetry State ───────────────────────────────────────────
  const [timeframe, setTimeframe] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── All Users State ──────────────────────────────────────────────────────
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterTab, setUserFilterTab] = useState('ALL'); // 'ALL' | 'BLOCKED' | 'EXCLUDED' | 'HIGH_BALANCE'
  const [userActionLoading, setUserActionLoading] = useState(null);

  // ── Selected User 360 Modal ──────────────────────────────────────────────
  const [selected360UserId, setSelected360UserId] = useState(null);

  // ── Global System Settings & Kill-Switch ─────────────────────────────────
  const [isWithdrawalDisabled, setIsWithdrawalDisabled] = useState(false);
  const [customMaintenanceMsg, setCustomMaintenanceMsg] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // ── Live Players State ───────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState({ totalOnline: 0, aviatorPlayers: 0, wingoPlayers: 0, liveUsers: [] });
  const [showLiveModal, setShowLiveModal] = useState(false);

  // ── Fetch Master Overview ─────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.getOverview({
        timeframe,
        startDate: customStartDate,
        endDate: customEndDate,
      });
      setOverviewData(res);
      setIsWithdrawalDisabled(!!res.systemStatus?.isWithdrawalDisabled);
      setCustomMaintenanceMsg(res.systemStatus?.withdrawalDisabledMessage || '');
    } catch (err) {
      showToast(err.message || 'Failed to fetch superadmin telemetry', 'error');
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStartDate, customEndDate, showToast]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await superAdminAPI.getUsers();
      setUsersList(res.users || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchUsers();
  }, [fetchOverview, fetchUsers]);

  // Real-Time Socket Connection, Live Telemetry & Risk Alerts
  useEffect(() => {
    socket.emit('admin:join_room');

    adminAPI.getLivePlayers().then((res) => {
      if (res?.success) setLiveStats(res);
    }).catch(() => {});

    const handleRiskAlert = (alertObj) => {
      showToast(alertObj.message || 'High-Risk Anomaly Detected!', 'error');
      fetchOverview();
    };

    const handleLivePlayersCount = (stats) => {
      if (stats) setLiveStats(stats);
    };

    socket.on('superad:risk_alert', handleRiskAlert);
    socket.on('admin:live_players_count', handleLivePlayersCount);

    const interval = setInterval(() => {
      adminAPI.getLivePlayers().then((res) => {
        if (res?.success) setLiveStats(res);
      }).catch(() => {});
    }, 4000);

    return () => {
      socket.off('superad:risk_alert', handleRiskAlert);
      socket.off('admin:live_players_count', handleLivePlayersCount);
      clearInterval(interval);
    };
  }, [socket, showToast, fetchOverview]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleBlock = async (userId) => {
    setUserActionLoading(userId);
    try {
      const res = await superAdminAPI.toggleBlockUser(userId);
      showToast(res.message, 'success');
      fetchUsers();
      fetchOverview();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleExclude = async (userId) => {
    setUserActionLoading(userId);
    try {
      const res = await superAdminAPI.toggleExcludeUser(userId);
      showToast(res.message, 'success');
      fetchUsers();
      fetchOverview();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleWithdrawals = async () => {
    setSettingsLoading(true);
    try {
      const res = await superAdminAPI.toggleWithdrawals({
        isWithdrawalDisabled: !isWithdrawalDisabled,
        withdrawalDisabledMessage: customMaintenanceMsg,
      });
      setIsWithdrawalDisabled(res.isWithdrawalDisabled);
      showToast(res.message, res.isWithdrawalDisabled ? 'info' : 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDismissRiskAlert = async (alertId) => {
    try {
      await superAdminAPI.dismissRiskAlert(alertId);
      showToast('Risk Alert Dismissed', 'info');
      fetchOverview();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const riskAlerts = overviewData?.riskAlerts || [];
  const financials = overviewData?.financials || {};
  const yesterdayPerf = overviewData?.yesterdayPerformance || {};
  const newUsersData = overviewData?.newUsers || {};
  const platformConsistency = overviewData?.platformConsistency || {};

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.phone || '').includes(userSearchQuery) ||
      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (userFilterTab === 'DAILY_VIP') return u.consistency?.loyaltyTier === 'DAILY_VIP';
    if (userFilterTab === 'FREQUENT') return u.consistency?.loyaltyTier === 'FREQUENT';
    if (userFilterTab === 'OCCASIONAL') return u.consistency?.loyaltyTier === 'OCCASIONAL';
    if (userFilterTab === 'DORMANT') return u.consistency?.loyaltyTier === 'DORMANT';
    if (userFilterTab === 'BLOCKED') return u.isBlocked;
    if (userFilterTab === 'EXCLUDED') return u.isExcludedFromStats;
    if (userFilterTab === 'HIGH_BALANCE') return (u.walletBalance || 0) >= 1000;
    return true;
  });

  const navItems = [
    { id: 'OVERVIEW', label: 'Executive Overview', icon: BarChart2 },
    { id: 'RISK_RADAR', label: 'Risk & Anomaly Radar', icon: ShieldAlert, badge: riskAlerts.length > 0 ? riskAlerts.length : null, badgeColor: 'red' },
    { id: 'NEW_USERS', label: 'New Signups Cohort', icon: Users, badge: newUsersData?.count > 0 ? newUsersData.count : null },
    { id: 'ALL_USERS', label: 'All Users 360', icon: Search },
    { id: 'YESTERDAY', label: 'Yesterday Winners & Cashouts', icon: Award },
    { id: 'SETTINGS', label: 'Withdrawal Kill-Switch', icon: Sliders, badge: isWithdrawalDisabled ? 'OFF' : null, badgeColor: 'red' },
  ];

  return (
    <div className="w-full h-screen h-[100dvh] overflow-hidden flex flex-col bg-[#070314] text-white font-sans select-none">
      
      {/* ── STANDALONE EXECUTIVE SUPER ADMIN HEADER ───────────────────────── */}
      <header className="bg-gradient-to-r from-[#12072e] via-[#0d0521] to-[#070314] border-b border-amber-500/30 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-2xl shrink-0">
        
        {/* Left: Mobile Drawer Trigger & Super Admin Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl bg-[#1e0f3d] hover:bg-[#2c1756] border border-amber-500/30 text-amber-300 transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSection('OVERVIEW')}
            className="flex items-center gap-2.5 text-left cursor-pointer hover:opacity-90 active:scale-95 transition group"
            title="Return to Super Admin Home"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-purple-600 flex items-center justify-center text-black shadow-xl border border-amber-300/40 shrink-0 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-300 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black text-white tracking-wider uppercase flex items-center gap-1.5 truncate">
                <span className="group-hover:text-amber-300 transition">DHANWIN</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-mono border border-amber-500/40">
                  SUPER ADMIN
                </span>
              </h1>
              <p className="text-[9px] text-amber-200/60 font-mono hidden lg:block truncate">
                Solvency Simulation, Risk Radar & Platform Kill-Switch
              </p>
            </div>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Live Online Badge */}
          <button
            onClick={() => setShowLiveModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition shadow animate-pulse cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono">{liveStats.totalOnline} <span className="hidden sm:inline">Live</span></span>
          </button>

          {/* Withdrawal Status Pill */}
          <button
            onClick={() => setActiveSection('SETTINGS')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow ${
              isWithdrawalDisabled
                ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isWithdrawalDisabled ? <Lock className="w-3.5 h-3.5 text-red-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isWithdrawalDisabled ? 'Withdrawals Paused' : 'Withdrawals Active'}</span>
          </button>

          {/* Exit to Casino or Admin */}
          <button
            onClick={() => (onNavigate ? onNavigate('admin') : (window.location.href = '/admin'))}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1d0e3b] hover:bg-[#2c1756] text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MOBILE HORIZONTAL SCROLL TABS BAR (iPhone & Mobile Screens) ──────── */}
      <div className="md:hidden bg-[#0c051f]/95 backdrop-blur-md border-b border-[#2b1b4a] px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0 sticky top-0 z-40 shadow-md">
        {navItems.map((item) => {
          const IIcon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsMobileDrawerOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg font-black scale-105'
                  : 'bg-[#180e33] border-[#2b1b4a] text-gray-300 hover:text-white'
              }`}
            >
              <IIcon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  item.badgeColor === 'red' ? 'bg-red-600 text-white animate-pulse' : 'bg-black text-amber-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── DESKTOP SUPER ADMIN SIDEBAR ─────────────────────────────────── */}
        <div className="w-64 shrink-0 border-r border-[#2b1b4a] bg-[#0c051d] flex flex-col py-4 gap-1 hidden md:flex overflow-y-auto">
          <p className="text-[9px] text-amber-300/70 uppercase tracking-widest font-extrabold px-4 pb-2">
            Executive Controls
          </p>

          {navItems.map((item) => {
            const IIcon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-purple-900/40 border-amber-400 text-amber-300 font-black'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <IIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                <span className="text-xs font-bold flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    item.badgeColor === 'red' ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Solvency Quick Metric Card in Sidebar */}
          <div className="mt-auto mx-3 p-3.5 rounded-2xl bg-gradient-to-b from-[#180e33] to-[#0d071c] border border-amber-500/30 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs font-black text-amber-300">
              <span>SOLVENCY RATIO</span>
              <span className="font-mono text-emerald-400">{financials.solvencyRatio || '100'}%</span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono space-y-1 bg-[#090412] p-2 rounded-xl border border-[#2b1b4a]">
              <div className="flex justify-between">
                <span>Player Float:</span>
                <span className="text-white font-bold">₹{(financials.totalPlayerLiabilities || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Realized P&L:</span>
                <span className="text-emerald-400 font-bold">₹{(financials.realizedHouseNetProfit || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE DRAWER ──────────────────────────────────────────────── */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-72 max-w-[85vw] bg-[#0c051d] h-full border-r border-[#2b1b4a] flex flex-col p-4 space-y-3 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#2b1b4a]">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-sm text-white uppercase">Super Admin Portal</span>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-[#1d0e3b] text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const IIcon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                        isActive
                          ? 'bg-amber-500 text-black font-black'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT SCROLL AREA ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6 space-y-5 max-w-full">

          {/* ── SECTION 1: 🚨 RISK & ANOMALY RADAR ───────────────────────── */}
          {activeSection === 'RISK_RADAR' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-950/60 via-[#180b26] to-[#0e071c] border border-red-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Risk & Anomaly Radar</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono border border-red-500/40">
                          {riskAlerts.length} ACTIVE ALERTS
                        </span>
                      </h2>
                      <p className="text-xs text-gray-400">
                        Automatic detection of players withdrawing high profits, high win-velocity, or active game overrides.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchOverview}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2b1442] hover:bg-[#3c1d5c] text-xs font-bold text-gray-200 transition"
                  >
                    Refresh Radar
                  </button>
                </div>
              </div>

              {riskAlerts.length === 0 ? (
                <div className="bg-[#0f0921] border border-[#2b1b4a] rounded-3xl p-12 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">All Clear! No suspicious anomalies detected.</h3>
                  <p className="text-xs text-gray-400">Platform earnings and withdrawal flows are operating within standard parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {riskAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className="bg-[#180b26] border border-red-500/40 hover:border-red-500 rounded-3xl p-5 shadow-2xl space-y-3 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-red-500/20 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                          </span>
                          <div>
                            <h4 className="text-sm font-black text-white">{alert.username}</h4>
                            <p className="text-[10px] text-gray-400 font-mono">{new Date(alert.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                          {alert.alertType}
                        </span>
                      </div>

                      <p className="text-xs text-red-200 bg-[#0b0414] p-3 rounded-xl border border-red-500/20 font-mono">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setSelected360UserId(alert.userId)}
                          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow"
                        >
                          🔍 Audit User 360
                        </button>
                        <button
                          onClick={() => handleDismissRiskAlert(alert._id)}
                          className="px-3 py-2 rounded-xl bg-[#2b1442] hover:bg-white/10 text-gray-300 text-xs font-bold transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 2: 📊 EXECUTIVE OVERVIEW & LOCKED VAULT SIMULATION ─── */}
          {activeSection === 'OVERVIEW' && (
            <div className="space-y-5">
              
              {/* 🌟 1. LOCKED VAULT SIMULATION CARD (Zero-Payout Scenario) 🌟 */}
              <div className="bg-gradient-to-r from-[#211142] via-[#160b2e] to-[#0b0517] border border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#361e61] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Locked Vault & Solvency Simulation</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
                          HYPOTHETICAL MAX PROFIT
                        </span>
                      </h2>
                      <p className="text-xs text-amber-200/70">
                        Calculates exact retained profit if all pending withdrawals are stopped & current player balances retained.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchOverview}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2b1442] hover:bg-[#3c1d5c] text-xs font-bold text-gray-200 transition shadow self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Recalculate</span>
                  </button>
                </div>

                {/* Simulated Formula Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0e061c] p-4 rounded-2xl border border-[#2b1b4a] space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">1. Realized House Profit</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ₹{(financials.realizedHouseNetProfit || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-gray-500">Deposits − Approved Withdrawals</p>
                  </div>

                  <div className="bg-[#0e061c] p-4 rounded-2xl border border-[#2b1b4a] space-y-1">
                    <span className="text-[10px] text-amber-400 uppercase font-bold">+ 2. Player Wallet Float</span>
                    <div className="text-xl font-black text-amber-400 font-mono">
                      ₹{(financials.totalPlayerLiabilities || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-gray-500">Total unwithdrawn user balances</p>
                  </div>

                  <div className="bg-[#0e061c] p-4 rounded-2xl border border-[#2b1b4a] space-y-1">
                    <span className="text-[10px] text-purple-400 uppercase font-bold">+ 3. Pending Withdrawals</span>
                    <div className="text-xl font-black text-purple-300 font-mono">
                      ₹{(financials.totalPendingWithdrawals || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-gray-500">Unprocessed payout queue</p>
                  </div>

                  <div className="bg-gradient-to-tr from-amber-500/20 to-purple-900/50 p-4 rounded-2xl border border-amber-500/60 space-y-1 shadow-lg shadow-amber-950/50">
                    <span className="text-[10px] text-amber-300 uppercase font-extrabold tracking-wider">
                      = Max Retained Vault Profit
                    </span>
                    <div className="text-2xl font-black text-amber-300 font-mono">
                      ₹{(financials.simulatedMaxRetainedProfit || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-amber-200/80 font-bold">100% Zero-Payout Retained Capital</p>
                  </div>
                </div>
              </div>

              {/* 2. Lifetime Multi-Game Performance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0f0921] p-5 rounded-3xl border border-[#2b1b4a] space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> WinGo House Profit
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{(overviewData?.casinoStats?.wingoProfit || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-gray-500">All 4 rooms combined</p>
                </div>

                <div className="bg-[#0f0921] p-5 rounded-3xl border border-[#2b1b4a] space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-400" /> Aviator & Chicken Profit
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{(overviewData?.casinoStats?.aviatorProfit || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-gray-500">Multiplier crash games</p>
                </div>

                <div className="bg-[#0f0921] p-5 rounded-3xl border border-[#2b1b4a] space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-purple-400" /> Platform House Edge
                  </span>
                  <div className="text-2xl font-black text-purple-300 font-mono">
                    {overviewData?.casinoStats?.marginPercent || 0}%
                  </div>
                  <p className="text-[10px] text-gray-500">Gross profit over total turnover</p>
                </div>
              </div>

              {/* ── 3. 🌟 PLAYER RETURN CONSISTENCY & RETENTION RADAR 🌟 ── */}
              <div className="bg-gradient-to-r from-[#170c2e] via-[#100624] to-[#080214] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b1b4a] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-black font-black text-2xl shadow-lg shrink-0">
                      👑
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Player Return Consistency & Daily Retention</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                          {platformConsistency?.stickinessRatio || 0}% STICKINESS
                        </span>
                      </h3>
                      <p className="text-xs text-gray-400">
                        Tracks how consistently players return to BhagyaWin every day, visit frequency, and loyalty tiers.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserFilterTab('DAILY_VIP');
                      setActiveSection('ALL_USERS');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Inspect Daily VIPs &rarr;</span>
                  </button>
                </div>

                {/* 4 Core Retention Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#090314] p-4 rounded-2xl border border-[#261545] space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Daily Active (DAU Today)</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {platformConsistency?.dauToday || 0} Players
                    </div>
                    <p className="text-[10px] text-gray-500">Active / visited in last 24h</p>
                  </div>

                  <div className="bg-[#090314] p-4 rounded-2xl border border-[#261545] space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Weekly Active (WAU 7D)</span>
                    <div className="text-2xl font-black text-amber-300 font-mono">
                      {platformConsistency?.wauLast7d || 0} Players
                    </div>
                    <p className="text-[10px] text-gray-500">Active at least 1 day in 7d</p>
                  </div>

                  <div className="bg-[#090314] p-4 rounded-2xl border border-[#261545] space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Avg 7D Return Rate</span>
                    <div className="text-2xl font-black text-purple-300 font-mono">
                      {platformConsistency?.avg7dConsistency || 0}%
                    </div>
                    <p className="text-[10px] text-gray-500">Platform average consistency</p>
                  </div>

                  <div className="bg-[#090314] p-4 rounded-2xl border border-[#261545] space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">DAU / WAU Ratio</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {platformConsistency?.stickinessRatio || 0}%
                    </div>
                    <p className="text-[10px] text-gray-500">Gaming stickiness benchmark</p>
                  </div>
                </div>

                {/* 4 Player Loyalty Tiers Breakdown Bar */}
                <div className="space-y-2 pt-2 border-t border-[#261545]">
                  <span className="text-[11px] text-gray-300 uppercase font-black tracking-wider">
                    Playerbase Consistency & Return Segmentation
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => {
                        setUserFilterTab('DAILY_VIP');
                        setActiveSection('ALL_USERS');
                      }}
                      className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-left transition hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-amber-300">
                        <span>👑 Daily VIPs</span>
                        <span className="text-base font-mono">{platformConsistency?.tierBreakdown?.dailyVip || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Active 5-7 days / week</p>
                    </button>

                    <button
                      onClick={() => {
                        setUserFilterTab('FREQUENT');
                        setActiveSection('ALL_USERS');
                      }}
                      className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 text-left transition hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                        <span>⚡ Frequent</span>
                        <span className="text-base font-mono">{platformConsistency?.tierBreakdown?.frequent || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Active 3-4 days / week</p>
                    </button>

                    <button
                      onClick={() => {
                        setUserFilterTab('OCCASIONAL');
                        setActiveSection('ALL_USERS');
                      }}
                      className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 text-left transition hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-blue-400">
                        <span>🎲 Occasional</span>
                        <span className="text-base font-mono">{platformConsistency?.tierBreakdown?.occasional || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Active 1-2 days / week</p>
                    </button>

                    <button
                      onClick={() => {
                        setUserFilterTab('DORMANT');
                        setActiveSection('ALL_USERS');
                      }}
                      className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 hover:border-red-400 text-left transition hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-red-400">
                        <span>💤 Churn Risk</span>
                        <span className="text-base font-mono">{platformConsistency?.tierBreakdown?.dormant || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">0 active days in past 7d</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 3: 👥 NEW USER SIGNUPS (COHORT DATE FILTER) ──────── */}
          {activeSection === 'NEW_USERS' && (
            <div className="space-y-4">
              <div className="bg-[#0f0921] border border-[#2b1b4a] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b1b4a] pb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>New Users Acquisition Cohort</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                        {newUsersData?.count || 0} JOINED
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400">Filter user registrations by exact timeframe</p>
                  </div>

                  {/* Timeframe Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1 bg-[#06020f] p-1 rounded-2xl border border-[#2b1b4a]">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'this_week', label: 'This Week' },
                      { id: 'this_month', label: 'This Month' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setTimeframe(id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          timeframe === id
                            ? 'bg-amber-500 text-black font-black shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* New Users Table */}
                <div className="bg-[#06020f] rounded-2xl border border-[#2b1b4a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#140b2b] border-b border-[#2b1b4a] text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3">Username</th>
                          <th className="p-3">Phone / Email</th>
                          <th className="p-3">Balance</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Joined Date</th>
                          <th className="p-3">Dossier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e133a]">
                        {(newUsersData?.users || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                              No new users registered in this timeframe ({timeframe}).
                            </td>
                          </tr>
                        ) : (
                          newUsersData.users.map((u) => (
                            <tr key={u._id} className="hover:bg-white/5 transition">
                              <td className="p-3 font-sans font-bold text-white">
                                {u.username}
                              </td>
                              <td className="p-3 text-gray-300">
                                <div>{u.phone}</div>
                                {u.email && <div className="text-[10px] text-gray-500">{u.email}</div>}
                              </td>
                              <td className="p-3 font-black text-amber-400">₹{Math.round(u.walletBalance || 0)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                  u.isBlocked ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}>
                                  {u.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td className="p-3 text-gray-400 text-[10px] whitespace-nowrap">
                                {new Date(u.createdAt).toLocaleDateString()} {new Date(u.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="p-3">
                                <button
                                  onClick={() => setSelected360UserId(u._id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition"
                                >
                                  🔍 View 360
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 4: 🔍 ALL USERS 360 INSPECTION ───────────────────── */}
          {activeSection === 'ALL_USERS' && (
            <div className="space-y-4">
              <div className="bg-[#0f0921] border border-[#2b1b4a] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search username, phone, or email..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#06020f] border border-[#2b1b4a] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#06020f] p-1 rounded-2xl border border-[#2b1b4a] text-xs font-bold flex-wrap">
                    {[
                      { id: 'ALL', label: `All (${usersList.length})` },
                      { id: 'DAILY_VIP', label: '👑 Daily VIP (5-7d)' },
                      { id: 'FREQUENT', label: '⚡ Frequent (3-4d)' },
                      { id: 'OCCASIONAL', label: '🎲 Casual (1-2d)' },
                      { id: 'DORMANT', label: '💤 Churn Risk (0d)' },
                      { id: 'HIGH_BALANCE', label: '> ₹1k Balance' },
                      { id: 'BLOCKED', label: 'Blocked' },
                      { id: 'EXCLUDED', label: 'Test Mode' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setUserFilterTab(id)}
                        className={`px-3 py-1.5 rounded-xl transition ${
                          userFilterTab === id
                            ? 'bg-amber-500 text-black font-black shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-[#06020f] rounded-2xl border border-[#2b1b4a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#140b2b] border-b border-[#2b1b4a] text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3">Username</th>
                          <th className="p-3">Contact</th>
                          <th className="p-3">Wallet Holding</th>
                          <th className="p-3">Return Consistency (7D Matrix)</th>
                          <th className="p-3">Stats Filter</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e133a]">
                        {filteredUsers.map((u) => (
                          <tr key={u._id} className="hover:bg-white/5 transition">
                            <td className="p-3 font-sans font-bold text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {u.isExcludedFromStats && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/40">
                                    TEST
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-gray-300">
                              <div>{u.phone}</div>
                              {u.email && <div className="text-[10px] text-gray-500">{u.email}</div>}
                            </td>
                            <td className="p-3 font-mono font-black text-amber-400 text-sm">
                              ₹{Math.round(u.walletBalance || 0).toLocaleString('en-IN')}
                            </td>
                            {/* Return Consistency & 7D Matrix Column */}
                            <td className="p-3 font-sans">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${u.consistency?.tierColor || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                    {u.consistency?.tierBadge || '🎲 Regular'}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-amber-300">
                                    🔥 {u.consistency?.loginStreak || 1}d Streak
                                  </span>
                                </div>

                                {/* 7-Day Dot Matrix */}
                                <div className="flex items-center gap-1">
                                  {(u.consistency?.matrix7d || []).map((slot, sIdx) => (
                                    <div
                                      key={sIdx}
                                      title={`${slot.date} (${slot.dayName}): ${slot.isActive ? 'Active on platform' : 'No visit'}`}
                                      className={`w-2.5 h-2.5 rounded-full transition ${
                                        slot.isActive
                                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                                          : 'bg-gray-800 border border-gray-700'
                                      }`}
                                    />
                                  ))}
                                  <span className="text-[9px] text-gray-400 font-mono ml-1">
                                    {u.consistency?.activeDays7d || 0}/7d ({u.consistency?.consistencyScore7d || 0}%)
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-sans">
                              <button
                                onClick={() => handleToggleExclude(u._id)}
                                disabled={userActionLoading === u._id}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition ${
                                  u.isExcludedFromStats
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                }`}
                              >
                                {u.isExcludedFromStats ? '🧪 Excluded' : '✅ Real Player'}
                              </button>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                u.isBlocked ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {u.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-3 font-sans">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelected360UserId(u._id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] shadow transition cursor-pointer"
                                >
                                  🔍 360 Dossier
                                </button>
                                <button
                                  onClick={() => handleToggleBlock(u._id)}
                                  disabled={userActionLoading === u._id}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    u.isBlocked ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                  }`}
                                >
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 5: 🏆 YESTERDAY'S TOP WINNERS & RISKS ───────────── */}
          {activeSection === 'YESTERDAY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0f0921] p-5 rounded-3xl border border-[#2b1b4a] space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-400" /> Yesterday Total Cashouts Claimed
                  </span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    ₹{(yesterdayPerf.totalCashoutsAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-gray-500">In-game winnings won by players yesterday</p>
                </div>

                <div className="bg-[#0f0921] p-5 rounded-3xl border border-[#2b1b4a] space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-blue-400" /> Yesterday Total Withdrawals Paid
                  </span>
                  <div className="text-2xl font-black text-blue-400 font-mono">
                    ₹{(yesterdayPerf.totalWithdrawalsAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-gray-500">Actual money approved and paid out yesterday</p>
                </div>
              </div>

              {/* Top Winners Leaderboard */}
              <div className="bg-[#0f0921] border border-[#2b1b4a] rounded-3xl p-5 sm:p-6 space-y-3">
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Yesterday Top Earning Players (Highest Net Profit)</span>
                </h3>

                <div className="bg-[#06020f] rounded-2xl border border-[#2b1b4a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#140b2b] border-b border-[#2b1b4a] text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3">Rank / Player</th>
                          <th className="p-3">Total Wagered</th>
                          <th className="p-3">Total Claimed</th>
                          <th className="p-3">Net Profit Won</th>
                          <th className="p-3">Bets Count</th>
                          <th className="p-3">Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e133a]">
                        {(yesterdayPerf.topWinners || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                              No players in net profit yesterday.
                            </td>
                          </tr>
                        ) : (
                          yesterdayPerf.topWinners.map((winner, idx) => (
                            <tr key={winner.userId} className="hover:bg-white/5 transition">
                              <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span>{winner.username}</span>
                              </td>
                              <td className="p-3 text-gray-300">₹{winner.totalBet}</td>
                              <td className="p-3 font-black text-amber-400">₹{winner.totalWon}</td>
                              <td className="p-3 font-black text-red-400 text-sm">
                                +₹{winner.netProfit}
                              </td>
                              <td className="p-3 text-gray-400">{winner.betsCount} bets</td>
                              <td className="p-3">
                                <button
                                  onClick={() => setSelected360UserId(winner.userId)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition"
                                >
                                  🔍 Audit 360
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 6: ⚙️ WITHDRAWAL KILL-SWITCH & PLATFORM SETTINGS ─── */}
          {activeSection === 'SETTINGS' && (
            <div className="space-y-5">
              <div className="bg-[#0f0921] border border-amber-500/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
                
                <div className="flex items-center gap-3 border-b border-[#2b1b4a] pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                      Global Withdrawal Kill-Switch & Maintenance Control
                    </h2>
                    <p className="text-xs text-gray-400">
                      Instantly halt all outgoing withdrawal requests platform-wide during audits, high-risk attacks, or gateway maintenance.
                    </p>
                  </div>
                </div>

                {/* Kill-Switch Control Card */}
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isWithdrawalDisabled
                    ? 'bg-red-950/30 border-red-500/60 shadow-lg shadow-red-950/40'
                    : 'bg-[#06020f] border-[#2b1b4a]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${isWithdrawalDisabled ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          {isWithdrawalDisabled ? '🛑 WITHDRAWALS CURRENTLY STOPPED / PAUSED' : '✅ WITHDRAWALS ARE ACTIVE & OPERATIONAL'}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400">
                        {isWithdrawalDisabled
                          ? 'All player withdrawal submissions are blocked. Users see the custom maintenance notice below.'
                          : 'Players can submit withdrawal requests normally subject to standard security rules.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleWithdrawals}
                      disabled={settingsLoading}
                      className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 shrink-0 ${
                        isWithdrawalDisabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      } disabled:opacity-50 active:scale-95 cursor-pointer`}
                    >
                      {settingsLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isWithdrawalDisabled ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Resume All Withdrawals</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Stop All Withdrawals (Emergency)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Custom Maintenance Notice Textarea */}
                <div className="space-y-2 bg-[#06020f] p-4 rounded-2xl border border-[#2b1b4a]">
                  <label className="block text-xs font-bold text-gray-300">
                    User-Facing Maintenance Message (Displayed in User Withdrawal Modal)
                  </label>
                  <textarea
                    rows={3}
                    value={customMaintenanceMsg}
                    onChange={(e) => setCustomMaintenanceMsg(e.target.value)}
                    placeholder="Enter custom maintenance message..."
                    className="w-full p-3 rounded-xl bg-[#0f0921] border border-[#2b1b4a] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleToggleWithdrawals}
                    disabled={settingsLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition"
                  >
                    Save Maintenance Message
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── USER 360 DOSSIER MODAL ─────────────────────────────────────────── */}
      <User360Modal
        isOpen={!!selected360UserId}
        onClose={() => setSelected360UserId(null)}
        userId={selected360UserId}
        onUserUpdated={() => {
          fetchOverview();
          fetchUsers();
        }}
        showToast={showToast}
      />

      {/* ── LIVE ACTIVE PLAYERS MODAL ───────────────────────────────────────── */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f0921] border border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b1b4a] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Live Online Players</span>
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
                className="p-1.5 rounded-xl bg-[#1d0e3b] hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {liveStats.liveUsers?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs font-mono">
                  No active sockets detected right now.
                </div>
              ) : (
                liveStats.liveUsers.map((u, i) => (
                  <div
                    key={u.socketId || i}
                    className="bg-[#06020f] p-3 rounded-xl border border-[#2b1b4a] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs shrink-0">
                        {u.username?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{u.username}</div>
                        {u.phone && <div className="text-[10px] text-gray-500 font-mono truncate">{u.phone}</div>}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
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
                ))
              )}
            </div>

            <div className="border-t border-[#2b1b4a] pt-2 flex justify-end shrink-0">
              <button
                onClick={() => setShowLiveModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#231540] hover:bg-[#32205a] text-xs font-bold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
