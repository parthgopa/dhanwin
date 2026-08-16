import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/appConfig';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
    socket = io(SOCKET_URL || undefined, {
      auth: { token },
      autoConnect: true,
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
  socket = io(SOCKET_URL || undefined, {
    auth: { token },
    autoConnect: true,
    transports: ['polling', 'websocket'],
  });
  return socket;
};
