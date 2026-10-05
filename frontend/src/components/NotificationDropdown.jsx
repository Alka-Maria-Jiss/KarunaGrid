import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pill,
  Activity,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { cleanNotificationMessage } from '../utils/notificationUtils';

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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    unreadCount,
    unreadNotifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    markingIds,
    fetchNotifications,
  } = useNotifications();

  // Close dropdown on click outside or Escape
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

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      // Refresh without auto-marking as read
      fetchNotifications(true);
    }
  };

  const handleMarkSingle = async (notifId, e) => {
    if (e) e.stopPropagation();
    await markAsRead(notifId);
  };

  const defaultBtnClass =
    'relative p-2.5 rounded-xl text-[#4a473d] bg-white hover:bg-[#f4ede0] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#645e45]/30';

  // Display top 5 latest unread notifications
  const displayedNotifications = unreadNotifications.slice(0, 5);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={buttonClassName || defaultBtnClass}
        aria-label="View Notifications"
        aria-expanded={isOpen}
        title="Notifications"
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
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
                  onClick={markAllAsRead}
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
            {isLoading && displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7b776c] font-medium">
                <div className="w-5 h-5 border-2 border-[#645e45] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : displayedNotifications.length === 0 ? (
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
              displayedNotifications.map((n) => {
                const notifId = n.notification_id || n.id;
                const isMarking = markingIds?.has(notifId);

                return (
                  <div
                    key={notifId}
                    className="p-3.5 bg-[#fcfaf5] hover:bg-[#f6efe1]/80 transition-colors flex items-start justify-between gap-3 text-left group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white border border-[#e9e2d5] flex items-center justify-center shadow-2xs">
                        {getNotificationIcon(n.type, n.message)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1e1b14] leading-relaxed break-words">
                          {cleanNotificationMessage(n.message)}
                        </p>
                        <span className="text-[10px] text-[#7b776c] mt-1 block font-semibold">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingle(notifId, e)}
                        disabled={isMarking}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#645e45] bg-white hover:bg-[#645e45] hover:text-white rounded-lg border border-[#e0d9cc] transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                        <span className="hidden sm:inline">Mark read</span>
                      </button>
                    </div>
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
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
