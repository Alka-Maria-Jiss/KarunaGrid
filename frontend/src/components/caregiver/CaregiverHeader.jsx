import React, { useState } from 'react';
import {
  Menu,
  LogOut,
  User,
  Heart,
  ChevronDown,
  CheckCircle2,
  Clock,
  Settings,
} from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';
import { getUserFullName, getAvatarInitials, getRoleDisplayLabel } from '../../utils/userProfileUtils';

export default function CaregiverHeader({
  caregiver,
  unreadCount = 0,
  hasActiveAssignment = false,
  onLogout,
  onOpenMobileMenu,
  onNavigate,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const caregiverName = getUserFullName(caregiver, 'caregiver');
  const caregiverInitials = getAvatarInitials(caregiverName, 'CG');
  const roleLabel = getRoleDisplayLabel('caregiver');
  const status = (caregiver?.status || caregiver?.details?.verification_status || 'APPROVED').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#fffdf9]/95 backdrop-blur-xs border-b border-[#e9e2d5] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile Menu Toggle & Welcome Greeting */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] lg:hidden transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-[#1e1b14] tracking-tight truncate">
              Welcome, {caregiverName}
            </h1>
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              <span>{status === 'APPROVED' ? 'Verified Caregiver' : status}</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-[#7b776c] hidden sm:block truncate">
            {caregiver?.details?.place ? `${caregiver.details.place} • ` : ''}Palliative Home Support Network
          </p>
        </div>
      </div>

      {/* Right: Status Pill, Notifications & Profile Menu */}
      <div className="flex items-center space-x-3">
        {/* Active Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e9e2d5] shadow-2xs text-xs font-bold text-[#1e1b14]">
          <span
            className={`w-2 h-2 rounded-full ${
              hasActiveAssignment ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span>{hasActiveAssignment ? 'Assigned to Patient' : 'Available for Care'}</span>
        </div>

        {/* Notification Bell */}
        <NotificationDropdown
          onViewAll={() => onNavigate && onNavigate('notifications')}
          buttonClassName="relative p-2 sm:p-2.5 rounded-2xl bg-white hover:bg-[#f3ede2] border border-[#e9e2d5] text-[#1e1b14] transition-colors shadow-2xs cursor-pointer"
          iconClassName="w-4 h-4 text-[#645e45]"
          initialUnreadCount={unreadCount}
        />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-2xl bg-white hover:bg-[#f3ede2] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#645e45] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              {caregiverInitials}
            </div>

            <div className="text-left hidden md:block leading-tight">
              <p className="text-xs font-extrabold text-[#1e1b14] leading-tight truncate max-w-[130px]">
                {caregiverName}
              </p>
              <p className="text-[10px] text-[#645e45] font-bold">{roleLabel}</p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-[#7b776c] transition-transform duration-150 ${
                showProfileMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#e9e2d5] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowProfileMenu(false)}
            >
              <div className="p-2 border-b border-[#f2ece1]">
                <p className="text-xs font-black text-[#1e1b14] truncate">{caregiverName}</p>
                <p className="text-[11px] text-[#7b776c] truncate">{caregiver?.email}</p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('profile')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#7b776c]" />
                  <span>Caregiver Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('settings')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#7b776c]" />
                  <span>Settings & Grievances</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#ba1a1a] hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
