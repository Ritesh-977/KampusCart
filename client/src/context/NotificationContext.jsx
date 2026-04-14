import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall } from '../api/apiWithFallback';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const NotificationContext = createContext();
const ENDPOINT = import.meta.env.VITE_SERVER_URL;

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Get user from localStorage
  const getUser = () => {
    const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo'));
    return user;
  };

  const getUserId = () => {
    const user = getUser();
    return user?._id || user?.id || null;
  };

  // Initialize with current user ID
  const [currentUserId, setCurrentUserId] = useState(getUserId());

  const fetchNotifications = useCallback(async () => {
    const user = getUser();
    console.log('[NotificationContext] fetchNotifications called, user:', user?._id || user?.id);
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const { data } = await apiCall.get('/notifications');
      console.log('[NotificationContext] Fetched notifications:', data.notifications?.length);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiCall.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiCall.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiCall.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      const wasUnread = notifications.find(n => n._id === id)?.isRead === false;
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    const userId = getUserId();
    console.log('[NotificationContext] Initial mount, userId:', userId);
    if (userId) {
      fetchNotifications();
    }
  }, []);

  // Monitor userId changes and initial mount
  useEffect(() => {
    const newUserId = getUserId();
    console.log('[NotificationContext] Checking userId change. Current:', currentUserId, 'New:', newUserId);
    
    // If userId changed (logout or different user), clear and refetch
    if (newUserId !== currentUserId) {
      console.log('[NotificationContext] UserId changed! Updating...');
      setCurrentUserId(newUserId);
      setNotifications([]);
      setUnreadCount(0);
      
      if (newUserId) {
        // New user logged in, fetch their notifications
        console.log('[NotificationContext] Fetching notifications for new user');
        fetchNotifications();
      }
    }
  }, [currentUserId]);

  // Listen for storage changes (logout/login in same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const newUserId = getUserId();
      if (newUserId !== currentUserId) {
        setCurrentUserId(newUserId);
      }
    };

    const handleLogout = () => {
      setCurrentUserId(null);
      setNotifications([]);
      setUnreadCount(0);
    };

    const handleLogin = () => {
      const newUserId = getUserId();
      console.log('[NotificationContext] user-login event fired. UserId:', newUserId, 'Current:', currentUserId);
      if (newUserId) {
        setCurrentUserId(newUserId);
        setNotifications([]);
        setUnreadCount(0);
        // Fetch immediately
        fetchNotifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-logout', handleLogout);
    window.addEventListener('user-login', handleLogin);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logout', handleLogout);
      window.removeEventListener('user-login', handleLogin);
    };
  }, [currentUserId]);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const socket = io(ENDPOINT);
    socket.emit('setup', user);

    socket.on('new_notification', (notification) => {
      // Only add notification if it's for the current user
      const currentUser = getUser();
      const currentId = currentUser?._id || currentUser?.id;
      const notifUserId = notification.userId;
      
      if (String(currentId) === String(notifUserId)) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        toast.info(notification.title, {
          position: 'top-right',
          autoClose: 4000,
          onClick: () => {
            if (notification.link) window.location.href = notification.link;
          }
        });
      }
    });

    return () => socket.disconnect();
  }, [currentUserId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
