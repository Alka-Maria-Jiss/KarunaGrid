import React, { useState } from 'react';
import { Menu, Bell, User, ChevronDown, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function PatientHeader({
  patientInfo = {},
  onOpenMobile,
  onLogout,
  onNavigate,
  unreadCount = 0,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const patientName = patientInfo.name || 'Patient';
  const registrationId = patientInfo.registration_id || 'KG-P-PENDING';
  const status = patientInfo.registration_status || 'Pending';

  return (
    <header className="sticky top-0 z-20 bg-[#fdfbf7]/90 backdrop-blur-md border-b border-[#e9e2d5] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Welcome Heading */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] lg:hidden cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-[#1e1b14] truncate">
              Welcome, {patientName}
            </h1>
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : status === 'Rejected'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              <span>{status}</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-[#7b776c] truncate">
            Patient ID: <span className="text-[#645e45] font-extrabold">{registrationId}</span>
          </p>
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('notifications')}
          className="relative p-2.5 rounded-xl text-[#4a473d] bg-white hover:bg-[#f4ede0] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#ba1a1a] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-2xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-[#f4ede0] border border-[#e9e2d5] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-[#f4ede0] text-[#645e45] flex items-center justify-center font-bold text-xs border border-[#e0d9cc]">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-extrabold text-[#1e1b14] leading-tight">
                {patientName}
              </p>
              <p className="text-[10px] font-semibold text-[#7b776c]">Patient</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7b776c] hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#e9e2d5] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setIsProfileOpen(false)}
            >
              <div className="p-2 border-b border-[#f2ece1]">
                <p className="text-xs font-black text-[#1e1b14]">{patientName}</p>
                <p className="text-[11px] text-[#7b776c] truncate">{patientInfo.email}</p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('profile')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] rounded-xl transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[#7b776c]" />
                  <span>My Profile</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#ba1a1a] hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
