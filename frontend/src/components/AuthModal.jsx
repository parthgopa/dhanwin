import React, { useState, useEffect } from 'react';
import { X, Lock, Phone, Mail, User as UserIcon, ArrowRight, ShieldCheck, KeyRound, Gift, Eye, EyeOff, CheckCircle2, RotateCw } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { loginUser, showToast } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [regStep, setRegStep] = useState(1); // 1: Input details, 2: Input 6-digit OTP
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsRegister(initialMode === 'register');
      setRegStep(1);
      setShowLoginPassword(false);
      setShowRegPassword(false);
    }
  }, [isOpen, initialMode]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // Request Email OTP for Registration
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!username || !phone || !email || !password) {
      showToast('Please fill in all registration fields', 'error');
      return;
    }
    if (phone.length < 10) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.sendOTP({ username, phone, email: email.trim() });
      setTempToken(res.tempToken);
      setRegStep(2);
      setResendTimer(60); // 60 seconds cooldown
      showToast(`OTP sent to registered email: ${email}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    try {
      const res = await authAPI.sendOTP({ username, phone, email: email.trim() });
      setTempToken(res.tempToken);
      setResendTimer(60);
      showToast(`New OTP sent to registered email: ${email}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP & Complete Registration
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      showToast('Please enter the 6-digit OTP code sent to your email', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        username,
        phone,
        email: email.trim(),
        password,
        otp: cleanOtp,
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

  // Handle Standard Login (Username, Mobile, or Email)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ identifier: username || phone || email, password });
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
    setShowLoginPassword(false);
    setShowRegPassword(false);
    setResendTimer(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#151a23] border border-[#232b3b] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-3.5 mb-4">
          <div>
            <h3 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              {isRegister ? (regStep === 2 ? 'VERIFY EMAIL OTP' : 'JOIN DHANWIN') : 'PLAYER LOGIN'}
            </h3>
            <p className="text-xs text-gray-400">
              {isRegister
                ? (regStep === 2 ? 'Enter 6-digit code sent to your email' : 'Register & Get Instant ₹10 Bonus')
                : 'Login to Your Gaming Wallet'}
            </p>
          </div>
          <button onClick={resetAndClose} className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGIN FORM */}
        {!isRegister && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Username, Mobile, or Email</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Enter username, mobile, or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-3 pl-9 pr-11 text-sm text-white outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white hover:text-amber-300 transition"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98]"
            >
              <span>{loading ? 'Authenticating...' : 'Login & Play'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM: STEP 1 (DETAILS INCLUDING EMAIL) */}
        {isRegister && regStep === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sign up today & receive <strong>₹10.00 Bonus</strong> automatically!</span>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Mobile Number Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Mobile Number (10 Digits)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition font-mono"
                  required
                />
              </div>
            </div>

            {/* NEW FIELD: Email Address Input (Below Mobile) */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Email Address <span className="text-amber-400 font-normal">(OTP verification required)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Create strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-11 text-sm text-white outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white hover:text-amber-300 transition"
                  title={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98]"
            >
              <span>{loading ? 'Sending OTP to Email...' : 'Send Email OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM: STEP 2 (DEDICATED EMAIL OTP VERIFICATION POPUP VIEW) */}
        {isRegister && regStep === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            
            {/* Prominent On-Screen Alert Box */}
            <div className="p-3.5 bg-gradient-to-br from-purple-950/40 via-[#170e2d] to-[#1a0f35] border border-amber-500/40 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40 shadow-lg">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">OTP Sent to Registered Email</h4>
                <div className="mt-1 px-3 py-1 bg-black/60 border border-amber-500/30 rounded-lg inline-block text-amber-300 text-xs font-mono font-bold max-w-full truncate">
                  📧 {email}
                </div>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Please check your inbox & spam folder for the 6-digit OTP code sent from <strong>dhanwin0912@gmail.com</strong>.
              </p>
            </div>

            {/* 6-Digit OTP Code Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 text-center">
                Enter 6-Digit Email Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full bg-[#0b0e14] border-2 border-amber-500/80 focus:border-amber-400 rounded-2xl py-3 px-4 text-2xl font-black text-center tracking-[0.4em] text-amber-300 font-mono outline-none shadow-inner"
                autoFocus
                required
              />
            </div>

            {/* Resend Timer & Action */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Didn't receive email?</span>
              {resendTimer > 0 ? (
                <span className="text-amber-400 font-mono font-bold">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 underline transition"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Resend OTP</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="w-1/3 py-3 border border-[#232b3b] bg-[#0b0e14] hover:bg-gray-900 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Change Email
              </button>
              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className={`w-2/3 py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wider ${
                  otp.trim().length === 6 && !loading
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-black active:scale-[0.98]'
                    : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                {loading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <span>Verify & Register</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Toggle Mode Link */}
        <div className="mt-4 text-center border-t border-[#232b3b] pt-3">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setRegStep(1);
            }}
            className="text-sm text-gray-300 hover:text-white font-medium transition py-1 px-2"
          >
            {isRegister ? (
              <span>Already have an account? <strong className="text-amber-400 font-extrabold underline underline-offset-4">Login</strong></span>
            ) : (
              <span>Not registered? <strong className="text-amber-400 font-extrabold underline underline-offset-4">Register here</strong></span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
