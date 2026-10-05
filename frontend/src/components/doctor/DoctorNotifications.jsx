import React, { useState } from 'react';
import { Bell, Check, CheckCheck, RefreshCw, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cleanNotificationMessage } from '../../utils/notificationUtils';

export default function DoctorNotifications() {
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markingIds,
    isLoading,
    fetchNotifications,
  } = useNotifications();

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Doctor Care Notifications
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#faf0ec] text-[#ba1a1a] rounded-full border border-[#ebd4cc]">
              {unreadCount} Unread
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            System updates, patient registration alerts, diagnostic uploads, and consultation reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchNotifications(false)}
            disabled={isLoading}
            className="p-2 rounded-xl text-[#645e45] bg-[#fdfbf7] border border-[#e9e2d5] hover:bg-[#f4ede0] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'bg-white text-[#4a473d] border border-[#e9e2d5] hover:bg-[#fdfbf7]'
          }`}
        >
          All Alerts ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'bg-white text-[#4a473d] border border-[#e9e2d5] hover:bg-[#fdfbf7]'
          }`}
        >
          Unread Alerts ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading && notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Bell className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No notifications found.</p>
            <p>You're all caught up with care alerts.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f2ece1]">
            {filteredNotifications.map((n) => {
              const notifId = n.notification_id || n.id;
              const isMarking = markingIds?.has(notifId);

              return (
                <div
                  key={notifId}
                  className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                    n.is_read ? 'bg-white hover:bg-[#fdfbf7]' : 'bg-[#fffdf9] hover:bg-[#faf7f0]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${
                        !n.is_read
                          ? 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
                          : 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${!n.is_read ? 'font-black text-[#1e1b14]' : 'font-medium text-[#4a473d]'}`}>
                        {cleanNotificationMessage(n.message)}
                      </p>
                      <p className="text-[10px] text-[#7b776c] flex items-center gap-1 mt-1 font-semibold">
                        <Clock className="w-3 h-3 text-[#7b776c]" />
                        <span>{n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {n.is_read ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]">
                        Read
                      </span>
                    ) : (
                      <>
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-amber-100 text-amber-900 border-amber-300">
                          New / Unread
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notifId)}
                          disabled={isMarking}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#645e45] bg-white hover:bg-[#645e45] hover:text-white rounded-lg border border-[#e0d9cc] transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark as read</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
