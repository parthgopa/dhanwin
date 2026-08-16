/**
 * Centralized Application & Environment Configuration
 * 
 * Switch effortlessly between Local Development and Production Hosting:
 * - In Development (npm run dev): Automatically uses local proxy '/api' & local WebSocket
 * - In Production (npm run build / live): Automatically points to https://dhanwin.cloud/api & https://dhanwin.cloud
 * 
 * You can also override these dynamically via environment variables:
 * - VITE_API_URL=https://dhanwin.cloud/api
 * - VITE_SOCKET_URL=https://dhanwin.cloud
 */

export const IS_DEV = import.meta.env.DEV;

// Production Live Backend Endpoints
export const LIVE_API_URL = 'https://dhanwin.cloud/api';
export const LIVE_SOCKET_URL = 'https://dhanwin.cloud';

// Local Development Endpoints
export const DEV_API_URL = '/api';
export const DEV_SOCKET_URL = undefined; // Uses current window host via Vite proxy

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
