import React, { useState } from 'react';
import { Bell, CheckCheck, Search, Filter, Mail, Clock } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminNotifications({
  notifications = [],
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showSuccess, showError } = useToast();

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all/');
      showSuccess('All notifications marked as read.');
      if (onRefresh) onRefresh();
    } catch (err) {
      showError('Failed to mark notifications as read.');
    }
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
              System Notification Oversight
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              {notifications.length} Total Alerts
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            System-wide alerts, verification notifications, and user communications audit log
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
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
            Unread Alerts ({notifications.filter((n) => !n.is_read).length})
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
        {filteredNotifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No system notifications match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  <th className="py-3 px-4 font-extrabold">Recipient</th>
                  <th className="py-3 px-4 font-extrabold">Notification Type</th>
                  <th className="py-3 px-4 font-extrabold">Message Content</th>
                  <th className="py-3 px-4 font-extrabold">Timestamp</th>
                  <th className="py-3 px-4 font-extrabold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {filteredNotifications.map((n) => (
                  <tr key={n.notification_id} className="hover:bg-[#faf7f0] transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                      <p>{n.recipient_email}</p>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#f4ede0] text-[#645e45] uppercase">
                        {n.recipient_role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#645e45]">
                      {n.type}
                    </td>
                    <td className="py-3.5 px-4 text-[#4a473d] max-w-md font-medium">
                      {n.message}
                    </td>
                    <td className="py-3.5 px-4 text-[#7b776c] font-medium whitespace-nowrap">
                      {n.created_at}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                          n.is_read
                            ? 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {n.is_read ? 'Read' : 'New / Unread'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
