import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { FaBell, FaCheckDouble, FaTimes } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteNotification(notification._id);
  };

  const getIcon = () => {
    const iconMap = {
      message: '💬',
      item: '🛍️',
      event: '📅',
      sport: '🏆',
      lost_found: '📢',
      alert: '⚠️',
      system: '🔔'
    };
    return iconMap[notification.type] || '🔔';
  };

  return (
    <div
      onClick={handleClick}
      className={`group px-4 py-3 hover:bg-surface-2 dark:hover:bg-surface-muted transition-colors cursor-pointer border-b border-border last:border-none ${
        !notification.isRead ? 'bg-primary-muted' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm ${!notification.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-subtle">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-subtle hover:text-danger transition-all p-1"
              title="Delete"
            >
              <FaTimes size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationDropdown = ({ onClose }) => {
  const { notifications, unreadCount, markAllAsRead, loading } = useNotifications();

  return (
    <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 sm:absolute sm:top-full sm:left-auto sm:translate-x-0 sm:right-0 sm:mt-3 w-[92vw] sm:w-96 max-w-[calc(100vw-2rem)] bg-surface rounded-2xl shadow-2xl border border-border z-[100] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-surface-muted to-surface-muted   flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaBell className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary dark:hover:text-primary transition-colors"
          >
            <FaCheckDouble size={10} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[28rem] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <FaBell className="mx-auto text-4xl text-subtle mb-3" />
            <p className="text-sm font-semibold text-muted">No notifications</p>
            <p className="text-xs text-subtle mt-1">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-surface-2">
          <button
            onClick={() => {
              onClose();
              window.location.href = '/notifications';
            }}
            className="w-full text-center text-xs font-bold text-primary hover:text-primary dark:hover:text-primary transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;