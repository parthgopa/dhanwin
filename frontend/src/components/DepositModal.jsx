import React, { useState } from 'react';
import { X, QrCode, ArrowRight, CheckCircle2, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── MINIMUM DEPOSIT AMOUNT CONFIGURATION ────────────────────────────────────────
export const MIN_DEPOSIT_AMOUNT = 100;

export const DepositModal = ({ isOpen, onClose }) => {
  const { showToast } = useAuth();
  const [step, setStep] = useState(1); // 1: Amount input, 2: Scan QR & Submit UTR, 3: Success
  const [amount, setAmount] = useState(MIN_DEPOSIT_AMOUNT);
  const [utrNumber, setUtrNumber] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_DEPOSIT_AMOUNT) {
      showToast(`Minimum deposit amount is ₹${MIN_DEPOSIT_AMOUNT}`, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await walletAPI.getDepositQR(numAmount);
      setQrData(res);
      setStep(2);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUTR = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    const cleanUTR = utrNumber.trim().replace(/[^0-9]/g, '');

    if (!cleanUTR || cleanUTR.length !== 12) {
      showToast('Please enter the exact 12-digit numeric UTR / Reference Number from your payment receipt.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await walletAPI.submitUTR(numAmount, cleanUTR);
      setStep(3);
      if (res.autoApproved) {
        showToast(`Payment Verified! ₹${numAmount} credited to your wallet!`, 'success');
      } else {
        showToast('UTR submitted successfully! Status: PENDING Verification.', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUPI = () => {
    if (qrData?.upiId) {
      navigator.clipboard.writeText(qrData.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetModal = () => {
    setStep(1);
    setAmount(MIN_DEPOSIT_AMOUNT);
    setUtrNumber('');
    setQrData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Deposit Funds</h3>
              <p className="text-xs text-gray-400">Instant UPI Payment (Min ₹{MIN_DEPOSIT_AMOUNT})</p>
            </div>
          </div>
          <button onClick={resetModal} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: AMOUNT SELECTION */}
        {step === 1 && (() => {
          const numAmount = Number(amount);
          const isAmountValid = amount !== '' && numAmount >= MIN_DEPOSIT_AMOUNT;
          return (
          <form onSubmit={handleGenerateQR} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Enter Deposit Amount (Min ₹{MIN_DEPOSIT_AMOUNT})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-lg">₹</span>
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
                  className={`w-full bg-[#0b0e14] border rounded-xl py-3 pl-8 pr-4 text-lg font-bold text-white outline-none transition ${
                    amount !== '' && !isAmountValid ? 'border-red-500/80 focus:border-red-500' : 'border-[#232b3b] focus:border-amber-500'
                  }`}
                  required
                />
              </div>
              {amount !== '' && !isAmountValid && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400 font-bold animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Minimum deposit amount is ₹{MIN_DEPOSIT_AMOUNT}</span>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    amount === preset
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-[#232b3b] bg-[#0b0e14] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>After paying on FamPay, Paytm, or PhonePe, copy the 12-digit UTR / Ref ID and enter it on the next screen.</span>
            </div>

            <button
              type="submit"
              disabled={loading || !isAmountValid}
              className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${
                isAmountValid && !loading
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black active:scale-[0.98]'
                  : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isAmountValid ? `Proceed to Pay (₹${numAmount})` : `Enter min ₹${MIN_DEPOSIT_AMOUNT} to deposit`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          );
        })()}

        {/* STEP 2: SCAN QR & SUBMIT UTR */}
        {step === 2 && qrData && (
          <form onSubmit={handleSubmitUTR} className="space-y-4">
            <div className="text-center">
              <div className="inline-block p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/30 mb-2">
                <img src={qrData.qrCodeDataUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <div className="text-sm font-bold text-amber-400">Scan & Pay ₹{amount}</div>
              <p className="text-xs text-gray-400">FamPay • Paytm • PhonePe • Google Pay • BHIM</p>
            </div>

            {/* UPI ID Box */}
            <div className="bg-[#0b0e14] border border-[#232b3b] rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-400">UPI ID: <strong className="text-white font-mono">{qrData.upiId}</strong></span>
              <button
                type="button"
                onClick={handleCopyUPI}
                className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg hover:bg-amber-500/30 transition flex items-center gap-1"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* UTR Input with Strict Notice */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-200">
                  Enter 12-Digit UTR / Reference No. <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-amber-400">
                  {utrNumber.trim().length}/12 Digits
                </span>
              </div>
              
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 423456789012"
                value={utrNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setUtrNumber(val);
                }}
                className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-3 px-4 text-base font-mono font-bold tracking-widest text-amber-300 outline-none placeholder:text-gray-600 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                required
              />

              {/* Warning Box for Correct UTR */}
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-[11px] text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Important UTR Instructions:</span>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Open your <strong>FamPay / Paytm / PhonePe</strong> payment receipt & copy the <strong>12-digit UTR / UPI Ref No.</strong> (e.g. <em>423456789012</em>).
                </p>
                <p className="text-red-400 font-semibold">
                  ⚠️ If an invalid, wrong, or mismatched UTR is entered, the payment will NOT be added to your account.
                </p>
                <p className="text-amber-300 font-semibold pt-0.5">
                  ⏱️ Note: Once verified with banking ledger, your deposit balance will be added in <strong>5-6 hours</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 border border-[#232b3b] bg-[#0b0e14] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || utrNumber.trim().length !== 12}
                className={`w-2/3 py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm font-bold ${
                  utrNumber.trim().length === 12 && !loading
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white active:scale-95'
                    : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Deposit UTR'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS / PENDING STATUS */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Deposit Request Submitted!</h4>
              <p className="text-xs text-gray-400 mt-1">Amount: <strong className="text-amber-400">₹{amount}</strong> | UTR: <strong className="font-mono text-gray-300">{utrNumber}</strong></p>
            </div>
            <div className="p-3 bg-[#0b0e14] border border-[#232b3b] rounded-xl text-xs text-gray-300 text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">PENDING APPROVAL</span>
              </div>
              <p className="text-[11px] text-gray-400 pt-1">Our admin team is verifying your UTR with the bank statement. Your top navbar wallet balance will update automatically upon approval!</p>
            </div>
            <button
              onClick={resetModal}
              className="w-full bg-[#232b3b] hover:bg-gray-800 text-white font-bold py-3 rounded-xl text-sm transition"
            >
              Close Window
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
