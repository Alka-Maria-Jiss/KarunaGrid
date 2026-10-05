import React, { useState } from 'react';
import {
  Menu,
  LogOut,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown
} from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';

export default function NurseHeader({
  nurse,
  unreadCount = 0,
  onToggleAvailability,
  isTogglingAvailability = false,
  onLogout,
  onOpenNotifications,
  onOpenMobileMenu,
  onNavigate,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isAvailable = Boolean(nurse?.is_available_now);

  return (
    <header className="sticky top-0 z-30 bg-[#fffdf9]/95 backdrop-blur-xs border-b border-[#e9e2d5] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu & Nurse Information */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] md:hidden transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-black text-[#1e1b14] tracking-tight">
              {nurse?.name ? (nurse.name.startsWith('Nurse ') ? nurse.name : `Nurse ${nurse.name}`) : 'Nurse Care Specialist'}
            </h1>
          </div>
          <p className="text-xs font-semibold text-[#7b776c] hidden sm:block">
            {nurse?.service_area ? `${nurse.service_area} • ` : ''}Palliative Field Care
          </p>
        </div>
      </div>

      {/* Right: Availability Toggle, Notifications & Profile */}
      <div className="flex items-center space-x-3">
        {/* Availability Toggle */}
        <button
          onClick={onToggleAvailability}
          disabled={isTogglingAvailability}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
          }`}
          title="Toggle your live clinical availability"
        >
          {isTogglingAvailability ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#645e45]" />
          ) : isAvailable ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-stone-400" />
          )}
          <span className="hidden md:inline">
            {isAvailable ? '🟢 Available Now' : '⚪ Unavailable'}
          </span>
          <span className="md:hidden">
            {isAvailable ? 'Available' : 'Off-duty'}
          </span>
        </button>

        {/* Notifications Bell */}
        <NotificationDropdown
          onViewAll={onOpenNotifications || (() => onNavigate && onNavigate('notifications'))}
          buttonClassName="relative p-2 rounded-full text-[#4a473d] hover:bg-[#f3ede2] transition-colors cursor-pointer"
          iconClassName="w-5 h-5"
          initialUnreadCount={unreadCount}
        />

        {/* Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#f3ede2] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#645e45] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {nurse?.name ? nurse.name.charAt(0).toUpperCase() : 'N'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-[#1e1b14] leading-none">{nurse?.name || 'Nurse'}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5 font-medium">Verified Care Provider</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7b776c] hidden lg:block" />
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#e9e2d5] p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-[#f0ece1]">
                  <p className="text-xs font-black text-[#1e1b14]">{nurse?.name || 'Nurse Specialist'}</p>
                  <p className="text-[10px] text-[#7b776c] truncate">{nurse?.email || 'nurse@karunagrid.org'}</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onNavigate) onNavigate('profile');
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-[#1e1b14] hover:bg-[#f4ede0] transition-colors text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#645e45]" />
                    <span>View Profile</span>
                  </button>
                  <div className="px-3 py-1 text-[11px] text-[#4a473d]">
                    <span className="font-semibold">Area: </span>
                    {nurse?.panchayath || nurse?.service_area || 'Community Care'}
                  </div>
                </div>

                <div className="pt-1 border-t border-[#f0ece1]">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
