import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminLogin = ({ onLoginSuccess }) => {
  const { loginUser, showToast } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return showToast('Please enter both username and password', 'error');
    }

    setLoading(true);
    try {
      const res = await authAPI.adminLogin({
        username: username.trim(),
        password: password.trim(),
      });
      loginUser(res.user, res.token);
      showToast('Admin Access Granted', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      showToast(err.message || 'Invalid admin credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-[#151a23] border border-red-500/30 rounded-3xl p-8 shadow-2xl text-white space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 text-white rounded-2xl border border-red-400/40 flex items-center justify-center mx-auto shadow-lg">
          <Shield className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wider uppercase">
          DHANWIN ADMIN LOGIN
        </h2>
        <p className="text-xs text-gray-400">Strictly restricted access for platform administrators</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Admin Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              autoComplete="off"
              className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-red-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Admin Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoComplete="new-password"
              className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-red-500 rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-gray-600 outline-none transition"
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
          className="w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Login to Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
