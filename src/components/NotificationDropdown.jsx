import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, CheckCircle2, AlertCircle, Calendar, Pill, Activity, ShieldCheck, X } from 'lucide-react';
import apiClient from '../api/apiClient';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getNotificationIcon(type, message = '') {
  const lowerMsg = (message || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();

  if (lowerMsg.includes('approved') || lowerType.includes('approval') || lowerType.includes('verified')) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  }
  if (lowerMsg.includes('rejected') || lowerMsg.includes('not approved') || lowerType.includes('alert')) {
    return <AlertCircle className="w-4 h-4 text-rose-500" />;
  }
  if (lowerMsg.includes('prescription') || lowerType.includes('prescription') || lowerMsg.includes('medicine')) {
    return <Pill className="w-4 h-4 text-amber-600" />;
  }
  if (lowerMsg.includes('visit') || lowerType.includes('visit') || lowerMsg.includes('appointment')) {
    return <Calendar className="w-4 h-4 text-sky-600" />;
  }
  if (lowerType.includes('clinical') || lowerType.includes('vital')) {
    return <Activity className="w-4 h-4 text-teal-600" />;
  }
  if (lowerType.includes('admin') || lowerType.includes('security')) {
    return <ShieldCheck className="w-4 h-4 text-purple-600" />;
  }
  return <Bell className="w-4 h-4 text-[#645e45]" />;
}

export default function NotificationDropdown({
  buttonClassName = '',
  iconClassName = 'w-5 h-5',
  onViewAll = null,
  initialUnreadCount = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/notifications/');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMarkRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.post(`/notifications/${notifId}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const defaultBtnClass =
    'relative p-2.5 rounded-xl text-[#4a473d] bg-white hover:bg-[#f4ede0] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#645e45]/30';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) fetchNotifications();
        }}
        className={buttonClassName || defaultBtnClass}
        aria-label="View Notifications"
        aria-expanded={isOpen}
        title="Notifications"
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-[#e9e2d5] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e9e2d5] bg-[#faf6ee]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#645e45]/10 text-[#645e45] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-[#1e1b14]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-extrabold bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-full border border-[#ba1a1a]/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-[#645e45] hover:text-[#1e1b14] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#ede5d6] rounded-lg transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body List */}
          <div className="max-h-84 overflow-y-auto divide-y divide-[#f2ece1]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7b776c] font-medium">
                <div className="w-5 h-5 border-2 border-[#645e45] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#faf6ee] border border-[#e9e2d5] flex items-center justify-center text-[#7b776c] mb-2.5">
                  <Bell className="w-6 h-6 text-[#7b776c]/60" />
                </div>
                <p className="text-xs font-bold text-[#1e1b14]">No notifications yet</p>
                <p className="text-[11px] text-[#7b776c] mt-1 max-w-[220px]">
                  Updates on patient care, visit schedules, and tasks will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.is_read;
                return (
                  <div
                    key={n.notification_id}
                    onClick={() => isUnread && handleMarkRead(n.notification_id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                      isUnread
                        ? 'bg-[#fcfaf5] hover:bg-[#f6efe1]/80'
                        : 'bg-white hover:bg-[#faf6ee]/60'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white border border-[#e9e2d5] flex items-center justify-center shadow-2xs">
                      {getNotificationIcon(n.type, n.message)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed break-words ${
                          isUnread ? 'font-bold text-[#1e1b14]' : 'font-normal text-[#4a473d]'
                        }`}
                      >
                        {n.message}
                      </p>
                      <span className="text-[10px] text-[#7b776c] mt-1 block font-semibold">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    {isUnread && (
                      <span
                        className="shrink-0 w-2 h-2 rounded-full bg-[#ba1a1a] mt-2 shadow-2xs"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link to Full Page */}
          {onViewAll && (
            <div className="p-3 border-t border-[#e9e2d5] bg-[#faf6ee] text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                className="text-xs font-extrabold text-[#645e45] hover:text-[#1e1b14] hover:underline inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>View all notifications</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
