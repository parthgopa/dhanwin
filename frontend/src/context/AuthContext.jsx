import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, walletAPI } from '../services/api';
import { getSocket, reconnectSocket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token') || '');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [depositPopup, setDepositPopup] = useState(null); // { amount, message } shown for max 1.5s

  const triggerDepositPopup = useCallback((amount, customMessage) => {
    setDepositPopup({
      amount,
      message: customMessage || `₹${amount} Added to your account!`,
    });

    // Dismiss strictly after 1.5 seconds max
    setTimeout(() => {
      setDepositPopup(null);
    }, 1500);
  }, []);

  // Fetch Current User on Mount & Check Unnotified Approved Deposits
  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const data = await authAPI.getMe();
          setUser(data.user);

          // Check if any deposits were approved while user was away/offline
          try {
            const unnotifiedRes = await walletAPI.getUnnotifiedDeposits();
            if (unnotifiedRes?.unnotifiedDeposits?.length > 0) {
              const totalAdded = unnotifiedRes.unnotifiedDeposits.reduce((sum, tx) => sum + tx.amount, 0);
              triggerDepositPopup(totalAdded, `₹${totalAdded} Added to your account!`);
              await walletAPI.markNotified(unnotifiedRes.unnotifiedDeposits.map((tx) => tx._id));
            }
          } catch (unErr) {
            console.warn('[Unnotified Deposits Check Error]', unErr.message);
          }
        } catch (err) {
          console.error('[Auth Error]', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, [token, triggerDepositPopup]);

  // Listen to Socket Real-Time Deposit Approval & Balance Updates
  useEffect(() => {
    const socket = getSocket();
    const currentUserId = user?.id || user?._id;

    if (currentUserId) {
      socket.emit('user:join_room', { userId: currentUserId });
    }

    const handleBalanceUpdate = (data) => {
      if (!data) return;
      if (data.userId && currentUserId && data.userId.toString() !== currentUserId.toString()) {
        return;
      }
      if (data.newBalance !== undefined) {
        setUser((prev) => (prev ? { ...prev, walletBalance: data.newBalance } : null));
      }
      if (data.message && !data.message.includes('Added')) {
        showToast(data.message, 'info');
      }
    };

    const handleDepositApproved = (data) => {
      if (!data) return;
      if (data.userId && currentUserId && data.userId.toString() !== currentUserId.toString()) {
        return;
      }
      if (data?.amount) {
        triggerDepositPopup(data.amount, data.message);
        if (data.transactionId) {
          walletAPI.markNotified([data.transactionId]).catch(() => {});
        }
      }
      if (data?.newBalance !== undefined) {
        setUser((prev) => (prev ? { ...prev, walletBalance: data.newBalance } : null));
      } else {
        authAPI.getMe().then((res) => {
          if (res?.user) setUser(res.user);
        }).catch(() => {});
      }
    };

    socket.on('balance_update', handleBalanceUpdate);
    socket.on('global_balance_update', handleBalanceUpdate);
    socket.on('deposit_approved', handleDepositApproved);
    socket.on('global_deposit_approved', handleDepositApproved);

    if (currentUserId) {
      socket.on(`deposit_approved_${currentUserId}`, handleDepositApproved);
      socket.on(`balance_update_${currentUserId}`, handleBalanceUpdate);
    }

    const handleSessionEvicted = (data) => {
      const msg = data?.message || 'You have been logged out because your account was accessed from another device.';
      logout();
      showToast(msg, 'error');
    };

    socket.on('session:evicted', handleSessionEvicted);
    socket.on('auth:force_logout', handleSessionEvicted);

    const handleWindowSessionTerminated = (e) => {
      const msg = e?.detail?.message || 'You have been logged out because your account was accessed from another device.';
      logout();
      showToast(msg, 'error');
    };
    window.addEventListener('auth:session_terminated', handleWindowSessionTerminated);

    return () => {
      socket.off('balance_update', handleBalanceUpdate);
      socket.off('global_balance_update', handleBalanceUpdate);
      socket.off('deposit_approved', handleDepositApproved);
      socket.off('global_deposit_approved', handleDepositApproved);
      socket.off('session:evicted', handleSessionEvicted);
      socket.off('auth:force_logout', handleSessionEvicted);
      window.removeEventListener('auth:session_terminated', handleWindowSessionTerminated);
      if (currentUserId) {
        socket.off(`deposit_approved_${currentUserId}`, handleDepositApproved);
        socket.off(`balance_update_${currentUserId}`, handleBalanceUpdate);
      }
    };
  }, [user?.id, user?._id, triggerDepositPopup]);

  const loginUser = (userData, userToken) => {
    localStorage.setItem('dhanwin_token', userToken);
    localStorage.removeItem('bhagyawin_token');
    setToken(userToken);
    setUser(userData);
    reconnectSocket();
  };

  const logout = () => {
    localStorage.removeItem('dhanwin_token');
    localStorage.removeItem('bhagyawin_token');
    setToken('');
    setUser(null);
    reconnectSocket();
  };

  const updateBalance = (newBalance) => {
    setUser((prev) => (prev ? { ...prev, walletBalance: newBalance } : null));
  };

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        notification,
        depositPopup,
        triggerDepositPopup,
        loginUser,
        logout,
        updateBalance,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
