import React, { useState } from 'react';
import { Bell, CheckCheck, Search, Check, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cleanNotificationMessage } from '../../utils/notificationUtils';

export default function AdminNotifications() {
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
      n.recipient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.type?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'unread' ? !n.is_read : n.is_read);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              System Notifications & Alerts
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#faf0ec] text-[#ba1a1a] rounded-full border border-[#ebd4cc]">
              {unreadCount} Unread
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Real-time notifications regarding visit schedules, care assignments, user verifications, and system alerts
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

      {/* Filters & Search */}
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
            placeholder="Search message, recipient, or type..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Notifications Table / List */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No notifications match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  {notifications.some((n) => n.recipient_email) && (
                    <th className="py-3 px-4 font-extrabold">Recipient</th>
                  )}
                  <th className="py-3 px-4 font-extrabold">Notification Type</th>
                  <th className="py-3 px-4 font-extrabold">Message Content</th>
                  <th className="py-3 px-4 font-extrabold">Timestamp</th>
                  <th className="py-3 px-4 font-extrabold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {filteredNotifications.map((n) => {
                  const notifId = n.notification_id || n.id;
                  const isMarking = markingIds?.has(notifId);

                  return (
                    <tr
                      key={notifId}
                      className={`transition-colors ${
                        n.is_read ? 'bg-white hover:bg-[#faf7f0]' : 'bg-[#fffaf0] hover:bg-[#fff6e4]'
                      }`}
                    >
                      {notifications.some((item) => item.recipient_email) && (
                        <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                          <p>{n.recipient_email || 'You'}</p>
                          {n.recipient_role && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#f4ede0] text-[#645e45] uppercase">
                              {n.recipient_role}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-bold text-[#645e45] whitespace-nowrap">
                        {n.type || 'System Alert'}
                      </td>
                      <td className="py-3.5 px-4 text-[#4a473d] max-w-md font-medium">
                        {cleanNotificationMessage(n.message)}
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium whitespace-nowrap">
                        {n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1.5">
                          {n.is_read ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]">
                              Read
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-amber-100 text-amber-900 border-amber-300">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
