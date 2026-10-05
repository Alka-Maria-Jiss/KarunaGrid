import React, { useState, useEffect } from 'react';
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
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ListFilter,
  RefreshCw,
  AlertCircle,
  HeartHandshake
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { useNotifications } from '../../context/NotificationContext';

export default function NurseSidebar({
  activeTab,
  setActiveTab,
  unreadCount: propUnreadCount = 0,
  pendingRequestsCount = 0,
  pendingCaregiversCount = 0,
  availableAllocationsCount = null,
  isMobileOpen = false,
  setIsMobileOpen = () => {}
}) {
  const { unreadCount: contextUnreadCount } = useNotifications();
  const unreadCount = typeof contextUnreadCount === 'number' ? contextUnreadCount : propUnreadCount;

  const isHomeVisitChildActive = [
    'home_visits',
    'home_visits_all',
    'home_visits_completed',
    'completed_visits',
    'home_visits_schedules',
    'additional_requests',
    'urgent_requests',
    'visit_calendar',
    // legacy aliases
    'home_visits_my',
    'home_visits_available',
    'visit_allocations'
  ].includes(activeTab);

  const [isHomeVisitsExpanded, setIsHomeVisitsExpanded] = useState(true);

  // Auto-expand when any child is active
  useEffect(() => {
    if (isHomeVisitChildActive) {
      setIsHomeVisitsExpanded(true);
    }
  }, [activeTab, isHomeVisitChildActive]);

  const homeVisitChildren = [
    {
      id: 'home_visits_schedules',
      label: 'Recurring Schedules',
      icon: RefreshCw,
    },
    {
      id: 'home_visits_all',
      label: 'All Home Visits',
      icon: Home,
    },
    {
      id: 'home_visits_completed',
      label: 'Completed Visits',
      icon: CheckCircle2,
    },
    {
      id: 'additional_requests',
      label: 'Urgent Visit Requests',
      icon: AlertCircle,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    },
    {
      id: 'visit_calendar',
      label: 'Visit Calendar',
      icon: Calendar,
    },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  const toggleHomeVisitsGroup = () => {
    if (!isHomeVisitsExpanded) {
      setIsHomeVisitsExpanded(true);
      if (!isHomeVisitChildActive) {
        handleSelect('home_visits_all');
      }
    } else {
      setIsHomeVisitsExpanded(false);
    }
  };

  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
        {
          id: 'caregivers',
          label: 'Caregiver Management',
          icon: HeartHandshake,
          badge: pendingCaregiversCount > 0 ? pendingCaregiversCount : null,
        },
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
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {/* MAIN SECTION */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
            MAIN
          </div>
          <button
            onClick={() => handleSelect('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === 'dashboard'
                ? 'bg-[#645e45] text-white shadow-sm font-bold'
                : 'text-[#4a473d] hover:bg-[#f3ede2] hover:text-[#1e1b14]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-[#7b776c]'}`} />
              <span>Dashboard</span>
            </div>
          </button>
        </div>

        {/* HOME VISITS SECTION (EXPANDABLE GROUP + PEERS) */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
            HOME VISITS
          </div>

          <div className="space-y-1">
            {/* Expandable Group Header */}
            <button
              onClick={toggleHomeVisitsGroup}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isHomeVisitChildActive && !isHomeVisitsExpanded
                  ? 'bg-[#645e45] text-white shadow-sm font-bold'
                  : 'text-[#1e1b14] hover:bg-[#f3ede2]'
              }`}
            >
              <div className="flex items-center space-x-3 font-bold">
                <Home className={`w-4 h-4 ${isHomeVisitChildActive && !isHomeVisitsExpanded ? 'text-white' : 'text-[#645e45]'}`} />
                <span>Home Visit Management</span>
              </div>
              {isHomeVisitsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#7b776c]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#7b776c]" />
              )}
            </button>

            {/* Sub-Menu Items (Order: Recurring Schedules -> All Home Visits -> Urgent Visit Requests -> Visit Calendar) */}
            {isHomeVisitsExpanded && (
              <div className="ml-3 pl-3 border-l-2 border-[#e9e2d5] space-y-1 pt-0.5 pb-1">
                {homeVisitChildren.map((item) => {
                  const Icon = item.icon;
                  // Handle active state including aliases
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'home_visits_all' && (activeTab === 'home_visits' || activeTab === 'home_visits_my' || activeTab === 'home_visits_available' || activeTab === 'visit_allocations')) ||
                    (item.id === 'additional_requests' && activeTab === 'urgent_requests');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#645e45] text-white shadow-xs font-bold'
                          : 'text-[#4a473d] hover:bg-[#f3ede2] hover:text-[#1e1b14]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#7b776c]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge !== null && (
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                            isActive
                              ? 'bg-white text-[#645e45]'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* REMAINING SECTIONS: PATIENT CARE, CAREGIVER, LABORATORY, COMMUNICATION */}
        {navSections.slice(1).map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 mb-1.5 text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
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
