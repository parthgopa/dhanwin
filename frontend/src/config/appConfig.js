/**
 * Centralized Application & Environment Configuration
 * 
 * - Frontend Domain: https://dhanwin.cloud (Hostinger Static Web Hosting)
 * - Backend API & WebSockets: https://api.dhanwin.cloud (Coolify VPS on 76.13.246.78)
 * - Local Development: Automatically proxies via Vite to http://localhost:5000
 */

export const IS_DEV = import.meta.env.DEV;

// 🌐 Live Production Hosted Endpoints
export const LIVE_API_URL = 'https://api.dhanwin.cloud/api';
export const LIVE_SOCKET_URL = 'https://api.dhanwin.cloud';

// 💻 Local Development Endpoints
export const DEV_API_URL = '/api';
export const DEV_SOCKET_URL = undefined;

// Active Resolved URLs
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (IS_DEV ? DEV_API_URL : LIVE_API_URL);

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || (IS_DEV ? DEV_SOCKET_URL : LIVE_SOCKET_URL);

export const APP_CONFIG = {
  isDev: IS_DEV,
  apiBaseUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  liveApiUrl: LIVE_API_URL,
  liveSocketUrl: LIVE_SOCKET_URL,
};

export default APP_CONFIG;
