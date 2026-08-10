import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/apiClient';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/notifications/');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 30s for real-time notification updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (notifId) => {
    try {
      await apiClient.post(`/notifications/${notifId}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-full text-serene-muted hover:text-serene-text hover:bg-serene-container transition-colors focus:outline-none focus:ring-2 focus:ring-serene-primary"
        aria-label="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-serene-outline-subtle z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-serene-outline-subtle bg-serene-low/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-serene-primary" />
              <h3 className="font-extrabold text-sm text-serene-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-serene-primary/10 text-serene-primary rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-serene-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-serene-outline-subtle/50">
            {isLoading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-serene-muted font-medium">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <Bell className="w-8 h-8 text-serene-muted/40 mb-2" />
                <p className="text-xs font-bold text-serene-text">No notifications yet</p>
                <p className="text-xs text-serene-muted mt-0.5">
                  Updates on your registration status will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
                  className={`p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                    !n.is_read ? 'bg-serene-container/40 hover:bg-serene-container/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {n.message.toLowerCase().includes('approved') ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : n.message.toLowerCase().includes('not approved') ? (
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-serene-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-bold text-serene-text' : 'font-normal text-serene-muted'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-serene-muted mt-1 block">
                      {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {!n.is_read && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-serene-primary mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
