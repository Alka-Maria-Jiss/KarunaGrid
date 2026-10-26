import React, { useState } from 'react';
import { Bell, Check, CheckCheck, RefreshCw, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cleanNotificationMessage } from '../../utils/notificationUtils';

export default function CaregiverNotifications() {
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    markingIds,
    isLoading = false,
    fetchNotifications,
  } = useNotifications() || {};

  const handleMarkAsRead = async (notificationId) => {
    if (markAsRead) await markAsRead(notificationId);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#e9e2d5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-[#f4ede0] text-[#645e45]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1e1b14]">
                Caregiver Alerts & Notifications
              </h2>
              <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                Patient assignments, care requests, schedule alerts, and grievance updates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchNotifications && fetchNotifications(false)}
            disabled={isLoading}
            className="p-2.5 rounded-xl text-[#645e45] bg-[#fdfbf7] border border-[#e9e2d5] hover:bg-[#f4ede0] cursor-pointer transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {unreadCount > 0 && markAllAsRead && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#645e45] hover:bg-[#524d38] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#e9e2d5] pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            filter === 'unread'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filter === 'unread' ? 'bg-white text-[#645e45]' : 'bg-[#e05353] text-white'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#e9e2d5] p-8 shadow-xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#f4ede0] text-[#645e45] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#1e1b14]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-[#7b776c]">
              {filter === 'unread'
                ? 'You are all caught up! Great job.'
                : 'Alerts regarding patient assignments and schedules will appear here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isRead = Boolean(n.is_read);
            const isMarking = markingIds?.has(n.notification_id || n.id);

            return (
              <div
                key={n.notification_id || n.id}
                className={`flex items-start justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  isRead
                    ? 'bg-white border-[#f0eae0] text-[#4a473d]'
                    : 'bg-[#fdfbf7] border-[#645e45]/30 shadow-xs text-[#1e1b14]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isRead ? 'bg-transparent' : 'bg-[#e05353] animate-pulse'
                    }`}
                  />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold leading-relaxed">
                      {cleanNotificationMessage(n.message || n.text || '')}
                    </p>
                    <p className="text-[11px] text-[#7b776c] flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-[#a8a196]" />
                      <span>{n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}</span>
                    </p>
                  </div>
                </div>

                {!isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(n.notification_id || n.id)}
                    disabled={isMarking}
                    className="p-1.5 rounded-xl text-[#645e45] hover:bg-[#f4ede0] transition-colors flex-shrink-0 cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
