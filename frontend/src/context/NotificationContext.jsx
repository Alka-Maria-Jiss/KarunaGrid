import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/apiClient';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [markingIds, setMarkingIds] = useState(new Set());
  const { showSuccess, showError } = useToast();

  const fetchNotifications = useCallback(async (quiet = false) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!quiet) setIsLoading(true);
    try {
      const data = await apiClient.get('/notifications/');
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      const count = typeof data?.unread_count === 'number' ? data.unread_count : list.filter((n) => !n.is_read).length;

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch notifications:', err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await apiClient.get('/notifications/unread-count/');
      if (typeof data?.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch unread count:', err);
    }
  }, []);

  // Periodic polling & window focus synchronization
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    const handleFocus = () => {
      fetchNotifications(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId || markingIds.has(notificationId)) return false;

    // Check current notification state
    const target = notifications.find(
      (n) => n.notification_id === notificationId || n.id === notificationId
    );
    if (target && target.is_read) return true;

    // Optimistic update
    setMarkingIds((prev) => new Set(prev).add(notificationId));
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId || n.id === notificationId
          ? { ...n, is_read: true }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      try {
        await apiClient.patch(`/notifications/${notificationId}/read/`);
      } catch {
        // Fallback to POST for maximum compatibility
        await apiClient.post(`/notifications/${notificationId}/read/`);
      }
      return true;
    } catch (err) {
      console.error('[NotificationContext] Error marking notification as read:', err);
      // Rollback optimistic state
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId || n.id === notificationId
            ? { ...n, is_read: false }
            : n
        )
      );
      setUnreadCount((prev) => prev + 1);
      showError('Failed to mark notification as read. Please try again.');
      return false;
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }, [notifications, markingIds, showError]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return true;

    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await apiClient.post('/notifications/read-all/');
      showSuccess('All notifications marked as read.');
      return true;
    } catch (err) {
      console.error('[NotificationContext] Error marking all notifications as read:', err);
      // Rollback
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      showError('Failed to mark all notifications as read. Please try again.');
      return false;
    }
  }, [notifications, unreadCount, showSuccess, showError]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.is_read),
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      unreadNotifications,
      isLoading,
      markingIds,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      unreadNotifications,
      isLoading,
      markingIds,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
