import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminLogin = ({ onLoginSuccess }) => {
  const { loginUser, showToast } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleAdminAccess = async () => {
    setLoading(true);
    try {
      const res = await authAPI.adminLogin({
        username: 'admin',
        password: 'adminpassword123',
      });
      loginUser(res.user, res.token);
      showToast('Admin Master Access Granted', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to authenticate admin access', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-authenticate on component mount
  useEffect(() => {
    if (!hasAttempted) {
      setHasAttempted(true);
      handleAdminAccess();
    }
  }, [hasAttempted]);

  return (
    <div className="max-w-md mx-auto my-16 bg-[#151a23] border border-red-500/30 rounded-3xl p-8 shadow-2xl text-white space-y-6 text-center">
      <div className="space-y-3">
        <div className="w-20 h-20 bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 text-white rounded-3xl border border-red-400/40 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
          <Shield className="w-10 h-10 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wider uppercase flex items-center justify-center gap-2">
          <span>DHANWIN ADMIN MASTER</span>
        </h2>
        <p className="text-xs text-gray-400">
          Operations, Risk Control & Real-Time Analytics Portal
        </p>
      </div>

      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#232b3b] space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>DIRECT SECURE AUTHORIZATION</span>
        </div>
        <p className="text-xs text-gray-400">
          {loading
            ? 'Verifying admin credentials and connecting to live master control center...'
            : 'Access granted. Click below if you are not redirected automatically.'}
        </p>
      </div>

      <button
        type="button"
        onClick={handleAdminAccess}
        disabled={loading}
        className="w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider disabled:opacity-50 active:scale-95 cursor-pointer"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Connecting to Admin Portal...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Enter Admin Master Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
