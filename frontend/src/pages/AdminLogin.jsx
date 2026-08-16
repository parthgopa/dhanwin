import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, Flame } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminLogin = ({ onLoginSuccess }) => {
  const { loginUser, showToast } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('adminpassword123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.adminLogin({ username, password });
      loginUser(res.user, res.token);
      showToast('Admin Access Granted', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-[#151a23] border border-red-500/30 rounded-2xl p-8 shadow-2xl text-white space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/40 flex items-center justify-center mx-auto shadow-lg">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide">ISOLATED ADMIN PORTAL</h2>
        <p className="text-xs text-gray-400">Strictly restricted access for Dhanwin administrators</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Admin Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-red-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Admin Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#232b3b] focus:border-red-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <span>{loading ? 'Authenticating Admin...' : 'Login to Admin Portal'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-[#232b3b]">
        <p className="text-[11px] text-gray-500">Default Admin Credentials: <strong>admin</strong> / <strong>adminpassword123</strong></p>
      </div>
    </div>
  );
};
