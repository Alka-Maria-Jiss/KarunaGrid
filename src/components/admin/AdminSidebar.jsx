import React from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Activity,
  HeartHandshake,
  Users,
  ShieldCheck,
  UserCheck,
  FileCheck2,
  Boxes,
  ScrollText,
  Bell,
  BarChart3,
  PieChart,
  Cpu,
  History,
  LogOut,
  X,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function AdminSidebar({
  currentView = 'dashboard',
  onSelectView,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  pendingCounts = { caregivers: 0, welfare: 0 },
}) {
  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'USER MANAGEMENT',
      items: [
        { id: 'doctors', label: 'Doctors', icon: Stethoscope },
        { id: 'nurses', label: 'Nurses', icon: Activity },
        { id: 'caregivers', label: 'Caregivers', icon: HeartHandshake },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'all_users', label: 'All Users', icon: ShieldCheck },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        {
          id: 'caregiver_verification',
          label: 'Caregiver Verification',
          icon: UserCheck,
          badge: pendingCounts.caregivers > 0 ? pendingCounts.caregivers : null,
        },
        { id: 'welfare_schemes', label: 'Welfare Schemes', icon: ScrollText },
        {
          id: 'welfare_applications',
          label: 'Welfare Applications',
          icon: FileCheck2,
          badge: pendingCounts.welfare > 0 ? pendingCounts.welfare : null,
        },
        { id: 'equipment', label: 'Equipment Management', icon: Boxes },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'analytics', label: 'Analytics', icon: PieChart },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'system_monitoring', label: 'System Monitoring', icon: Cpu },
        { id: 'activity_logs', label: 'Activity Logs', icon: History },
      ],
    },
  ];

  const handleItemClick = (id) => {
    onSelectView(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fdfbf7] border-r border-[#e9e2d5] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#e9e2d5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="KarunaGrid Official Logo"
            className="w-10 h-10 object-contain rounded-full shadow-sm bg-white p-0.5 border border-[#e0d9cc]"
          />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-[#1e1b14] tracking-tight leading-snug">
              KarunaGrid
            </h1>
            <p className="text-[11px] font-bold text-[#645e45] uppercase tracking-wider">
              Care Network Admin
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#eee7da] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[#e0d9cc]">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold text-[#7b776c] uppercase tracking-widest mb-1.5">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? 'bg-[#645e45] text-white shadow-sm'
                      : 'text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#7b776c] group-hover:text-[#645e45]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full ml-2 flex-shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#ba1a1a] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-3.5 border-t border-[#e9e2d5] bg-[#f9f5ec]">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#8c3b3b] bg-white hover:bg-[#fceded] border border-[#e9d5d5] hover:border-[#dfb5b5] transition-all shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-68 h-screen sticky top-0 flex-shrink-0 z-30 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
