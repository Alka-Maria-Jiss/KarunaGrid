import React from 'react';
import {
  Home,
  Calendar,
  Clock,
  User,
  Bell,
  Settings,
  LogOut,
  X,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { useNotifications } from '../../context/NotificationContext';

export default function CaregiverSidebar({
  currentView = 'dashboard',
  onSelectView,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  pendingRequestsCount = 0,
}) {
  const { unreadCount = 0 } = useNotifications() || {};

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
    },
    {
      id: 'assignments',
      label: 'My Assignments',
      icon: Calendar,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'visits',
      label: 'My Visits',
      icon: Clock,
    },
    {
      id: 'profile',
      label: 'Caregiver Profile',
      icon: User,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-[#e05353] text-white',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (id) => {
    if (onSelectView) onSelectView(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fdfbf7] border-r border-[#e9e2d5] text-[#1e1b14] w-[250px] sm:w-[260px] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#e9e2d5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="KarunaGrid Official Logo"
            className="w-10 h-10 object-contain rounded-full shadow-xs bg-white p-0.5 border border-[#e0d9cc]"
          />
          <div>
            <h1 className="font-black text-sm tracking-tight text-[#1e1b14] leading-none">
              KarunaGrid
            </h1>
            <p className="text-[10px] font-bold text-[#645e45] uppercase tracking-wider mt-1">
              Caregiver Portal
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu List */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-[#7b776c]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                <span
                  className={`min-w-5 h-5 px-1.5 flex items-center justify-center text-[10px] font-black rounded-full shadow-2xs ${
                    item.badgeColor || 'bg-[#e05353] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Portal Badge & Logout */}
      <div className="p-3 border-t border-[#e9e2d5] space-y-2">
        <div className="px-3 py-2 bg-[#f4ede0] rounded-xl flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-[#645e45]" />
          <span className="text-[11px] font-bold text-[#645e45]">Palliative Caregiver</span>
        </div>

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
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 flex-shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay + Slide-over) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-[#fdfbf7] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
