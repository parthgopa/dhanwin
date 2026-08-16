import React from 'react';
import { Flame, Sparkles, Gift, Award, Compass, User, ChevronRight, Volume2 } from 'lucide-react';
import dhanwinBannerImg from '../images/dhanwin-hero-banner.jpg';
import wingoImg from '../images/wingo-logo.png';
import aviatorImg from '../images/aviator-logo.png';
import chickenRoadImg from '../images/chicken-road.png';
import cricketImg from '../images/cricket-logo.jpeg';
import scrollWinImg from '../images/scroll-win-logo.jpeg';
import gorushImg from '../images/gorush-logo.jpeg';

export const HomePage = ({ onSelectGame, onOpenDeposit, onOpenAuth }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-20 font-sans">

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
              className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-[#0b0e14]/80 hover:bg-black text-white font-bold rounded-xl text-[10px] sm:text-xs border border-amber-400/40 backdrop-blur-md transition"
            >
              Deposit Funds
            </button>
          </div>
        </div>

        {/* Carousel Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <div className="w-5 h-1.5 rounded-full bg-amber-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* 2. DEPOSIT & WITHDRAWAL NOTICE BAR (Matching reference layout) */}
      <div className="bg-gradient-to-r from-[#1f103d] via-[#170e2d] to-[#1a0f35] border border-purple-500/30 rounded-2xl px-3.5 sm:px-5 py-2.5 flex items-center justify-between shadow-lg gap-3">
        <div className="flex items-center gap-2 overflow-hidden text-xs">
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-bold text-amber-300 shrink-0 text-[11px] sm:text-xs">
            【💰 Deposit & Withdrawal Notice】
          </span>
          <span className="text-gray-300 truncate text-[11px] sm:text-xs">
            Instant 24/7 UPI deposits (Min ₹1) & fast automated withdrawals (Min ₹110)!
          </span>
        </div>
        <button
          onClick={onOpenDeposit}
          className="shrink-0 px-3.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[11px] shadow hover:scale-105 active:scale-95 transition"
        >
          Details
        </button>
      </div>

      {/* 3. FEATURED GAMES (Rounded Image Tiles matching reference screenshot) */}
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

      {/* 3. REWARD BANNERS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

        {/* Daily Login Reward Card */}
        <div className="bg-gradient-to-r from-amber-900/30 via-[#151a23] to-[#151a23] border border-amber-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Daily Login Reward</span>
            <h3 className="text-lg font-black text-white">Claim Free Cash Awards</h3>
            <p className="text-xs text-gray-400">Log in every day to claim bonus wallet cash!</p>
            <button
              onClick={onOpenAuth}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold rounded-xl text-xs shadow transition active:scale-95"
            >
              Claim Now
            </button>
          </div>
          <Gift className="w-14 h-14 text-amber-400 shrink-0 opacity-80" />
        </div>

        {/* Limited Time Event Card */}
        <div className="bg-gradient-to-r from-purple-900/30 via-[#151a23] to-[#151a23] border border-purple-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Limited Time Event</span>
            <h3 className="text-lg font-black text-white">Fortune Wheel Spin</h3>
            <p className="text-xs text-gray-400">Spin the wheel to win up to ₹5,000 cash prizes!</p>
            <button
              onClick={onOpenAuth}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold rounded-xl text-xs shadow transition active:scale-95"
            >
              Claim Now
            </button>
          </div>
          <Award className="w-14 h-14 text-purple-400 shrink-0 opacity-80" />
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
          onClick={onOpenAuth}
          className="flex flex-col items-center gap-1 hover:text-white active:scale-95 transition"
        >
          <User className="w-5 h-5 text-blue-400" />
          <span>Account</span>
        </button>
      </div>

    </div>
  );
};

