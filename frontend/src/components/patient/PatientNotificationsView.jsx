import React, { useState } from 'react';
import { Bell, CheckCheck, Search, Check, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cleanNotificationMessage } from '../../utils/notificationUtils';

export default function PatientNotificationsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markingIds,
    isLoading,
  } = useNotifications();

  const handleMarkSingleRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.type?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'unread' ? !n.is_read : n.is_read);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Care Notifications & Alerts
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#faf0ec] text-[#9c4c37] rounded-full border border-[#ebd4cc]">
              {unreadCount} Unread
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Real-time notifications regarding visit schedules, prescription updates, and doctor messages
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer flex-shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'unread'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            Unread Alerts ({unreadCount})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notification text..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Notifications List */}
      {isLoading && notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <p className="text-xs text-[#7b776c] font-bold">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <Bell className="w-10 h-10 text-[#645e45] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Notifications Found
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            You have no notifications matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs divide-y divide-[#f2ece1] overflow-hidden">
          {filteredNotifications.map((n) => {
            const notifId = n.notification_id || n.id;
            const isMarking = markingIds?.has(notifId);

            return (
              <div
                key={notifId}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  n.is_read ? 'bg-white hover:bg-[#fdfbf7]' : 'bg-[#fffaf0] hover:bg-[#fff6e4]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${
                      n.is_read
                        ? 'bg-[#fdfbf7] text-[#7b776c] border-[#e9e2d5]'
                        : 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-[#1e1b14]">
                        {n.type || 'Care Notification'}
                      </h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                      )}
                    </div>
                    <p className="text-xs text-[#4a473d] leading-relaxed break-words">
                      {cleanNotificationMessage(n.message)}
                    </p>
                    <p className="text-[10px] font-semibold text-[#7b776c]">
                      {n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
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
                        onClick={() => handleMarkSingleRead(notifId)}
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
  );
}
