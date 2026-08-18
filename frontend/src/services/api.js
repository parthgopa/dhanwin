import { API_BASE_URL } from '../config/appConfig';

const BASE_URL = API_BASE_URL;

const getHeaders = () => {
  const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const config = {
    method,
    headers: getHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && (data.code === 'SESSION_TERMINATED' || data.message?.includes('another device'))) {
      window.dispatchEvent(new CustomEvent('auth:session_terminated', { detail: data }));
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

export const authAPI = {
  sendOTP: (data) => apiCall('/auth/send-otp', 'POST', data),
  register: (data) => apiCall('/auth/register', 'POST', data),
  login: (data) => apiCall('/auth/login', 'POST', data),
  adminLogin: (data) => apiCall('/auth/admin-login', 'POST', data),
  getMe: () => apiCall('/auth/me', 'GET'),
};

export const walletAPI = {
  getSystemStatus: () => apiCall('/wallet/system-status', 'GET'),
  getDailyRewardStatus: () => apiCall('/wallet/daily-reward-status', 'GET'),
  claimDailyReward: () => apiCall('/wallet/claim-daily-reward', 'POST'),
  getDepositQR: (amount) => apiCall('/wallet/deposit/qr', 'POST', { amount }),
  submitUTR: (amount, utrNumber) => apiCall('/wallet/deposit/submit-utr', 'POST', { amount, utrNumber }),
  withdraw: (data) => apiCall('/wallet/withdraw', 'POST', data),
  getTransactions: () => apiCall('/wallet/transactions', 'GET'),
  getUnnotifiedDeposits: () => apiCall('/wallet/unnotified-deposits', 'GET'),
  markNotified: (transactionIds) => apiCall('/wallet/mark-notified', 'POST', { transactionIds }),
};

export const adminAPI = {
  getPendingTransactions: () => apiCall('/admin/pending-transactions', 'GET'),
  getAllTransactions: (query = '') => apiCall(`/admin/all-transactions${query}`, 'GET'),
  processTransaction: (transactionId, action, adminNote) =>
    apiCall('/admin/process-transaction', 'POST', { transactionId, action, adminNote }),
  getConsolidatedAnalytics: ({ game = 'ALL', range = 'today', startDate = '', endDate = '' } = {}) => {
    const params = new URLSearchParams({ game, range });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/admin/consolidated-analytics?${params.toString()}`, 'GET');
  },
  getAviatorAnalytics: (range = 'today') => apiCall(`/admin/aviator-analytics?range=${range}`, 'GET'),
  getUsers: () => apiCall('/admin/users', 'GET'),
  getUserFinancialProfile: (userId) => apiCall(`/admin/user-financial-profile/${userId}`, 'GET'),
  toggleBlock: (userId) => apiCall('/admin/toggle-block', 'POST', { userId }),
  toggleAccountExclusion: (userId) => apiCall(`/admin/users/${userId}/toggle-exclude`, 'POST'),
  getLivePlayers: () => apiCall('/admin/live-players', 'GET'),
};

export const superAdminAPI = {
  login: (data) => apiCall('/superad/login', 'POST', data),
  getOverview: ({ timeframe = 'today', startDate = '', endDate = '' } = {}) => {
    const params = new URLSearchParams({ timeframe });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/superad/overview?${params.toString()}`, 'GET');
  },
  getUser360: (userId) => apiCall(`/superad/users/${userId}/360`, 'GET'),
  toggleBlockUser: (userId) => apiCall(`/superad/users/${userId}/toggle-block`, 'POST'),
  toggleExcludeUser: (userId) => apiCall(`/superad/users/${userId}/toggle-exclude`, 'POST'),
  toggleWithdrawals: (data) => apiCall('/superad/settings/toggle-withdrawals', 'POST', data),
  dismissRiskAlert: (alertId) => apiCall(`/superad/risk-alerts/${alertId}/dismiss`, 'POST'),
  processTransaction: (transactionId, action, adminNote) =>
    apiCall(`/superad/transactions/${transactionId}/process`, 'POST', { action, adminNote }),
};

export const gameAPI = {
  getAviatorHistory: () => apiCall('/game/aviator/history', 'GET'),
  getMyBets: () => apiCall('/game/my-bets', 'GET'),
  verifySeed: (data) => apiCall('/game/verify-seed', 'POST', data),
};

export const wingoAPI = {
  getHistory: (mode = '1m', limit = 50, page = 1) => apiCall(`/wingo/history/${mode}?limit=${limit}&page=${page}`, 'GET'),
  getChart: (mode = '1m', page = 1, limit = 10) => apiCall(`/wingo/chart/${mode}?page=${page}&limit=${limit}`, 'GET'),
  getMyBets: (mode = '1m', page = 1, limit = 10) => apiCall(`/wingo/my-bets/${mode}?page=${page}&limit=${limit}`, 'GET'),
  getAdminAnalytics: (timeRange = 'today') => apiCall(`/wingo/admin/analytics?timeRange=${timeRange}`, 'GET'),
};
