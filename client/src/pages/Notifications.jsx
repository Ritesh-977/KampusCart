import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/Navbar';
import { FaBell, FaCheckDouble, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();

  const getIcon = (type) => {
    const iconMap = {
      message: '💬',
      item: '🛍️',
      event: '📅',
      sport: '🏆',
      lost_found: '📢',
      alert: '⚠️',
      system: '🔔'
    };
    return iconMap[type] || '🔔';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted hover:text-primary dark:hover:text-primary mb-4 transition-colors"
          >
            <FaArrowLeft size={12} />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center">
                <FaBell className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                <p className="text-sm text-muted">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <FaCheckDouble size={12} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-surface rounded-2xl shadow-lg border border-border overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <FaBell className="mx-auto text-6xl text-subtle mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">No notifications yet</h3>
              <p className="text-sm text-muted">
                When you get notifications, they'll show up here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notification => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group px-6 py-4 hover:bg-surface-2 dark:hover:bg-surface-muted transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-primary-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className={`text-base ${!notification.isRead ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-subtle">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-danger hover:text-danger transition-all px-2 py-1 rounded-lg hover:bg-danger-muted dark:hover:bg-danger/20"
                        >
                          <FaTimes size={10} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
