import React from 'react';
import {
  LayoutDashboard,
  User,
  FileText,
  FileSpreadsheet,
  Pill,
  Utensils,
  GitCommit,
  Video,
  Home,
  CalendarClock,
  Boxes,
  ScrollText,
  FileCheck,
  HeartHandshake,
  Bell,
  LogOut,
  X,
  Heart,
} from 'lucide-react';

const navSections = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'MY HEALTH',
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'medical_history', label: 'Medical History', icon: FileText },
      { id: 'lab_reports', label: 'Laboratory Reports', icon: FileSpreadsheet },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'nutrition', label: 'Nutrition / Meal Plan', icon: Utensils },
      { id: 'timeline', label: 'Patient Timeline', icon: GitCommit },
    ],
  },
  {
    title: 'REQUESTS & CARE',
    items: [
      { id: 'telemedicine', label: 'Telemedicine Request', icon: Video },
      { id: 'home_visits', label: 'Home Visit Request', icon: Home },
      { id: 'schedule_change', label: 'Schedule Change Request', icon: CalendarClock },
      { id: 'equipment', label: 'Medical Equipment Request', icon: Boxes },
    ],
  },
  {
    title: 'WELFARE',
    items: [
      { id: 'welfare_schemes', label: 'Government Schemes', icon: ScrollText },
      { id: 'my_applications', label: 'My Applications', icon: FileCheck },
    ],
  },
  {
    title: 'CARE SUPPORT',
    items: [
      { id: 'caregiver', label: 'My Caregiver', icon: HeartHandshake },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, badgeKey: 'unread_notifications' },
    ],
  },
];

export default function PatientSidebar({
  currentView,
  onSelectView,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  unreadCount = 0,
}) {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fdfbf7] border-r border-[#e9e2d5] text-[#1e1b14] w-[250px]">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-[#f2ece1]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#645e45] text-[#fff9ef] flex items-center justify-center shadow-xs">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-[#1e1b14] leading-none">
              KarunaGrid
            </h1>
            <span className="text-[11px] font-semibold text-[#7b776c] tracking-wider uppercase">
              Care Network
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto p-3.5 space-y-5 scrollbar-thin scrollbar-thumb-[#e9e2d5]">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold tracking-wider text-[#9e988a] uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const showBadge = item.badgeKey === 'unread_notifications' && unreadCount > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectView(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#645e45] text-white shadow-2xs'
                        : 'text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-[#7b776c]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {showBadge && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#ba1a1a] text-white'
                        }`}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3.5 border-t border-[#f2ece1] bg-[#faf7f0]">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#ba1a1a] hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#ba1a1a]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:flex flex-shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-[260px] w-full bg-[#fdfbf7] z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
