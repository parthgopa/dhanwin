import React, { useState } from 'react';
import { X, Lock, Phone, User as UserIcon, ArrowRight, ShieldCheck, KeyRound, Gift } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const { loginUser, showToast } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [regStep, setRegStep] = useState(1); // 1: Input details, 2: Input 6-digit OTP
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Request 2FA OTP for Registration
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!username || !phone || !password) {
      showToast('Please fill in all registration fields', 'error');
      return;
    }
    if (phone.length < 10) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.sendOTP({ username, phone });
      setTempToken(res.tempToken);
      if (res.otp) setOtp(res.otp); // Prefill OTP in dev/test mode for instant testing!
      setRegStep(2);
      showToast(`OTP sent to +91 ${phone}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP & Complete Registration
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      showToast('Please enter the 6-digit OTP', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        username,
        phone,
        password,
        otp: otp.trim(),
        tempToken,
      });
      loginUser(res.user, res.token);
      showToast('Welcome to Dhanwin! ₹10 Signup Bonus Credited!', 'success');
      resetAndClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ identifier: username || phone, password });
      loginUser(res.user, res.token);
      showToast(`Welcome back, ${res.user.username}!`, 'success');
      resetAndClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setRegStep(1);
    setOtp('');
    setTempToken('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-4 mb-4">
          <div>
            <h3 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              {isRegister ? 'JOIN DHANWIN' : 'PLAYER LOGIN'}
            </h3>
            <p className="text-xs text-gray-400">
              {isRegister ? 'Register & Get Instant ₹10 Bonus' : 'Login to Your Gaming Wallet'}
            </p>
          </div>
          <button onClick={resetAndClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGIN FORM */}
        {!isRegister && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Username or Mobile Number</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Enter username or mobile"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              <span>{loading ? 'Authenticating...' : 'Login & Play'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM: STEP 1 (DETAILS) */}
        {isRegister && regStep === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-3.5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300">
              <Gift className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Sign up today & receive <strong>₹10.00 Signup Bonus</strong> automatically!</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Mobile Number (10 Digits)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              <span>{loading ? 'Sending OTP...' : 'Send 2FA OTP Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM: STEP 2 (OTP VERIFICATION) */}
        {isRegister && regStep === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Enter 6-Digit OTP Code</h4>
              <p className="text-xs text-gray-400">Sent to <strong>+91 {phone}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 text-center">6-Digit Verification Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-[#0b0e14] border border-amber-500 focus:border-amber-400 rounded-xl py-3 px-4 text-2xl font-black text-center tracking-[0.5em] text-amber-400 font-mono outline-none"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="w-1/3 py-3 border border-[#232b3b] bg-[#0b0e14] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-white font-extrabold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Claim ₹10'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="mt-5 text-center border-t border-[#232b3b] pt-3">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setRegStep(1);
            }}
            className="text-xs text-amber-400 hover:underline font-semibold"
          >
            {isRegister ? 'Already have an account? Login here' : "Don't have an account? Register & get ₹10 Bonus"}
          </button>
        </div>

      </div>
    </div>
  );
};
