import React from 'react';
import {
  LayoutDashboard,
  Home,
  Calendar,
  UserCheck,
  CalendarPlus,
  Users,
  FileText,
  Clock,
  UserPlus,
  FileSpreadsheet,
  Bell,
  LogOut,
  X
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function NurseSidebar({
  activeTab,
  setActiveTab,
  unreadCount = 0,
  isMobileOpen = false,
  setIsMobileOpen = () => {}
}) {
  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'HOME VISITS',
      items: [
        { id: 'home_visits', label: 'Home Visit Management', icon: Home },
        { id: 'visit_calendar', label: 'Visit Calendar', icon: Calendar },
        { id: 'visit_allocations', label: 'Visit Allocations', icon: UserCheck },
        { id: 'additional_requests', label: 'Additional Visit Requests', icon: CalendarPlus },
      ],
    },
    {
      title: 'PATIENT CARE',
      items: [
        { id: 'patients', label: 'My Patients', icon: Users },
        { id: 'patient_records', label: 'Patient Medical Records', icon: FileText },
        { id: 'patient_timeline', label: 'Patient Timeline', icon: Clock },
      ],
    },
    {
      title: 'CAREGIVER',
      items: [
        { id: 'caregivers', label: 'Caregiver Assignments', icon: UserPlus },
      ],
    },
    {
      title: 'LABORATORY',
      items: [
        { id: 'lab_reports', label: 'Laboratory Reports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
      ],
    },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fcfaf6] border-r border-[#e9e2d5] text-[#1e1b14] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#e9e2d5] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={logoImg}
            alt="KarunaGrid Official Logo"
            className="w-10 h-10 object-contain rounded-full shadow-sm bg-white p-0.5 border border-[#e0d9cc]"
          />
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-[#1e1b14] leading-tight">KarunaGrid</h1>
            <p className="text-[11px] font-bold text-[#645e45] uppercase tracking-wider">Nurse Portal</p>
          </div>
        </div>
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-[#e9e2d5]/60 text-[#7b776c] transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {navSections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
              {sec.title}
            </div>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#645e45] text-white shadow-sm font-bold'
                        : 'text-[#4a473d] hover:bg-[#f3ede2] hover:text-[#1e1b14]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7b776c]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isActive
                            ? 'bg-white text-[#645e45]'
                            : 'bg-[#645e45]/15 text-[#645e45]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-[#e9e2d5] bg-[#f9f5ed]/60 text-center">
        <p className="text-[11px] font-bold text-[#645e45]">Palliative Care Coordination</p>
        <p className="text-[10px] text-[#7b776c] mt-0.5">Phase 1 Certified Nurse Portal</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 min-h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#fcfaf6]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
