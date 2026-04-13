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

  const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo'));

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await apiCall.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

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

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const socket = io(ENDPOINT);
    socket.emit('setup', user);

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      toast.info(notification.title, {
        position: 'top-right',
        autoClose: 4000,
        onClick: () => {
          if (notification.link) window.location.href = notification.link;
        }
      });
    });

    return () => socket.disconnect();
  }, [user?._id, fetchNotifications]);

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
