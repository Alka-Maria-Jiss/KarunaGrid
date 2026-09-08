import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  CalendarPlus,
  Home,
  FileSpreadsheet,
  UserPlus,
  RefreshCw,
  Clock,
  Inbox
} from 'lucide-react';

export default function NurseNotifications({
  onNotificationRead = () => {},
}) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/notifications/${id}/read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setNotifications(notifications.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));
        onNotificationRead();
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
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
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
        onNotificationRead();
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Notifications Center</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Live updates on home visits, additional visit requests, and clinical assignments
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 bg-[#f3ede2] text-[#645e45] hover:bg-[#645e45] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5]">
            <Inbox className="w-10 h-10 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No notifications found.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">You're all caught up with care updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  !n.is_read
                    ? 'bg-[#fcfbf8] border-[#645e45]/30 shadow-xs'
                    : 'bg-white border-[#f0ece1] text-[#7b776c]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !n.is_read ? 'bg-[#f3ede2] text-[#645e45]' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs ${!n.is_read ? 'font-black text-[#1e1b14]' : 'font-medium text-[#4a473d]'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-[#7b776c]">
                      {n.created_at}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.notification_id)}
                    className="px-3 py-1.5 bg-[#f3ede2] text-[#645e45] hover:bg-[#645e45] hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Read</span>
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
