const BASE_URL = '/api';

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
};

export const gameAPI = {
  getAviatorHistory: () => apiCall('/game/aviator/history', 'GET'),
  getMyBets: () => apiCall('/game/my-bets', 'GET'),
  verifySeed: (data) => apiCall('/game/verify-seed', 'POST', data),
};

export const wingoAPI = {
  getHistory: (mode = '1m', limit = 50) => apiCall(`/wingo/history/${mode}?limit=${limit}`, 'GET'),
  getChart: (mode = '1m') => apiCall(`/wingo/chart/${mode}`, 'GET'),
  getMyBets: (mode = '1m', page = 1, limit = 10) => apiCall(`/wingo/my-bets/${mode}?page=${page}&limit=${limit}`, 'GET'),
  getAdminAnalytics: (timeRange = 'today') => apiCall(`/wingo/admin/analytics?timeRange=${timeRange}`, 'GET'),
};
