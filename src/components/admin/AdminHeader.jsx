import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, User, ShieldCheck, LogOut, CheckCheck } from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';

const viewTitles = {
  dashboard: 'Administrator Dashboard',
  doctors: 'Doctor Management',
  nurses: 'Nurse Management',
  caregivers: 'Caregiver Directory',
  patients: 'Patient Directory (Read-Only)',
  all_users: 'User Account Management',
  caregiver_verification: 'Caregiver Verification Queue',
  welfare_schemes: 'Government Welfare Schemes',
  welfare_applications: 'Welfare Scheme Applications',
  equipment: 'Equipment & Inventory Management',
  notifications: 'System Notification Oversight',
  reports: 'Palliative Care Reports',
  analytics: 'Platform Analytics',
  system_monitoring: 'System Monitoring & Health',
  activity_logs: 'System Activity Logs',
};

export default function AdminHeader({
  user,
  currentView = 'dashboard',
  onOpenMobile,
  onLogout,
  pendingAlertCount = 0,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const title = viewTitles[currentView] || 'Administrator Dashboard';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminName = user?.name || 'Admin';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#e9e2d5] px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between shadow-xs">
      {/* Left: Hamburger & Dynamic Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base sm:text-lg lg:text-xl text-[#1e1b14] tracking-tight truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              Phase 1
            </span>
          </div>
          <p className="text-[11px] text-[#7b776c] font-medium hidden md:block">
            KarunaGrid Community Palliative Care Network
          </p>
        </div>
      </div>

      {/* Right: Notifications & Admin Profile */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Real-time Notification Dropdown */}
        <NotificationDropdown />

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-[#e9e2d5] bg-[#fdfbf7] hover:bg-[#f4ede0] transition-all cursor-pointer shadow-2xs"
          >
            {/* Avatar with Initials */}
            <div className="w-8 h-8 rounded-xl bg-[#645e45] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              {adminName.slice(0, 2).toUpperCase()}
            </div>

            <div className="text-left hidden md:block leading-tight">
              <p className="text-xs font-extrabold text-[#1e1b14]">{adminName}</p>
              <p className="text-[10px] font-bold text-[#645e45] uppercase tracking-wider">Administrator</p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-[#7b776c] transition-transform duration-150 ${
                showProfileMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#e9e2d5] py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-[#f0eae0]">
                <p className="text-xs font-extrabold text-[#1e1b14]">{adminName}</p>
                <p className="text-[11px] text-[#7b776c] font-medium truncate">{user?.email || 'admin@karunagrid.org'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-extrabold uppercase bg-purple-100 text-purple-900 rounded-full border border-purple-200">
                  Full Administrator Access
                </span>
              </div>

              <div className="py-1 text-xs font-semibold text-[#4a473d]">
                <div className="px-4 py-2 text-[11px] text-[#7b776c]">
                  Role: <strong className="text-[#1e1b14]">Administrator</strong>
                </div>
              </div>

              <div className="border-t border-[#f0eae0] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#ba1a1a] hover:bg-[#fdf2f2] transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
