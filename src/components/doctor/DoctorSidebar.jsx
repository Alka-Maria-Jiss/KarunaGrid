import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Clock,
  Video,
  Home,
  Pill,
  FileSpreadsheet,
  Utensils,
  CalendarDays,
  Boxes,
  BarChart3,
  Bell,
  LogOut,
  X,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function DoctorSidebar({
  currentView = 'dashboard',
  onSelectView,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  unreadCount = 0,
  pendingCount = 0,
}) {
  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'PATIENT MANAGEMENT',
      items: [
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'registration_review', label: 'Patient Registration Review', icon: UserCheck, badge: pendingCount > 0 ? pendingCount : null },
        { id: 'medical_profiles', label: 'Medical Profiles', icon: FileText },
        { id: 'timeline', label: 'Patient Timeline', icon: Clock },
      ],
    },
    {
      title: 'CARE & TREATMENT',
      items: [
        { id: 'telemedicine', label: 'Telemedicine', icon: Video },
        { id: 'home_visits', label: 'Home Visits', icon: Home },
        { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
        { id: 'lab_reports', label: 'Laboratory Reports', icon: FileSpreadsheet },
        { id: 'nutrition', label: 'Nutrition / Meal Plans', icon: Utensils },
      ],
    },
    {
      title: 'REQUESTS & APPROVALS',
      items: [
        { id: 'schedule_changes', label: 'Schedule Change Requests', icon: CalendarDays },
        { id: 'equipment_requests', label: 'Equipment Requests', icon: Boxes },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
      ],
    },
  ];

  const handleNavClick = (id) => {
    if (onSelectView) onSelectView(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fdfbf7] border-r border-[#e9e2d5] text-[#1e1b14] w-[250px] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#e9e2d5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="KarunaGrid Official Logo"
            className="w-10 h-10 object-contain rounded-full shadow-sm bg-white p-0.5 border border-[#e0d9cc]"
          />
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-[#1e1b14] leading-tight">
              KarunaGrid
            </h1>
            <p className="text-[10px] font-bold text-[#645e45] uppercase tracking-wider">
              Doctor Portal
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5 pt-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#645e45] text-white shadow-2xs'
                        : 'text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-[#7b776c]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${
                          isActive
                            ? 'bg-white text-[#645e45]'
                            : 'bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc]'
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

      {/* Bottom Logout */}
      <div className="p-3 border-t border-[#e9e2d5]">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#ba1a1a] hover:bg-[#faf0ec] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#ba1a1a]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 flex-shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
