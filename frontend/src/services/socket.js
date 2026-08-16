import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/appConfig';

let socket = null;
const connectionListeners = new Set();

const notifyListeners = (state) => {
  connectionListeners.forEach((cb) => {
    try {
      cb(state);
    } catch (e) {
      console.error('[Socket State Error]', e);
    }
  });
};

export const subscribeConnectionState = (callback) => {
  connectionListeners.add(callback);
  if (socket) {
    callback(socket.connected ? 'connected' : 'disconnected');
  }
  return () => connectionListeners.delete(callback);
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
    socket = io(SOCKET_URL || undefined, {
      auth: { token },
      autoConnect: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 8000,
    });

    socket.on('connect', () => {
      notifyListeners('connected');
    });

    socket.on('disconnect', (reason) => {
      notifyListeners('disconnected');
      // If server disconnected or mobile background dropped TCP, attempt reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        socket.connect();
      }
    });

    socket.on('connect_error', () => {
      notifyListeners('error');
    });
  }

  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch (e) {
      // ignore
    }
  }
  const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
  socket = io(SOCKET_URL || undefined, {
    auth: { token },
    autoConnect: true,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 4000,
    timeout: 8000,
  });

  socket.on('connect', () => notifyListeners('connected'));
  socket.on('disconnect', () => notifyListeners('disconnected'));
  socket.on('connect_error', () => notifyListeners('error'));

  return socket;
};

export const forceFreshConnection = () => {
  if (socket && socket.connected) {
    return socket;
  }
  return reconnectSocket();
};

// Auto-wake socket when mobile device regains network or tab becomes visible
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (socket && !socket.connected) {
        socket.connect();
      }
    }
  });
}
