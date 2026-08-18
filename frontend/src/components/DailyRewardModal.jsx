import React, { useState, useEffect } from 'react';
import {
  X, Gift, Sparkles, CheckCircle2, Clock, Zap, Crown,
  Coins, Flame, Trophy, ArrowRight, RefreshCw, Star, ChevronRight
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DailyRewardModal = ({ isOpen, onClose }) => {
  const { user, updateBalance, showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [rewardData, setRewardData] = useState({
    canClaim: false,
    availableReward: 0,
    daysAccumulated: 0,
    nextClaimInSeconds: 0,
    lastDailyRewardClaim: null,
    totalDailyRewardsClaimed: 0,
  });
  const [claimedSuccess, setClaimedSuccess] = useState(null); // { amount, newBalance }
  const [countdown, setCountdown] = useState(0);

  // Fetch status on open
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getDailyRewardStatus();
      setRewardData(res);
      setCountdown(res.nextClaimInSeconds || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setClaimedSuccess(null);
      fetchStatus();
    }
  }, [isOpen]);

  // Live Countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (!rewardData.canClaim || claiming) return;
    setClaiming(true);
    try {
      const res = await walletAPI.claimDailyReward();
      updateBalance(res.newBalance);
      setClaimedSuccess({
        amount: res.claimedAmount,
        newBalance: res.newBalance,
      });
      showToast(`🎉 Claimed ₹${res.claimedAmount}.00 Daily Bonus!`, 'success');
      fetchStatus();
    } catch (err) {
      showToast(err.message || 'Failed to claim reward', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const daysLadder = [
    { day: 1, amount: 1, icon: '🪙', label: 'Day 1', desc: 'Starter Drop' },
    { day: 2, amount: 2, icon: '💰', label: 'Day 2', desc: 'Double Boost' },
    { day: 3, amount: 3, icon: '💎', label: 'Day 3', desc: 'Lucky Stack' },
    { day: 4, amount: 4, icon: '🔥', label: 'Day 4', desc: 'Mega Surge' },
    { day: 5, amount: 5, icon: '👑', label: 'Day 5+', desc: 'MAX JACKPOT', isMax: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#180e33] via-[#100824] to-[#080314] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl text-white overflow-hidden space-y-5">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2d1b54] pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-purple-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 border border-amber-300/50 animate-bounce">
              <Gift className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>DAILY BONUS VAULT</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
                  ₹1/DAY
                </span>
              </h3>
              <p className="text-xs text-amber-200/70 font-mono">
                Claim ₹1 daily &bull; Stacks up to ₹5 max if unclaimed!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#231545] hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 5-DAY GAME LADDER CARDS ── */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 relative z-10">
          {daysLadder.map((item) => {
            const isTarget = rewardData.canClaim && rewardData.availableReward === item.day;
            const isAccumulated = rewardData.canClaim && item.day <= rewardData.availableReward;

            return (
              <div
                key={item.day}
                className={`relative rounded-2xl p-2 sm:p-2.5 text-center flex flex-col items-center justify-between border transition-all duration-300 ${
                  item.isMax
                    ? 'bg-gradient-to-b from-amber-950/60 to-purple-950/80 border-amber-400 shadow-lg shadow-amber-500/20'
                    : isAccumulated
                    ? 'bg-gradient-to-b from-[#2a1752] to-[#160b2e] border-amber-400 shadow-md scale-105'
                    : 'bg-[#0f0721] border-[#291747] opacity-60'
                }`}
              >
                {item.isMax && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-red-500 text-black text-[8px] font-black tracking-widest uppercase shadow">
                    MAX
                  </span>
                )}

                <div className="text-base sm:text-xl my-1">{item.icon}</div>
                <div className="text-[10px] font-black text-white">{item.label}</div>
                <div className={`text-xs sm:text-sm font-black font-mono ${item.isMax ? 'text-amber-300' : 'text-amber-400'}`}>
                  +₹{item.amount}
                </div>

                {isAccumulated && (
                  <div className="mt-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center shadow">
                      ✓
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── MAIN CLAIM / STATUS ACTION BOX ── */}
        <div className="bg-gradient-to-b from-[#1b0e3b] to-[#0c051a] border-2 border-amber-500/40 rounded-3xl p-5 text-center space-y-4 relative z-10 shadow-2xl">
          
          {loading ? (
            <div className="py-8 space-y-2">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-gray-400 font-mono">Checking Daily Vault Drop...</p>
            </div>
          ) : claimedSuccess ? (
            /* 🌟 CELEBRATION CLAIM SUCCESS STATE 🌟 */
            <div className="py-4 space-y-3 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-white uppercase tracking-wider">
                  BONUS CREDITED TO WALLET!
                </h4>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  +₹{claimedSuccess.amount}.00
                </div>
                <p className="text-xs text-emerald-400 font-bold">
                  New Wallet Balance: ₹{claimedSuccess.newBalance}
                </p>
              </div>

              <div className="p-3 bg-[#080312] border border-[#2b1b4a] rounded-2xl text-xs text-gray-400 font-mono">
                Next free drop unlocks in 24 hours. Keep playing to level up!
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-[#2b1752] hover:bg-[#3c2173] text-white font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                Close & Play Now
              </button>
            </div>
          ) : rewardData.canClaim ? (
            /* 🎁 ACTIVE READY TO CLAIM STATE 🎁 */
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-400/90">
                  Ready To Claim
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-center justify-center gap-2">
                  <span className="text-amber-400">₹{rewardData.availableReward}.00</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                    {rewardData.availableReward === 1 ? '1 Day' : `${rewardData.availableReward} Days Staked`}
                  </span>
                </div>
                <p className="text-xs text-gray-300">
                  Instant free money added straight into your playable wallet balance.
                </p>
              </div>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-black font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {claiming ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-black" />
                    <span>Unlocking Vault Bonus...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 fill-amber-300 text-black" />
                    <span>CLAIM ₹{rewardData.availableReward}.00 FREE CASH</span>
                    <ArrowRight className="w-5 h-5 text-black" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ⏱️ LOCKED / COUNTDOWN TO NEXT DROP STATE ⏱️ */
            <div className="space-y-3 py-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">
                  Today's Bonus Already Claimed
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-widest">
                  {formatTime(countdown)}
                </div>
                <p className="text-xs text-gray-400">
                  Next daily drop unlocks when the countdown reaches zero.
                </p>
              </div>

              <button
                disabled
                className="w-full py-3.5 rounded-2xl bg-[#140b29] border border-[#2b1b4a] text-gray-500 font-black text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>Next Claim in {formatTime(countdown)}</span>
              </button>
            </div>
          )}

        </div>

        {/* Rules Footer */}
        <div className="text-[11px] text-gray-400 font-mono text-center pt-1 border-t border-[#231540] relative z-10 flex items-center justify-between">
          <span>🎁 Daily Drop: ₹1.00</span>
          <span>⚡ Max Accumulation: ₹5.00</span>
          <span>🛡️ 100% Real Cash</span>
        </div>

      </div>
    </div>
  );
};
