import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ShieldCheck, Heart, User, Stethoscope, Activity, ChevronDown } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import logoImg from '../assets/logo.png';
import { getUserFullName, getAvatarInitials, getRoleDisplayLabel } from '../utils/userProfileUtils';

const roleBadges = {
  patient: { label: 'Patient Portal', icon: User, color: 'bg-teal-100 text-teal-900 border-teal-300' },
  caregiver: { label: 'Caregiver Portal', icon: Heart, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  doctor: { label: 'Doctor Portal', icon: Stethoscope, color: 'bg-sky-100 text-sky-900 border-sky-300' },
  nurse: { label: 'Nurse Portal', icon: Activity, color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  admin: { label: 'Admin Portal', icon: ShieldCheck, color: 'bg-purple-100 text-purple-900 border-purple-300' },
};

export default function DashboardLayout({ user, onLogout, children }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const roleKey = (user?.role || 'caregiver').toLowerCase();
  const badgeInfo = roleBadges[roleKey] || roleBadges.caregiver;
  const RoleIcon = badgeInfo.icon;

  const fullName = getUserFullName(user, roleKey);
  const userInitials = getAvatarInitials(fullName, 'CG');
  const roleLabel = getRoleDisplayLabel(roleKey);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-serene-bg text-serene-text font-sans antialiased flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-serene-outline-subtle shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5">
              <img src={logoImg} alt="KarunaGrid" className="w-9 h-9 object-contain rounded-full shadow-sm" />
              <span className="font-extrabold text-xl tracking-tight text-serene-text">KarunaGrid</span>
            </a>
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${badgeInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{badgeInfo.label}</span>
            </span>
          </div>

          {/* User Info, Notification Bell & Profile Dropdown */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {/* Profile Dropdown Container */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white hover:bg-[#f4ede0] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs"
              >
                {/* Avatar with Initials */}
                <div className="w-8 h-8 rounded-xl bg-[#645e45] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                  {userInitials}
                </div>

                <div className="text-left hidden md:block leading-tight">
                  <p className="text-xs font-extrabold text-[#1e1b14] leading-tight truncate max-w-[150px]">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-[#645e45] font-bold mt-0.5">{roleLabel}</p>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#7b776c] transition-transform duration-150 ${
                    showProfileMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#e9e2d5] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-[#f2ece1]">
                    <p className="text-xs font-black text-[#1e1b14] truncate">{fullName}</p>
                    <p className="text-[11px] text-[#7b776c] truncate">{user?.email}</p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#ba1a1a] hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
