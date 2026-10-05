import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Stethoscope, User, LogOut, CheckCircle2, Circle } from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';

export default function DoctorHeader({
  doctorInfo = {},
  onOpenMobile,
  onLogout,
  onNavigate,
  onToggleAvailability,
  unreadCount = 0,
  isTogglingAvailability = false,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAvailabilityMenu, setShowAvailabilityMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const availabilityMenuRef = useRef(null);

  const isAvailable = Boolean(doctorInfo.is_available_now);
  const doctorName = doctorInfo.name ? `Dr. ${doctorInfo.name}` : 'Dr. Palliative Specialist';

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (availabilityMenuRef.current && !availabilityMenuRef.current.contains(event.target)) {
        setShowAvailabilityMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-[#fdfbf7] border-b border-[#e9e2d5] px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
      {/* LEFT: Menu Trigger & Welcome Greeting */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-[#1e1b14] tracking-tight">
              Welcome, {doctorName}
            </h1>
          </div>
          <p className="text-[11px] text-[#7b776c] font-medium hidden sm:block">
            {doctorInfo.specialization || 'Community Palliative Medicine'} • {doctorInfo.service_area || 'District Service Area'}
          </p>
        </div>
      </div>

      {/* RIGHT: Availability Toggle, Notifications & Doctor Profile */}
      <div className="flex items-center gap-3">
        {/* AVAILABILITY CONTROL */}
        <div className="relative" ref={availabilityMenuRef}>
          <button
            type="button"
            disabled={isTogglingAvailability}
            onClick={() => onToggleAvailability && onToggleAvailability(!isAvailable)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
            title="Click to toggle availability status"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isAvailable ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <span className="hidden xs:inline">
              {isAvailable ? 'Available Now' : 'Unavailable'}
            </span>
          </button>
        </div>

        {/* NOTIFICATIONS BELL */}
        <NotificationDropdown
          onViewAll={() => onNavigate && onNavigate('notifications')}
          buttonClassName="relative p-2 rounded-xl text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
          iconClassName="w-4 h-4"
          initialUnreadCount={unreadCount}
        />

        {/* PROFILE MENU DROPDOWN */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-[#f4ede0] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#645e45] text-white flex items-center justify-center font-black text-xs shadow-xs">
              {doctorInfo.name ? doctorInfo.name.charAt(0) : 'D'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-black text-[#1e1b14] leading-none truncate max-w-[130px]">
                {doctorName}
              </p>
              <p className="text-[10px] text-[#7b776c] font-semibold">Doctor</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7b776c]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-[#e9e2d5] shadow-lg py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="px-4 py-2 border-b border-[#f2ece1]">
                <p className="font-black text-[#1e1b14]">{doctorName}</p>
                <p className="text-[11px] text-[#7b776c] truncate">{doctorInfo.email}</p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('profile');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[#1e1b14] font-bold hover:bg-[#f4ede0] text-left cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>View Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('patients');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[#4a473d] hover:bg-[#fdfbf7] hover:text-[#1e1b14] text-left cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#7b776c]" />
                  <span>My Patients</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('telemedicine');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[#4a473d] hover:bg-[#fdfbf7] hover:text-[#1e1b14] text-left cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-[#7b776c]" />
                  <span>Telemedicine Schedule</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[#ba1a1a] hover:bg-[#faf0ec] text-left font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#ba1a1a]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
