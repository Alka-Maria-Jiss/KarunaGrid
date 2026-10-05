import React, { useState, useEffect } from 'react';
import DoctorSidebar from '../components/doctor/DoctorSidebar';
import DoctorHeader from '../components/doctor/DoctorHeader';
import DoctorSummaryCards from '../components/doctor/DoctorSummaryCards';
import DoctorSchedule from '../components/doctor/DoctorSchedule';
import PendingRegistrations from '../components/doctor/PendingRegistrations';
import DoctorQuickActions from '../components/doctor/DoctorQuickActions';
import UpcomingHomeVisits from '../components/doctor/UpcomingHomeVisits';
import DoctorAlerts from '../components/doctor/DoctorAlerts';
import RecentPatientActivity from '../components/doctor/RecentPatientActivity';
import DoctorRegistrationDetailModal from '../components/doctor/DoctorRegistrationDetailModal';

// Dedicated Sub-views & Patient Workspace
import DoctorPatientWorkspace from '../components/doctor/DoctorPatientWorkspace';
import DoctorPatients from '../components/doctor/DoctorPatients';
import DoctorRegistrationReview from '../components/doctor/DoctorRegistrationReview';
import DoctorTelemedicine from '../components/doctor/DoctorTelemedicine';
import DoctorHomeVisits from '../components/doctor/DoctorHomeVisits';
import DoctorVisitCalendar from '../components/doctor/DoctorVisitCalendar';
import DoctorScheduleChanges from '../components/doctor/DoctorScheduleChanges';
import DoctorEquipmentRequests from '../components/doctor/DoctorEquipmentRequests';
import DoctorReports from '../components/doctor/DoctorReports';
import DoctorNotifications from '../components/doctor/DoctorNotifications';
import DoctorProfileView from '../components/doctor/DoctorProfileView';

import { RefreshCw } from 'lucide-react';

export default function DoctorDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(user);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('profile');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorData, setDoctorData] = useState(null);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [reviewModalPatient, setReviewModalPatient] = useState(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // 1. Authenticated Doctor verification & Dashboard data load
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        if (onLogout) onLogout();
        else window.location.href = '/login';
        return;
      }

      const res = await fetch('http://127.0.0.1:8000/api/doctor/dashboard/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDoctorData(data);
      } else if (res.status === 401 || res.status === 403) {
        if (onLogout) onLogout();
        else window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error loading doctor dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 2. Toggle Doctor Availability
  const handleToggleAvailability = async (newStatus) => {
    setIsTogglingAvailability(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/doctor/availability/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available_now: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setDoctorData((prev) => ({
          ...prev,
          doctor_info: {
            ...prev?.doctor_info,
            is_available_now: data.is_available_now,
          },
        }));
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  // 3. Approve Registration Modal Actions
  const handleModalApprove = async (patientId) => {
    setIsProcessingApproval(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setReviewModalPatient(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error approving registration:', err);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleModalReject = async (patientId, reason) => {
    setIsProcessingApproval(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      if (res.ok) {
        setReviewModalPatient(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error rejecting registration:', err);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // 4. Logout
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Sidebar navigation switcher
  const handleSelectView = (view) => {
    setCurrentView(view);
    if (view === 'prescriptions') {
      setActiveWorkspaceTab('prescriptions');
    } else if (view === 'lab_reports') {
      setActiveWorkspaceTab('lab_reports');
    } else if (view === 'nutrition') {
      setActiveWorkspaceTab('nutrition');
    } else if (view === 'medical_profiles') {
      setActiveWorkspaceTab('profile');
    } else if (view === 'timeline') {
      setActiveWorkspaceTab('timeline');
    } else if (view === 'patients') {
      setActiveWorkspaceTab('profile');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenWorkspaceForPatient = (patientId, tab = 'profile') => {
    setSelectedPatientId(patientId);
    setActiveWorkspaceTab(tab);
    setCurrentView('patients');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff9ef] flex flex-col items-center justify-center text-[#645e45] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="font-extrabold text-sm tracking-tight text-[#1e1b14]">
          Loading KarunaGrid Doctor Portal...
        </p>
      </div>
    );
  }

  const doctorInfo = doctorData?.doctor_info || {};
  const summary = doctorData?.summary_cards || {};
  const todaySchedule = doctorData?.today_schedule || [];
  const pendingRegistrations = doctorData?.pending_registrations || [];
  const upcomingHomeVisits = doctorData?.upcoming_home_visits || [];
  const alerts = doctorData?.alerts_and_reminders || [];
  const recentActivity = doctorData?.recent_patient_activity || [];

  return (
    <div className="min-h-screen bg-[#fff9ef] flex">
      {/* 240-260px DESKTOP SIDEBAR + MOBILE DRAWER */}
      <DoctorSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        pendingCount={summary.pending_registrations ?? pendingRegistrations.length}
        pendingCounts={{
          registrations: summary.pending_registrations ?? pendingRegistrations.length,
          equipment: summary.pending_equipment ?? 0,
        }}
        unreadCount={summary.unread_notifications ?? alerts.length}
      />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* HEADER */}
        <DoctorHeader
          doctorInfo={doctorInfo}
          onOpenMobile={() => setIsMobileOpen(true)}
          onLogout={handleLogout}
          onNavigate={(view) => handleSelectView(view)}
          onToggleAvailability={handleToggleAvailability}
          isTogglingAvailability={isTogglingAvailability}
          unreadCount={alerts.length}
        />

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. MASTER DASHBOARD SUMMARY VIEW */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              {/* EXACTLY FIVE SUMMARY CARDS */}
              <DoctorSummaryCards
                summary={summary}
                onNavigate={(view) => handleSelectView(view)}
              />

              {/* 2-COLUMN SECTION 1: CLINICAL SCHEDULE & CALENDAR | PENDING PATIENT REGISTRATIONS */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <DoctorSchedule
                    schedule={todaySchedule}
                    onNavigate={(view) => handleSelectView(view)}
                  />
                </div>
                <div className="xl:col-span-1">
                  <PendingRegistrations
                    registrations={pendingRegistrations}
                    onReview={(patient) => setReviewModalPatient(patient)}
                    onNavigate={(view) => handleSelectView(view)}
                  />
                </div>
              </div>

              {/* 2-COLUMN SECTION 2: CLINICAL QUICK ACTIONS | UPCOMING HOME VISITS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DoctorQuickActions
                  onNavigate={(view) => handleSelectView(view)}
                />
                <UpcomingHomeVisits
                  visits={upcomingHomeVisits}
                  onNavigate={(view) => handleSelectView(view)}
                />
              </div>

              {/* 2-COLUMN SECTION 3: ALERTS & REMINDERS | RECENT PATIENT ACTIVITY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DoctorAlerts
                  alerts={alerts}
                  onNavigate={(view) => handleSelectView(view)}
                />
                <RecentPatientActivity
                  activities={recentActivity}
                  onNavigate={(view) => handleSelectView(view)}
                />
              </div>
            </div>
          )}

          {/* 2. DEDICATED PATIENT MANAGEMENT & CLINICAL WORKSPACE SUB-VIEWS */}
          {currentView === 'patients' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab={activeWorkspaceTab || 'profile'}
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                onSelectPatient={(pId, tab) => handleOpenWorkspaceForPatient(pId, tab || 'profile')}
              />
            )
          )}

          {currentView === 'medical_profiles' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab="profile"
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                contextIntent="profile"
                contextTitle="Select Patient for Medical Profile"
                onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'profile')}
              />
            )
          )}

          {currentView === 'timeline' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab="timeline"
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                contextIntent="timeline"
                contextTitle="Select Patient for Clinical Timeline"
                onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'timeline')}
              />
            )
          )}

          {currentView === 'prescriptions' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab="prescriptions"
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                contextIntent="prescriptions"
                contextTitle="Select Patient to Manage Prescriptions"
                onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'prescriptions')}
              />
            )
          )}

          {currentView === 'lab_reports' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab="lab_reports"
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                contextIntent="lab_reports"
                contextTitle="Select Patient for Laboratory Reports"
                onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'lab_reports')}
              />
            )
          )}

          {currentView === 'nutrition' && (
            selectedPatientId ? (
              <DoctorPatientWorkspace
                patientId={selectedPatientId}
                initialTab="nutrition"
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <DoctorPatients
                contextIntent="nutrition"
                contextTitle="Select Patient for Nutrition & Meal Plans"
                onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'nutrition')}
              />
            )
          )}

          {currentView === 'registration_review' && (
            <DoctorRegistrationReview
              onRefreshStats={fetchDashboardData}
            />
          )}

          {/* OTHER DOCTOR MODULES (Preserved Exactly) */}
          {currentView === 'telemedicine' && (
            <DoctorTelemedicine />
          )}

          {currentView === 'home_visits' && (
            <DoctorHomeVisits />
          )}

          {currentView === 'visit_calendar' && (
            <DoctorVisitCalendar
              onSelectPatient={(pId) => handleOpenWorkspaceForPatient(pId, 'profile')}
              onNavigate={(view) => handleSelectView(view)}
            />
          )}

          {currentView === 'schedule_changes' && (
            <DoctorScheduleChanges />
          )}

          {currentView === 'equipment_requests' && (
            <DoctorEquipmentRequests />
          )}

          {currentView === 'reports' && (
            <DoctorReports />
          )}

          {currentView === 'profile' && (
            <DoctorProfileView
              user={currentUser || user}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                fetchDashboardData();
              }}
              onRefresh={fetchDashboardData}
            />
          )}

          {currentView === 'notifications' && (
            <DoctorNotifications />
          )}

        </main>

        {/* FOOTER */}
        <footer className="mt-auto border-t border-[#e9e2d5] bg-[#fdfbf7] py-4 px-6 text-center text-xs text-[#7b776c] font-medium">
          <p>© 2026 KarunaGrid Care Network. All rights reserved.</p>
        </footer>
      </div>

      {/* QUICK REGISTRATION REVIEW MODAL (From Dashboard Widget) */}
      {reviewModalPatient && (
        <DoctorRegistrationDetailModal
          patient={reviewModalPatient}
          onClose={() => setReviewModalPatient(null)}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
          isProcessing={isProcessingApproval}
        />
      )}
    </div>
  );
}
