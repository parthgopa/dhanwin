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
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const balance = Number(user?.walletBalance ?? 0);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
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
                  ₹{Math.round(balance).toLocaleString('en-IN')}
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
                  className="hidden sm:flex px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold items-center gap-1 shadow transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}

              {/* Logout (Desktop) */}
              <button
                onClick={logout}
                title="Logout"
                className="hidden sm:flex p-2 rounded-xl bg-[#151a23] border border-[#232b3b] text-gray-400 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-black font-extrabold px-4 py-2 rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <UserIcon className="w-4 h-4" />
                <span>Login / Register</span>
              </button>
            </div>
          )}

          {/* ── MOBILE RIGHT SIDEBAR TOGGLE BUTTON (Visible on < md screens) ── */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="md:hidden p-2 rounded-xl bg-[#151a23] border border-[#232b3b] hover:border-amber-500/50 text-amber-400 flex items-center justify-center transition active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* ── MOBILE RIGHT SIDEBAR DRAWER (PORTALED TO BODY TO PREVENT HEADER CLIPPING) ── */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex justify-end md:hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
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
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              
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
                      ₹{Math.round(balance).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenDeposit();
                      }}
                      className="py-2 px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Deposit</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenWithdraw();
                      }}
                      className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Login / Register</span>
                </button>
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
                      setMobileMenuOpen(false);
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
                </div>
              )}

            </div>

            {/* Footer / Logout */}
            {user && (
              <div className="p-4 border-t border-purple-500/20 bg-[#0e051f] shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-black flex items-center justify-center gap-2 transition"
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

