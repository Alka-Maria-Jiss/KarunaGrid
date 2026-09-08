import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, RefreshCw, AlertCircle, Clock } from 'lucide-react';

export default function DoctorNotifications({
  onRefreshUnread,
}) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/notifications/${notificationId}/read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: true } : n
          )
        );
        if (onRefreshUnread) onRefreshUnread();
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/notifications/mark-all-read/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        if (onRefreshUnread) onRefreshUnread();
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
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
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            System updates, patient registration alerts, diagnostic uploads, and consultation reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-2 rounded-xl text-[#645e45] bg-[#fdfbf7] border border-[#e9e2d5] hover:bg-[#f4ede0] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
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
          All ({notifications.length})
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
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
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
            {filteredNotifications.map((n) => (
              <div
                key={n.notification_id}
                className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                  n.is_read ? 'bg-white hover:bg-[#fdfbf7]' : 'bg-[#fffdf9] hover:bg-[#faf7f0]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${
                      !n.is_read
                        ? 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
                        : 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs ${!n.is_read ? 'font-black text-[#1e1b14]' : 'font-medium text-[#4a473d]'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-[#7b776c] flex items-center gap-1 mt-1 font-semibold">
                      <Clock className="w-3 h-3 text-[#7b776c]" />
                      <span>{n.created_at || 'Recently'}</span>
                    </p>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(n.notification_id)}
                    className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] cursor-pointer flex-shrink-0"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
