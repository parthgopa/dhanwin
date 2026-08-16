import React from 'react';
import { Flame, Sparkles, Gift, Award, Compass, User, ChevronRight, Volume2, ShieldCheck, ArrowDownLeft, ArrowUpRight, AlertCircle, Zap } from 'lucide-react';
import dhanwinBannerImg from '../images/dhanwin-hero-banner.jpg';
import wingoImg from '../images/wingo-logo.png';
import aviatorImg from '../images/aviator-logo.png';
import chickenRoadImg from '../images/chicken-road.png';
import cricketImg from '../images/cricket-logo.jpeg';
import scrollWinImg from '../images/scroll-win-logo.jpeg';
import gorushImg from '../images/gorush-logo.jpeg';

export const HomePage = ({ onSelectGame, onOpenDeposit, onOpenAuth, onOpenSidebar }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-3.5 sm:space-y-4 pb-36 sm:pb-24 font-sans">

      {/* 1. OFFICIAL DHANWIN HERO IMAGE BANNER (Compact & Uncropped) */}
      <div className="space-y-1.5 max-w-3xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-500/30 shadow-2xl bg-[#120824] group w-full">
          {/* Main Hero Graphic Image - Proportional compact fit */}
          <img
            src={dhanwinBannerImg}
            alt="Welcome to Dhanwin - Play Smarter, Win Bigger"
            className="w-full h-auto max-h-[220px] sm:max-h-[260px] md:max-h-[300px] object-contain block mx-auto transform transition duration-700 group-hover:scale-[1.01]"
          />

          {/* Quick Play CTA Overlay Button */}
          <div className="absolute bottom-2 left-2 sm:bottom-3.5 sm:left-4 flex gap-2">
            <button
              onClick={() => onSelectGame('wingo')}
              className="px-3 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black rounded-xl text-[10px] sm:text-xs shadow-xl uppercase tracking-wider transition transform active:scale-95 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 fill-black" />
              <span>Play Now</span>
            </button>
            <button
              onClick={onOpenDeposit}
              className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-[#0b0e14]/80 hover:bg-black text-white font-bold rounded-xl text-[10px] sm:text-xs border border-amber-400/40 backdrop-blur-md transition active:scale-95"
            >
              Deposit Funds
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEPOSIT & WITHDRAWAL NOTICE TICKER */}
      <div className="bg-gradient-to-r from-[#1f103d] via-[#170e2d] to-[#1a0f35] border border-purple-500/30 rounded-2xl px-3.5 sm:px-5 py-2.5 flex items-center justify-between shadow-lg gap-3">
        <div className="flex items-center gap-2 overflow-hidden text-xs">
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-bold text-amber-300 shrink-0 text-[11px] sm:text-xs">
            【💰 Notice】
          </span>
          <span className="text-gray-300 truncate text-[11px] sm:text-xs">
            UPI Deposits (Min ₹100) added in 5-6 hours. Withdrawals (Min ₹300, Max ₹5,000)!
          </span>
        </div>
        <button
          onClick={onOpenDeposit}
          className="shrink-0 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[11px] shadow hover:scale-105 active:scale-95 transition"
        >
          Deposit
        </button>
      </div>

      {/* 3. OFFICIAL DEPOSIT & WITHDRAWAL NOTICE CARD */}
      <div className="bg-gradient-to-br from-[#130926] via-[#0f071f] to-[#160c2b] border border-purple-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-black text-white text-xs sm:text-sm uppercase tracking-wide">
              Official Deposit & Withdrawal Notice
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            24/7 Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Deposit Info Pill */}
          <div className="bg-[#1a0e36]/70 border border-purple-500/20 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-amber-400 text-xs">UPI & QR Deposit</div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Minimum Deposit is <strong>₹100</strong> with <strong>0% fee</strong>.
              </p>
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10.5px] text-amber-300 font-bold leading-tight">
                📌 Note: Deposit will be verified & added to your account in <strong>5-6 hours</strong> after submitting the correct 12-digit UTR.
              </div>
            </div>
          </div>

          {/* Withdrawal Info Pill */}
          <div className="bg-[#1a0e36]/70 border border-purple-500/20 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-emerald-400 text-xs">Fast Automated Withdrawal</div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Withdrawal Range: <strong>₹300 – ₹5,000</strong> directly to Bank Account or UPI. Secure payout with 24h account verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FEATURED GAMES (Rounded Image Tiles matching reference screenshot) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Golden Diamond Emblem */}
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 flex items-center justify-center shadow">
              <span className="text-black font-black text-xs">❖</span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              Featured Games
            </h2>
          </div>
        </div>

        {/* Responsive Grid of Rounded Image Game Cards (All with Identical Aspect Ratio & UI) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3.5">

          {/* 1. WINGO (CLICKABLE) */}
          <div
            onClick={() => onSelectGame('wingo')}
            className="group cursor-pointer aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#160e29] border border-purple-500/30 hover:border-amber-400 shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center relative p-0.5"
          >
            <img
              src={wingoImg}
              alt="WinGo"
              className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
            />
          </div>

          {/* 2. AVIATOR (CLICKABLE) */}
          <div
            onClick={() => onSelectGame('aviator')}
            className="group cursor-pointer aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#1a0c10] border border-red-500/30 hover:border-red-400 shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center relative p-0.5"
          >
            <img
              src={aviatorImg}
              alt="Aviator"
              className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
            />
          </div>

          {/* 3. CHICKEN ROAD (COMING SOON) */}
          <div
            className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#161208] border border-yellow-500/20 shadow-xl relative flex items-center justify-center select-none cursor-not-allowed opacity-75 pointer-events-none p-0.5"
          >
            <img
              src={chickenRoadImg}
              alt="Chicken Road"
              className="w-full h-full object-contain filter grayscale-[15%]"
            />
            {/* Light white text overlay */}
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-2 text-center">
              <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-wide">
                Coming Soon
              </span>
            </div>
          </div>

          {/* 4. CRICKET (COMING SOON) */}
          <div
            className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0c1824] border border-blue-500/20 shadow-xl relative flex items-center justify-center select-none cursor-not-allowed opacity-75 pointer-events-none p-0.5"
          >
            <img
              src={cricketImg}
              alt="Cricket"
              className="w-full h-full object-contain filter grayscale-[15%]"
            />
            {/* Light white text overlay */}
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-2 text-center">
              <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-wide">
                Coming Soon
              </span>
            </div>
          </div>

          {/* 5. SCROLL WIN (COMING SOON) */}
          <div
            className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#1e1308] border border-amber-500/20 shadow-xl relative flex items-center justify-center select-none cursor-not-allowed opacity-75 pointer-events-none p-0.5"
          >
            <img
              src={scrollWinImg}
              alt="Scroll Win"
              className="w-full h-full object-contain filter grayscale-[15%]"
            />
            {/* Light white text overlay */}
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-2 text-center">
              <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-wide">
                Coming Soon
              </span>
            </div>
          </div>

          {/* 6. GO RUSH (COMING SOON) */}
          <div
            className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#1f0a14] border border-pink-500/20 shadow-xl relative flex items-center justify-center select-none cursor-not-allowed opacity-75 pointer-events-none p-0.5"
          >
            <img
              src={gorushImg}
              alt="Go Rush"
              className="w-full h-full object-contain filter grayscale-[15%]"
            />
            {/* Light white text overlay */}
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-2 text-center">
              <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-wide">
                Coming Soon
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. BOTTOM DOCK MOBILE NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#151a23]/95 backdrop-blur-lg border-t border-[#232b3b] px-6 py-2.5 flex items-center justify-around text-xs font-bold text-gray-400">
        <button
          onClick={() => onSelectGame('home')}
          className="flex flex-col items-center gap-1 text-amber-400 active:scale-95 transition"
        >
          <Compass className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectGame('wingo')}
          className="flex flex-col items-center gap-1 hover:text-white active:scale-95 transition"
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>WinGo</span>
        </button>

        <button
          onClick={() => onSelectGame('aviator')}
          className="flex flex-col items-center gap-1 hover:text-white active:scale-95 transition"
        >
          <Flame className="w-5 h-5 text-red-500" />
          <span>Aviator</span>
        </button>

        <button
          onClick={onOpenSidebar || onOpenAuth}
          className="flex flex-col items-center gap-1 hover:text-white active:scale-95 transition"
        >
          <User className="w-5 h-5 text-blue-400" />
          <span>Account</span>
        </button>
      </div>

    </div>
  );
};

