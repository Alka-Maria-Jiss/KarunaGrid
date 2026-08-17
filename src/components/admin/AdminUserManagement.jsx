import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Power,
  Eye,
  User,
  Stethoscope,
  Activity,
  HeartHandshake,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const roleIcons = {
  Doctor: { icon: Stethoscope, color: 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]' },
  Nurse: { icon: Activity, color: 'bg-[#f5f1ea] text-[#695e3d] border-[#e7ded0]' },
  Caregiver: { icon: HeartHandshake, color: 'bg-[#f8f3eb] text-[#7a6449] border-[#e8dccb]' },
  Patient: { icon: Users, color: 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]' },
  Admin: { icon: ShieldCheck, color: 'bg-purple-50 text-purple-800 border-purple-200' },
};

export default function AdminUserManagement({ users = [], onRefresh, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const { showSuccess, showError } = useToast();

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role?.toLowerCase() === roleFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);

    return matchesRole && matchesSearch;
  });

  const handleToggleStatus = async (user_id) => {
    try {
      const res = await apiClient.post(`/admin/users/${user_id}/toggle-status/`);
      showSuccess(res.message);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update account status.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              All System Users Directory
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              {filteredUsers.length} Users
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Cross-role registry, credentials oversight, and account activation/deactivation controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('doctors')}
            className="px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
          >
            + Onboard Doctor
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('nurses')}
            className="px-3 py-1.5 text-xs font-bold text-[#695e3d] bg-[#f5f1ea] hover:bg-[#ebe4d7] rounded-xl transition-all cursor-pointer"
          >
            + Onboard Nurse
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'doctor', label: 'Doctors' },
            { id: 'nurse', label: 'Nurses' },
            { id: 'caregiver', label: 'Caregivers' },
            { id: 'patient', label: 'Patients' },
            { id: 'admin', label: 'Administrators' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-[#645e45] text-white shadow-2xs'
                  : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No user accounts found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  <th className="py-3 px-4 font-extrabold">User Profile</th>
                  <th className="py-3 px-4 font-extrabold">Role</th>
                  <th className="py-3 px-4 font-extrabold">Contact / Location</th>
                  <th className="py-3 px-4 font-extrabold">Account Status</th>
                  <th className="py-3 px-4 font-extrabold">Registered On</th>
                  <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {filteredUsers.map((u) => {
                  const roleConfig = roleIcons[u.role] || {
                    icon: User,
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                  };
                  const RoleIcon = roleConfig.icon;

                  return (
                    <tr key={u.user_id} className="hover:bg-[#faf7f0] transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center ${roleConfig.color}`}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p>{u.name}</p>
                            <p className="text-[11px] text-[#7b776c] font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#4a473d]">
                        <p className="font-medium">{u.phone || 'No phone'}</p>
                        <p className="text-[11px] text-[#7b776c]">{u.address || 'General'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          <span>{u.is_active ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                        {u.created_at}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-lg text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
                            title="View Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.user_id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              u.is_active
                                ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
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

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                User Account Overview
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#1e1b14]">
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</p>
              <p><strong>Address / Area:</strong> {selectedUser.address || 'N/A'}</p>
              <p><strong>Account Status:</strong> {selectedUser.is_active ? 'Active' : 'Deactivated'}</p>
              <p><strong>Joined On:</strong> {selectedUser.created_at}</p>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] rounded-xl hover:bg-[#4c472f]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
