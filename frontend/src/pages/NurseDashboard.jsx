import React, { useState, useEffect } from 'react';
import NurseSidebar from '../components/nurse/NurseSidebar';
import NurseHeader from '../components/nurse/NurseHeader';
import NurseSummaryCards from '../components/nurse/NurseSummaryCards';
import NurseTodaySchedule from '../components/nurse/NurseTodaySchedule';
import NurseAdditionalVisitRequests from '../components/nurse/NurseAdditionalVisitRequests';
import NurseQuickActions from '../components/nurse/NurseQuickActions';
import NurseAllocatedVisits from '../components/nurse/NurseAllocatedVisits';
import NurseAlerts from '../components/nurse/NurseAlerts';
import NurseRecentActivity from '../components/nurse/NurseRecentActivity';

// Dedicated Sub-Views
import NurseHomeVisits from '../components/nurse/NurseHomeVisits';
import NurseVisitCalendar from '../components/nurse/NurseVisitCalendar';
import NurseCaregiverManagement from '../components/nurse/NurseCaregiverManagement';
import NursePatients from '../components/nurse/NursePatients';
import NursePatientMedicalRecords from '../components/nurse/NursePatientMedicalRecords';
import NursePatientTimeline from '../components/nurse/NursePatientTimeline';
import NurseLaboratoryReports from '../components/nurse/NurseLaboratoryReports';
import NurseNotifications from '../components/nurse/NurseNotifications';
import NurseProfileView from '../components/nurse/NurseProfileView';

// Modals
import NurseReviewRequestModal from '../components/nurse/NurseReviewRequestModal';
import NurseCompleteVisitModal from '../components/nurse/NurseCompleteVisitModal';
import NurseVisitSummaryModal from '../components/nurse/NurseVisitSummaryModal';

export default function NurseDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(user);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Selected Patient for Medical Records / Timeline routing
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Modals state
  const [reviewRequest, setReviewRequest] = useState(null);
  const [completeVisit, setCompleteVisit] = useState(null);
  const [summaryVisit, setSummaryVisit] = useState(null);

  // Available allocations count for sidebar badge
  const [availableAllocationsCount, setAvailableAllocationsCount] = useState(null);

  const fetchAvailableAllocationsCount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/nurse/home-visits/?tab=available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableAllocationsCount(data.length);
        }
      }
    } catch (err) {
      console.error('Error fetching available allocations count:', err);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/nurse/dashboard/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching nurse dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAvailableAllocationsCount();
  }, []);

  const handleToggleAvailability = async () => {
    setIsTogglingAvailability(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/nurse/availability/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardData((prev) => prev ? {
          ...prev,
          nurse_info: {
            ...prev.nurse_info,
            is_available_now: data.is_available_now,
          }
        } : prev);
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleQuickAction = (targetTab, actionId) => {
    setActiveTab(targetTab);
  };

  const handleViewMedicalProfile = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patient_records');
  };

  const handleViewTimeline = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patient_timeline');
  };

  const handleOpenCompleteModalFromSchedule = (visit) => {
    setCompleteVisit(visit);
  };

  const handleOpenSummaryModal = (visit) => {
    setSummaryVisit(visit);
  };

  const nurseInfo = dashboardData?.nurse_info || user?.details || {
    name: user?.name || 'Nurse',
    nurse_id: user?.details?.nurse_id || '---',
    is_available_now: true,
  };

  const unreadCount = dashboardData?.summary_cards?.unread_notifications || 0;
  const pendingRequestsCount = dashboardData?.additional_requests?.length || dashboardData?.summary_cards?.pending_requests || 0;
  const pendingCaregiversCount = dashboardData?.summary_cards?.caregiver_actions || dashboardData?.summary_cards?.pending_caregivers || 0;

  return (
    <div className="min-h-screen bg-[#fff9ef] flex text-[#1e1b14] font-sans antialiased">
      {/* Sidebar */}
      <NurseSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        pendingRequestsCount={pendingRequestsCount}
        pendingCaregiversCount={pendingCaregiversCount}
        availableAllocationsCount={availableAllocationsCount}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <NurseHeader
          nurse={dashboardData?.nurse_info || nurseInfo}
          unreadCount={unreadCount}
          onToggleAvailability={handleToggleAvailability}
          isTogglingAvailability={isTogglingAvailability}
          onLogout={onLogout}
          onOpenNotifications={() => setActiveTab('notifications')}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* EXACT FIVE SUMMARY CARDS */}
              <NurseSummaryCards
                metrics={dashboardData?.summary_cards || {}}
                isLoading={isLoading}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />

              {/* ROW 1: MONTHLY & TODAY'S SCHEDULE & ADDITIONAL VISIT REQUESTS */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <NurseTodaySchedule
                    schedule={dashboardData?.today_schedule || []}
                    isLoading={isLoading}
                    onOpenCompleteModal={handleOpenCompleteModalFromSchedule}
                    onViewAll={() => setActiveTab('visit_calendar')}
                    onNavigateCalendar={() => setActiveTab('visit_calendar')}
                  />
                </div>

                <div className="xl:col-span-1">
                  <NurseAdditionalVisitRequests
                    requests={dashboardData?.additional_requests || []}
                    isLoading={isLoading}
                    onReviewRequest={(req) => setReviewRequest(req)}
                    onViewAll={() => setActiveTab('additional_requests')}
                  />
                </div>
              </div>

              {/* ROW 2: QUICK ACTIONS & UPCOMING TEAM VISITS */}
              <div className="space-y-6">
                <NurseQuickActions
                  onActionClick={handleQuickAction}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <NurseAllocatedVisits
                    visits={dashboardData?.upcoming_allocated_visits || []}
                    isLoading={isLoading}
                    onOpenCompleteModal={(v) => setCompleteVisit(v)}
                    onViewAll={() => setActiveTab('home_visits_all')}
                  />

                  <NurseAlerts
                    alerts={dashboardData?.alerts_and_reminders || []}
                    isLoading={isLoading}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                </div>
              </div>

              {/* ROW 3: RECENT ACTIVITY */}
              <NurseRecentActivity
                activity={dashboardData?.recent_activity || []}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* HOME VISITS - MY VISITS (Default sub-page & legacy alias) */}
          {(activeTab === 'home_visits' || activeTab === 'home_visits_my') && (
            <NurseHomeVisits
              subPage="my_visits"
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
              onOpenSummaryModal={(v) => setSummaryVisit(v)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCounts={(cnt) => setAvailableAllocationsCount(cnt)}
            />
          )}

          {/* HOME VISITS - RECURRING SCHEDULES */}
          {activeTab === 'home_visits_schedules' && (
            <NurseHomeVisits
              subPage="schedules"
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
              onOpenSummaryModal={(v) => setSummaryVisit(v)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCounts={(cnt) => setAvailableAllocationsCount(cnt)}
            />
          )}

          {/* HOME VISITS - AVAILABLE FOR ALLOCATION (and legacy visit_allocations) */}
          {(activeTab === 'home_visits_available' || activeTab === 'visit_allocations') && (
            <NurseHomeVisits
              subPage="available"
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
              onOpenSummaryModal={(v) => setSummaryVisit(v)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCounts={(cnt) => setAvailableAllocationsCount(cnt)}
            />
          )}

          {/* HOME VISITS - ALL VISITS */}
          {activeTab === 'home_visits_all' && (
            <NurseHomeVisits
              subPage="all"
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
              onOpenSummaryModal={(v) => setSummaryVisit(v)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCounts={(cnt) => setAvailableAllocationsCount(cnt)}
            />
          )}

          {/* HOME VISITS - COMPLETED VISITS */}
          {(activeTab === 'home_visits_completed' || activeTab === 'completed_visits') && (
            <NurseHomeVisits
              subPage="completed"
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
              onOpenSummaryModal={(v) => setSummaryVisit(v)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCounts={(cnt) => setAvailableAllocationsCount(cnt)}
            />
          )}

          {/* VISIT CALENDAR TAB */}
          {activeTab === 'visit_calendar' && (
            <NurseVisitCalendar
              onOpenCompleteModal={(v) => setCompleteVisit(v)}
            />
          )}

          {/* ADDITIONAL VISIT REQUESTS TAB */}
          {activeTab === 'additional_requests' && (
            <div className="space-y-6">
              <NurseAdditionalVisitRequests
                requests={dashboardData?.additional_requests || []}
                isLoading={isLoading}
                onReviewRequest={(req) => setReviewRequest(req)}
                onViewAll={() => {}}
              />
            </div>
          )}

          {/* MY PATIENTS TAB */}
          {activeTab === 'patients' && (
            <NursePatients
              onViewMedicalProfile={handleViewMedicalProfile}
              onViewTimeline={handleViewTimeline}
              onViewHomeVisits={() => setActiveTab('home_visits_my')}
            />
          )}

          {/* PATIENT MEDICAL RECORDS TAB */}
          {activeTab === 'patient_records' && (
            <NursePatientMedicalRecords
              initialPatientId={selectedPatientId}
              onBack={() => setActiveTab('patients')}
            />
          )}

          {/* PATIENT TIMELINE TAB */}
          {activeTab === 'patient_timeline' && (
            <NursePatientTimeline
              initialPatientId={selectedPatientId}
            />
          )}

          {/* CAREGIVER MANAGEMENT TAB */}
          {activeTab === 'caregivers' && (
            <NurseCaregiverManagement />
          )}

          {/* LABORATORY REPORTS TAB */}
          {activeTab === 'lab_reports' && (
            <NurseLaboratoryReports />
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <NurseNotifications />
          )}


          {/* PROFILE VIEW TAB */}
          {activeTab === 'profile' && (
            <NurseProfileView
              user={currentUser || user}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                fetchDashboardData();
              }}
              onRefresh={fetchDashboardData}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {reviewRequest && (
        <NurseReviewRequestModal
          request={reviewRequest}
          onClose={() => setReviewRequest(null)}
          onApproved={() => fetchDashboardData()}
          onRescheduled={() => fetchDashboardData()}
        />
      )}

      {completeVisit && (
        <NurseCompleteVisitModal
          visit={completeVisit}
          onClose={() => setCompleteVisit(null)}
          onCompleted={() => fetchDashboardData()}
        />
      )}

      {summaryVisit && (
        <NurseVisitSummaryModal
          visit={summaryVisit}
          onClose={() => setSummaryVisit(null)}
          onUploaded={() => fetchDashboardData()}
        />
      )}
    </div>
  );
}
