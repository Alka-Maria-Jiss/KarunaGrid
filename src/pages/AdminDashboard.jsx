import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSummaryCards from '../components/admin/AdminSummaryCards';
import AdminEquipmentOverview from '../components/admin/AdminEquipmentOverview';
import AdminOverviewChart from '../components/admin/AdminOverviewChart';
import AdminAdministrativeChart from '../components/admin/AdminAdministrativeChart';
import AdminActionQueue from '../components/admin/AdminActionQueue';
import AdminActivityFeed from '../components/admin/AdminActivityFeed';
import AdminDoctorManagement from '../components/admin/AdminDoctorManagement';
import AdminNurseManagement from '../components/admin/AdminNurseManagement';
import AdminCaregiverVerification from '../components/admin/AdminCaregiverVerification';
import AdminPatientView from '../components/admin/AdminPatientView';
import AdminUserManagement from '../components/admin/AdminUserManagement';
import AdminWelfareSchemes from '../components/admin/AdminWelfareSchemes';
import AdminEquipmentManagement from '../components/admin/AdminEquipmentManagement';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminReportsAnalytics from '../components/admin/AdminReportsAnalytics';
import AdminSystemMonitoring from '../components/admin/AdminSystemMonitoring';
import CaregiverDetailModal from '../components/admin/CaregiverDetailModal';

import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data States
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [pendingCaregivers, setPendingCaregivers] = useState([]);
  const [welfareSchemes, setWelfareSchemes] = useState([]);
  const [welfareApps, setWelfareApps] = useState([]);
  const [equipmentData, setEquipmentData] = useState({ types: [], units: [] });
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activities, setActivities] = useState([]);

  // Modal / Review States
  const [reviewCaregiverModal, setReviewCaregiverModal] = useState(null);
  const [reviewWelfareAppModal, setReviewWelfareAppModal] = useState(null);

  const { showSuccess, showError } = useToast();

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Stats & Charts
      try {
        const statsRes = await apiClient.get('/admin/stats/');
        setStats(statsRes || {});
      } catch (err) {
        console.warn('Stats endpoint fallback:', err);
      }

      // 2. Fetch Pending Caregivers
      try {
        const cgRes = await apiClient.get('/admin/caregivers/pending/');
        setPendingCaregivers(cgRes || []);
      } catch (err) {
        console.warn('Pending caregivers fetch:', err);
      }

      // 3. Fetch All Users
      try {
        const usersRes = await apiClient.get('/admin/users/');
        setUsers(usersRes || []);
      } catch (err) {
        console.warn('Users fetch:', err);
      }

      // 4. Fetch Welfare Schemes & Applications
      try {
        const schemesRes = await apiClient.get('/admin/welfare-schemes/');
        setWelfareSchemes(schemesRes || []);
      } catch (err) {
        console.warn('Welfare schemes fetch:', err);
      }

      try {
        const appsRes = await apiClient.get('/admin/welfare-applications/');
        setWelfareApps(appsRes || []);
      } catch (err) {
        console.warn('Welfare applications fetch:', err);
      }

      // 5. Fetch Equipment Data
      try {
        const eqRes = await apiClient.get('/admin/equipment/');
        setEquipmentData(eqRes || { types: [], units: [] });
      } catch (err) {
        console.warn('Equipment fetch:', err);
      }

      // 6. Fetch Read-only Patients List
      try {
        const patRes = await apiClient.get('/admin/patients/');
        setPatients(patRes || []);
      } catch (err) {
        console.warn('Patients fetch:', err);
      }

      // 7. Fetch Activity Feed
      try {
        const actRes = await apiClient.get('/admin/activities/');
        setActivities(actRes || []);
      } catch (err) {
        console.warn('Activities fetch:', err);
      }

      // 8. Fetch Notifications
      try {
        const notifRes = await apiClient.get('/admin/notifications/');
        setNotifications(notifRes || []);
      } catch (err) {
        console.warn('Notifications fetch:', err);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveCaregiverDirect = async (caregiver) => {
    try {
      const res = await apiClient.post(`/admin/caregivers/${caregiver.caregiver_id}/approve/`);
      showSuccess(res.message || `Caregiver ${caregiver.name} approved successfully.`);
      setReviewCaregiverModal(null);
      fetchDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to approve caregiver.');
    }
  };

  // Extract filtered lists for Doctors, Nurses, and Caregivers
  const doctorsList = users.filter((u) => u.role?.toLowerCase() === 'doctor');
  const nursesList = users.filter((u) => u.role?.toLowerCase() === 'nurse');
  const caregiversList = users.filter((u) => u.role?.toLowerCase() === 'caregiver');

  const pendingWelfareCount = welfareApps.filter(
    (a) => a.status === 'Submitted' || a.status === 'UnderReview'
  ).length;

  const pendingCounts = {
    caregivers: pendingCaregivers.length,
    welfare: pendingWelfareCount,
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'doctors':
        return (
          <AdminDoctorManagement
            doctors={doctorsList}
            onRefresh={fetchDashboardData}
          />
        );

      case 'nurses':
        return (
          <AdminNurseManagement
            nurses={nursesList}
            onRefresh={fetchDashboardData}
          />
        );

      case 'caregivers':
        return (
          <AdminCaregiverVerification
            caregivers={caregiversList}
            pendingCaregivers={pendingCaregivers}
            onRefresh={fetchDashboardData}
          />
        );

      case 'caregiver_verification':
        return (
          <AdminCaregiverVerification
            caregivers={caregiversList}
            pendingCaregivers={pendingCaregivers}
            onRefresh={fetchDashboardData}
          />
        );

      case 'patients':
        return <AdminPatientView patients={patients} />;

      case 'all_users':
        return (
          <AdminUserManagement
            users={users}
            onRefresh={fetchDashboardData}
            onNavigate={setCurrentView}
          />
        );

      case 'welfare_schemes':
        return (
          <AdminWelfareSchemes
            schemes={welfareSchemes}
            applications={welfareApps}
            onRefresh={fetchDashboardData}
            initialTab="schemes"
          />
        );

      case 'welfare_applications':
        return (
          <AdminWelfareSchemes
            schemes={welfareSchemes}
            applications={welfareApps}
            onRefresh={fetchDashboardData}
            initialTab="applications"
          />
        );

      case 'equipment':
        return (
          <AdminEquipmentManagement
            equipment={equipmentData}
            onRefresh={fetchDashboardData}
          />
        );

      case 'notifications':
        return (
          <AdminNotifications
            notifications={notifications}
            onRefresh={fetchDashboardData}
          />
        );

      case 'reports':
      case 'analytics':
        return <AdminReportsAnalytics stats={stats.summary_cards || {}} users={users} />;

      case 'system_monitoring':
        return <AdminSystemMonitoring stats={stats} activities={activities} />;

      case 'activity_logs':
        return (
          <div className="space-y-5">
            <AdminActivityFeed activities={activities} onNavigate={setCurrentView} />
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            {/* 1. TOP SUMMARY CARDS (5 Dynamic Cards) */}
            <AdminSummaryCards
              stats={stats.summary_cards || {}}
              onNavigate={setCurrentView}
            />

            {/* 2. EQUIPMENT STATUS OVERVIEW */}
            <AdminEquipmentOverview
              equipment={stats.equipment_overview || {}}
              onNavigate={setCurrentView}
            />

            {/* 3. MAIN DASHBOARD ANALYTICS (Two-column layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Overview Summary Line Chart */}
              <div className="lg:col-span-2">
                <AdminOverviewChart chartData={stats.overview_chart || {}} />
              </div>

              {/* Right 1 Col: Administrative Overview Donut Chart */}
              <div className="lg:col-span-1">
                <AdminAdministrativeChart donutData={stats.donut_data || []} />
              </div>
            </div>

            {/* 4. ADMIN ACTION QUEUE & RECENT SYSTEM ACTIVITIES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Admin Action Queue (Caregiver Verification & Welfare Applications ONLY) */}
              <div className="lg:col-span-2">
                <AdminActionQueue
                  pendingCaregivers={pendingCaregivers}
                  pendingWelfareApps={welfareApps.filter((a) => a.status === 'Submitted')}
                  onReviewCaregiver={(cg) => setReviewCaregiverModal(cg)}
                  onReviewWelfareApp={() => setCurrentView('welfare_applications')}
                  onNavigate={setCurrentView}
                />
              </div>

              {/* Right 1 Col: Recent System Activities */}
              <div className="lg:col-span-1">
                <AdminActivityFeed activities={activities} onNavigate={setCurrentView} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#fff9ef] text-[#1e1b14] font-sans antialiased flex flex-row selection:bg-[#b5ad8f] selection:text-[#1e1b14]">
      {/* Left Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        onLogout={onLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingCounts={pendingCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <AdminHeader
          user={user}
          currentView={currentView}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
          onLogout={onLogout}
          pendingAlertCount={pendingCaregivers.length + pendingWelfareCount}
        />

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-[#e9e2d5] bg-[#fdfbf7] text-center text-xs text-[#7b776c]">
          <p>© 2026 KarunaGrid Care Network. All rights reserved.</p>
        </footer>
      </div>

      {/* Modal for Reviewing Caregiver from Action Queue */}
      {reviewCaregiverModal && (
        <CaregiverDetailModal
          caregiver={reviewCaregiverModal}
          onClose={() => setReviewCaregiverModal(null)}
          onApprove={handleApproveCaregiverDirect}
          onRejectPrompt={() => {
            setReviewCaregiverModal(null);
            setCurrentView('caregiver_verification');
          }}
        />
      )}
    </div>
  );
}
