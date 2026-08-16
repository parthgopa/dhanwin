import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
    socket = io({
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  const token = localStorage.getItem('dhanwin_token') || localStorage.getItem('bhagyawin_token');
  socket = io({
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
};
