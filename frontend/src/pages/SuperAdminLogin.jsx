import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, Eye, EyeOff, RefreshCw, Zap, Flame } from 'lucide-react';
import { superAdminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SuperAdminLogin = ({ onLoginSuccess }) => {
  const { loginUser, showToast } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return showToast('Please enter superadmin username and password', 'error');
    }

    setLoading(true);
    try {
      const res = await superAdminAPI.login({
        username: username.trim(),
        password: password.trim(),
      });
      loginUser(res.user, res.token);
      showToast('Super Admin Master Clearance Authorized', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      showToast(err.message || 'Invalid superadmin credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070314] flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black font-sans">
      <div className="w-full max-w-md bg-gradient-to-b from-[#12082b] to-[#0a0518] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 via-amber-400 to-purple-600 text-black rounded-2xl border border-amber-300/40 flex items-center justify-center mx-auto shadow-xl">
            <Zap className="w-9 h-9 stroke-[2.5] fill-amber-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase flex items-center justify-center gap-2">
            <span>DHANWIN SUPER ADMIN</span>
          </h2>
          <p className="text-xs text-amber-200/70 font-mono">
            Executive Analytics, Risk Radar & Solvency Vault
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Super Admin Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter superadmin username"
                autoComplete="off"
                className="w-full bg-[#06020f] border border-[#2d1b4e] focus:border-amber-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Super Admin Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter superadmin password"
                autoComplete="new-password"
                className="w-full bg-[#06020f] border border-[#2d1b4e] focus:border-amber-500 rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-gray-600 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white hover:text-amber-400 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-black font-black py-3.5 rounded-xl shadow-xl transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Authorizing Master Clearance...</span>
              </>
            ) : (
              <>
                <span>Access Super Admin Control</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#2d1b4e] relative z-10">
          <p className="text-[11px] text-gray-500 font-mono">
            Protected endpoint &bull; All authorization attempts are logged
          </p>
        </div>
      </div>
    </div>
  );
};
