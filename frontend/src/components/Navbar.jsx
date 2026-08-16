import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Volume2, Shield, LogOut, PlusCircle,
  ArrowUpRight, User as UserIcon, History, Menu, X,
  Home, Sparkles, Plane, Bird, Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dhanwinLogo from '../images/dhanwin-logo.png';

export const Navbar = ({
  activeTab,
  setActiveTab,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenAuth,
  onOpenWalletDrawer,
  mobileMenuOpen: externalMobileMenuOpen,
  setMobileMenuOpen: externalSetMobileMenuOpen,
}) => {
  const { user, logout } = useAuth();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const isMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setMenuOpen = externalSetMobileMenuOpen !== undefined ? externalSetMobileMenuOpen : setInternalMobileMenuOpen;

  const balance = Number(user?.walletBalance ?? 0);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  return (
    <header className="bg-[#0e051f]/95 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40 shadow-2xl font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        
        {/* Left Section: Logo & Platform Branding */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            {/* Dhanwin Golden Brand Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg border border-amber-400/40 group-hover:scale-105 transition transform shrink-0 flex items-center justify-center bg-black/40">
              <img src={dhanwinLogo} alt="Dhanwin Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 uppercase font-serif">
                Dhanwin
              </span>
              <span className="block text-[8px] sm:text-[9px] font-bold text-amber-500/80 tracking-widest uppercase -mt-1">
                Official Casino
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Coin Balance, Deposit, Withdraw, Profile & Mobile Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {user ? (
            <>
              {/* REFERENCE COIN BALANCE PILL (Clickable to open side panel history) */}
              <div
                onClick={onOpenWalletDrawer}
                title="Click to view Previous Deposits & Withdrawals"
                className="flex items-center bg-[#151a23] border border-amber-500/40 hover:border-amber-400 rounded-full pl-2 sm:pl-2.5 pr-1 py-1 shadow-lg gap-1.5 sm:gap-2 cursor-pointer transition active:scale-95"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-black font-black text-[9px] sm:text-[10px] shadow">
                  ₹
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-extrabold text-white">
                  ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDeposit();
                  }}
                  title="Deposit Funds"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black flex items-center justify-center hover:scale-110 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </button>
              </div>

              {/* Action Buttons (Desktop Only) */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={onOpenDeposit}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>

                <button
                  onClick={onOpenWithdraw}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow transition"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                </button>

                {/* History Drawer Trigger */}
                <button
                  onClick={onOpenWalletDrawer}
                  title="Wallet & Transaction History"
                  className="p-2 rounded-xl bg-[#151a23] border border-[#232b3b] text-gray-300 hover:text-white hover:border-amber-500/50 transition flex items-center gap-1 text-xs font-bold"
                >
                  <History className="w-4 h-4 text-amber-400" />
                  <span className="hidden xl:inline">History</span>
                </button>
              </div>

              {/* Admin Link (Desktop) */}
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className="hidden md:flex items-center gap-1.5 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* USER PROFILE PILL */}
              <div
                onClick={onOpenWalletDrawer}
                title="Click to view Previous Deposits & Withdrawals"
                className="hidden lg:flex items-center gap-2 bg-[#151a23] border border-[#232b3b] hover:border-purple-500/50 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition"
              >
                <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-[10px]">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="font-bold text-gray-200">{user.username}</span>
              </div>

              {/* LOGOUT BUTTON (DESKTOP) */}
              <button
                onClick={logout}
                title="Logout"
                className="hidden sm:flex p-2 rounded-xl bg-[#151a23] border border-[#232b3b] text-gray-400 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold text-white border border-purple-500/40 hover:border-amber-400 bg-white/5 hover:bg-white/10 transition active:scale-95 shadow"
              >
                Login
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs shadow-lg transition flex items-center gap-1 active:scale-95"
              >
                <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Register</span>
              </button>
            </div>
          )}

          {/* ── MOBILE RIGHT SIDEBAR TOGGLE BUTTON (Visible on < md screens ONLY WHEN LOGGED IN) ── */}
          {user && (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="md:hidden p-2 rounded-xl bg-[#151a23] border border-[#232b3b] hover:border-amber-500/50 text-amber-400 flex items-center justify-center transition active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>

      {/* ── MOBILE RIGHT SIDEBAR DRAWER (PORTALED TO BODY TO PREVENT HEADER CLIPPING) ── */}
      {isMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex justify-end md:hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Container (Full 100vh) */}
          <div className="relative w-72 max-w-[85vw] bg-[#120826] border-l border-purple-500/30 h-full flex flex-col shadow-2xl z-10 animate-slideLeft text-white">
            
            {/* Header */}
            <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-[#0e051f] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow border border-amber-400/40 shrink-0 flex items-center justify-center bg-black/40">
                  <img src={dhanwinLogo} alt="Dhanwin Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider">Dhanwin</h4>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Menu & Options</span>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-10">
              
              {/* User Balance Card (If Logged In) */}
              {user ? (
                <div className="bg-[#0e051f] border border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Player: <strong className="text-white">{user.username}</strong>
                    </div>
                    {user.role === 'ADMIN' && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Balance</span>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenDeposit();
                      }}
                      className="py-2 px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Deposit</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenWithdraw();
                      }}
                      className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition active:scale-95"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Unauthenticated Separate Login and Register Buttons */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth('register');
                    }}
                    className="py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>
              )}

              {/* Navigation Menu */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider px-2">Games & Lobby</div>
                
                {[
                  { id: 'home', label: 'Casino Lobby', icon: Home, color: 'text-amber-400' },
                  { id: 'wingo', label: 'WinGo (30s / 1m / 3m / 5m)', icon: Sparkles, color: 'text-purple-400' },
                  { id: 'aviator', label: 'Aviator Crash', icon: Plane, color: 'text-red-400' },
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => handleNavClick(id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                      activeTab === id
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Financial Actions & History */}
              {user && (
                <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider px-2">Account & Ledger</div>
                  
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenWalletDrawer();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <History className="w-4 h-4 text-amber-400" />
                    <span>Previous Deposits & Withdrawals</span>
                  </button>

                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => handleNavClick('admin')}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Management Portal</span>
                    </button>
                  )}

                  {/* Inline Logout for Direct Accessibility */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center gap-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition mt-2 active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout Account</span>
                  </button>
                </div>
              )}

            </div>

            {/* Sticky Drawer Footer with Logout for Instant Access */}
            {user && (
              <div className="p-4 border-t border-purple-500/20 bg-[#0e051f] shrink-0">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-black flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </header>
  );
};
