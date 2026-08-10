import React from 'react';
import { LogOut, ShieldCheck, Heart, User, Stethoscope, Activity } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import logoImg from '../assets/logo.png';

const roleBadges = {
  patient: { label: 'Patient Portal', icon: User, color: 'bg-teal-100 text-teal-900 border-teal-300' },
  caregiver: { label: 'Caregiver Portal', icon: Heart, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  doctor: { label: 'Doctor Portal', icon: Stethoscope, color: 'bg-sky-100 text-sky-900 border-sky-300' },
  nurse: { label: 'Nurse Portal', icon: Activity, color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  admin: { label: 'Admin Portal', icon: ShieldCheck, color: 'bg-purple-100 text-purple-900 border-purple-300' },
};

export default function DashboardLayout({ user, onLogout, children }) {
  const roleKey = (user?.role || 'patient').toLowerCase();
  const badgeInfo = roleBadges[roleKey] || roleBadges.patient;
  const RoleIcon = badgeInfo.icon;

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

          {/* User Info, Notification Bell & Logout Button */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-serene-text">{user?.name || user?.email}</p>
              <p className="text-[11px] text-serene-muted capitalize font-medium">{user?.role} Account</p>
            </div>

            <NotificationDropdown />

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
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
