import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Toast from 'react-native-toast-message';
import { AuthContext } from './AuthContext';

const SOCKET_URL = 'https://api.kampuscart.site';

export const SocketContext = createContext({
  socketRef: { current: null },
  connected: false,
  onlineUsers: new Set(),
});

export const SocketProvider = ({ children }) => {
  const { currentUser, userToken } = useContext(AuthContext);

  // Use a ref so the socket object is always accessible without triggering re-renders
  const socketRef = useRef(null);
  // Use state only for things components need to re-render on
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const userId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (!userId || !userToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineUsers(new Set());
      return;
    }

    console.log('[SocketContext] Creating socket for user:', userId);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SocketContext] Socket connected, id:', socket.id);
      setConnected(true);
      socket.emit('setup', { _id: String(userId) });
    });

    socket.on('connected', () => {
      console.log('[SocketContext] Server acknowledged setup');
    });

    socket.on('online_users', (userIds) => {
      console.log('[SocketContext] online_users received:', userIds);
      setOnlineUsers(new Set(userIds.map(String)));
    });

    // ── In-app notification banners (foreground only) ─────────────────────
    // When the app is foregrounded, Socket.io delivers real-time events and
    // we show a Toast banner.
    // When the app is backgrounded/killed, Socket.io is disconnected and the
    // server falls back to Expo push → FCM, which delivers a real OS push
    // notification (handled by usePushNotifications.js).
    const showToast = ({ title, body }) => {
      Toast.show({
        type:   'info',
        text1:  title,
        text2:  body,
        position:         'top',
        visibilityTime:   5000,
        autoHide:         true,
        topOffset:        50,
      });
    };

    // Direct notification (e.g. new chat message while the chat isn't open)
    socket.on('notification', showToast);

    // Campus-wide broadcast (new item, event, sport, lost & found)
    socket.on('campus_notification', showToast);
    // ──────────────────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log('[SocketContext] Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (e) => {
      console.warn('[SocketContext] connect_error:', e.message);
    });

    return () => {
      console.log('[SocketContext] Cleaning up socket');
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineUsers(new Set());
    };
  }, [userId, userToken]);

  return (
    <SocketContext.Provider value={{ socketRef, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
