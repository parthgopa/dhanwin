import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Wallet, ArrowDownLeft, ArrowUpRight, Clock,
  CheckCircle2, XCircle, RefreshCw, PlusCircle,
  ShieldCheck, AlertCircle, Copy, Check
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const UserWalletDrawer = ({
  isOpen,
  onClose,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('WITHDRAWALS'); // 'WITHDRAWALS' | 'DEPOSITS'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await walletAPI.getTransactions();
      if (res.transactions) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Failed to load user transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, fetchTransactions]);

  if (!isOpen || typeof document === 'undefined') return null;

  const deposits = transactions.filter(t => t.type === 'DEPOSIT');
  const withdrawals = transactions.filter(t => t.type === 'WITHDRAWAL');

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Side Panel Drawer Container */}
      <div className="relative w-full max-w-md bg-[#120826] border-l border-purple-500/30 h-full flex flex-col shadow-2xl z-10 animate-slideLeft text-white">
        
        {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-[#0e051f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Wallet & History</h3>
              <p className="text-[11px] text-gray-400 font-mono">User: {user?.username} ({user?.phone || '—'})</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. BALANCE & QUICK ACTIONS ───────────────────────────────────── */}
        <div className="p-4 border-b border-[#232b3b] bg-gradient-to-br from-[#120e24] to-[#151a23] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              Current Available Balance
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Safe Wallet
            </span>
          </div>

          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            ₹{Number(user?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenDeposit();
              }}
              className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-black font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenWithdraw();
              }}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw (₹300 - ₹5,000)</span>
            </button>
          </div>
        </div>

        {/* ── 3. TABS NAVIGATION ───────────────────────────────────────────── */}
        <div className="flex p-2 bg-[#0b0e14] border-b border-[#232b3b] shrink-0 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'WITHDRAWALS'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdrawals ({withdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'DEPOSITS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Deposits ({deposits.length})</span>
          </button>
        </div>

        {/* ── 4. TRANSACTION LIST (SCROLLABLE) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          
          {/* WITHDRAWALS LIST */}
          {activeTab === 'WITHDRAWALS' && (
            withdrawals.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-40 text-blue-400" />
                <p>No withdrawal requests yet.</p>
              </div>
            ) : (
              withdrawals.map((tx) => (
                <div
                  key={tx._id}
                  className="bg-[#0b0e14] border border-[#232b3b] hover:border-blue-500/40 rounded-2xl p-3.5 space-y-2 transition shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                      <span className="text-base font-black font-mono text-white">
                        ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* STATUS PILL */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                      tx.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : tx.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                    }`}>
                      {tx.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 font-mono space-y-0.5 pt-1 border-t border-[#232b3b]">
                    {tx.paymentDetails?.upiId && (
                      <div>Target: <strong className="text-gray-200">{tx.paymentDetails.upiId}</strong></div>
                    )}
                    {tx.paymentDetails?.accountNumber && (
                      <div>Bank A/C: <strong className="text-gray-200">{tx.paymentDetails.accountNumber}</strong> ({tx.paymentDetails.ifscCode})</div>
                    )}
                    <div className="text-[10px] text-gray-500 font-sans">
                      {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {/* DEPOSITS LIST */}
          {activeTab === 'DEPOSITS' && (
            deposits.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
                <p>No deposit requests yet.</p>
              </div>
            ) : (
              deposits.map((tx) => (
                <div
                  key={tx._id}
                  className="bg-[#0b0e14] border border-[#232b3b] hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-2 transition shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                        <ArrowDownLeft className="w-4 h-4" />
                      </span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* STATUS PILL */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                      tx.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : tx.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                    }`}>
                      {tx.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 font-mono space-y-0.5 pt-1 border-t border-[#232b3b]">
                    {tx.utrNumber && (
                      <div>UTR / Ref: <span className="text-amber-400 font-bold">{tx.utrNumber}</span></div>
                    )}
                    <div className="text-[10px] text-gray-500 font-sans">
                      {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )
          )}

        </div>

      </div>
    </div>,
    document.body
  );
};
