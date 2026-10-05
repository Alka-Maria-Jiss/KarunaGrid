import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  CalendarPlus,
  Home,
  FileSpreadsheet,
  UserPlus,
  RefreshCw,
  Clock,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cleanNotificationMessage } from '../../utils/notificationUtils';

export default function NurseNotifications() {
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

  const handleMarkRead = async (id) => {
    await markAsRead(id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'home_visit':
        return <Home className="w-4 h-4 text-[#645e45]" />;
      case 'request':
        return <CalendarPlus className="w-4 h-4 text-amber-700" />;
      case 'lab_report':
        return <FileSpreadsheet className="w-4 h-4 text-indigo-700" />;
      case 'caregiver':
        return <UserPlus className="w-4 h-4 text-emerald-700" />;
      default:
        return <Bell className="w-4 h-4 text-[#7b776c]" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Notifications Center</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#faf0ec] text-[#ba1a1a] rounded-full border border-[#ebd4cc]">
                {unreadCount} Unread
              </span>
            </div>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Live updates on home visits, additional visit requests, and clinical assignments
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-4 py-2.5 bg-[#f3ede2] text-[#645e45] hover:bg-[#645e45] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchNotifications(false)}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5]">
            <Inbox className="w-10 h-10 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No notifications found.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">You're all caught up with care updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const notifId = n.notification_id || n.id;
              const isMarking = markingIds?.has(notifId);

              return (
                <div
                  key={notifId}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    !n.is_read
                      ? 'bg-[#fcfbf8] border-[#645e45]/30 shadow-xs'
                      : 'bg-white border-[#f0ece1] text-[#7b776c]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-3 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !n.is_read ? 'bg-[#f3ede2] text-[#645e45]' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${!n.is_read ? 'font-black text-[#1e1b14]' : 'font-medium text-[#4a473d]'}`}>
                        {cleanNotificationMessage(n.message)}
                      </p>
                      <span className="text-[10px] text-[#7b776c]">
                        {n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </span>
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
                          onClick={() => handleMarkRead(notifId)}
                          disabled={isMarking}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#645e45] bg-[#f3ede2] hover:bg-[#645e45] hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
