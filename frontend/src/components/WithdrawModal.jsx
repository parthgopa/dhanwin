import React, { useState } from 'react';
import { X, Landmark, Clock, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── MINIMUM WITHDRAWAL AMOUNT CONFIGURATION ──────────────────────────────────────
export const MIN_WITHDRAWAL_AMOUNT = 110;

export const WithdrawModal = ({ isOpen, onClose }) => {
  const { user, updateBalance, showToast } = useAuth();
  const [amount, setAmount] = useState(MIN_WITHDRAWAL_AMOUNT);
  const [method, setMethod] = useState('UPI'); // 'UPI' or 'BANK'
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmitWithdrawal = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_WITHDRAWAL_AMOUNT) {
      showToast(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}`, 'error');
      return;
    }

    if (user && user.walletBalance < numAmount) {
      showToast(`Insufficient balance. Available: ₹${user.walletBalance}`, 'error');
      return;
    }

    if (method === 'UPI' && !upiId.trim()) {
      showToast('Please enter your UPI ID', 'error');
      return;
    }

    if (method === 'BANK' && (!accountNumber.trim() || !ifscCode.trim())) {
      showToast('Please enter Account Number and IFSC Code', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await walletAPI.withdraw({
        amount: numAmount,
        upiId: method === 'UPI' ? upiId : '',
        accountNumber: method === 'BANK' ? accountNumber : '',
        ifscCode: method === 'BANK' ? ifscCode : '',
        accountHolderName: method === 'BANK' ? accountHolderName : '',
      });

      updateBalance(res.newBalance);
      setSubmitted(true);
      showToast('Withdrawal request submitted! Processing time: 5-6 hours.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSubmitted(false);
    setAmount(MIN_WITHDRAWAL_AMOUNT);
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 shadow-2xl text-white">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Withdraw Funds</h3>
              <p className="text-xs text-gray-400">Min ₹{MIN_WITHDRAWAL_AMOUNT} | Fast Payout System</p>
            </div>
          </div>
          <button onClick={resetModal} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submitted ? (() => {
          const numAmount = Number(amount);
          const isMinValid = amount !== '' && numAmount >= MIN_WITHDRAWAL_AMOUNT;
          const isBalanceSufficient = user ? user.walletBalance >= numAmount : false;
          const accountAgeMs = user?.createdAt ? Date.now() - new Date(user.createdAt).getTime() : Infinity;
          const isAccount24hOld = accountAgeMs >= 24 * 60 * 60 * 1000;
          const hoursRemaining = !isAccount24hOld ? Math.ceil((24 * 60 * 60 * 1000 - accountAgeMs) / (60 * 60 * 1000)) : 0;
          const isAmountValid = isMinValid && isBalanceSufficient && isAccount24hOld;

          return (
            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">

              {/* 24-Hour Security Notice if newly registered */}
              {!isAccount24hOld && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-400 block">Security Lock: 24h Account Age</span>
                    <span>Withdrawals can only be requested after 24 hours of registration. Unlocks in approx <strong>{hoursRemaining} hour{hoursRemaining > 1 ? 's' : ''}</strong>.</span>
                  </div>
                </div>
              )}

              {/* Balance Notice */}
              <div className="flex items-center justify-between p-3 bg-[#0b0e14] border border-[#232b3b] rounded-xl text-xs">
                <span className="text-gray-400">Available Balance:</span>
                <span className="text-base font-bold text-emerald-400 font-mono">₹{user?.walletBalance || 0}</span>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Withdrawal Amount (Min ₹{MIN_WITHDRAWAL_AMOUNT})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-lg">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setAmount('');
                      } else {
                        const clean = val.replace(/[^0-9]/g, '');
                        setAmount(clean === '' ? '' : Number(clean));
                      }
                    }}
                    className={`w-full bg-[#0b0e14] border rounded-xl py-3 pl-8 pr-4 text-lg font-bold text-white outline-none transition ${amount !== '' && !isAmountValid ? 'border-red-500/80 focus:border-red-500' : 'border-[#232b3b] focus:border-emerald-500'
                      }`}
                    required
                  />
                </div>

                {/* Validation Warning Messages */}
                {amount !== '' && !isMinValid && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400 font-bold animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Minimum withdrawal amount is ₹{MIN_WITHDRAWAL_AMOUNT}</span>
                  </div>
                )}
                {amount !== '' && isMinValid && !isBalanceSufficient && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400 font-bold animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Insufficient balance (Available: ₹{user?.walletBalance || 0})</span>
                  </div>
                )}
              </div>

              {/* Method Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0b0e14] border border-[#232b3b] rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMethod('UPI')}
                  className={`py-2 rounded-lg transition ${method === 'UPI' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  UPI Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('BANK')}
                  className={`py-2 rounded-lg transition ${method === 'BANK' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Bank Transfer
                </button>
              </div>

              {/* Method Form Fields */}
              {method === 'UPI' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Your UPI ID (VPA)</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@paytm or user@ybl"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-white outline-none font-mono placeholder:text-gray-600"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Full Name as per bank"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="Bank Account No."
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono uppercase"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isAmountValid}
                className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${isAmountValid && !loading
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-black active:scale-[0.98]'
                    : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {!isAccount24hOld
                        ? `Withdrawals Unlock in ${hoursRemaining}h (24h Lock)`
                        : !isMinValid
                        ? `Enter min ₹${MIN_WITHDRAWAL_AMOUNT} to withdraw`
                        : !isBalanceSufficient
                          ? 'Insufficient Balance'
                          : `Request Withdrawal (₹${numAmount})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          );
        })() : (
          /* SUBMITTED SUCCESS STATE */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
              <Clock className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Withdrawal Request Submitted</h4>
              <p className="text-xs text-gray-400 mt-1">Amount: <strong className="text-emerald-400">₹{Math.round(amount)}</strong></p>
            </div>

            <div className="p-4 bg-[#0b0e14] border border-[#232b3b] rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-gray-400">Status:</span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-mono">
                  PENDING
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Target:</span>
                <span className="text-white font-mono">{method === 'UPI' ? upiId : `${accountNumber} (${ifscCode})`}</span>
              </div>
            </div>

            <button
              onClick={resetModal}
              className="w-full bg-[#232b3b] hover:bg-gray-800 text-white font-bold py-3 rounded-xl text-sm transition"
            >
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
