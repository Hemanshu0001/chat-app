import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket && socket.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || 'https://chat-app-backend-g19j.onrender.com', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
