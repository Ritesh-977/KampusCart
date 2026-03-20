import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SOCKET_URL = 'https://api.kampuscart.site';

export const SocketContext = createContext({
  socket: null,
  onlineUsers: new Set(),
});

export const SocketProvider = ({ children }) => {
  const { currentUser, userToken } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    // Only connect when a real user is logged in
    if (!currentUser?._id || !userToken) {
      setSocket(prev => {
        prev?.disconnect();
        return null;
      });
      setOnlineUsers(new Set());
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      // Identify to the server immediately on every (re)connect
      newSocket.emit('setup', { _id: String(currentUser._id) });
    });

    // Backend broadcasts the full online user list whenever anyone connects/disconnects
    newSocket.on('online_users', (userIds) => {
      setOnlineUsers(new Set(userIds.map(String)));
    });

    newSocket.on('connect_error', (e) => console.warn('[socket] connect_error:', e.message));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers(new Set());
    };
  }, [currentUser?._id, userToken]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
