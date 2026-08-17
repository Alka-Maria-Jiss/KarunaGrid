import React, { useState, useEffect } from 'react';
import PatientSidebar from '../components/patient/PatientSidebar';
import PatientHeader from '../components/patient/PatientHeader';
import PatientSummaryCards from '../components/patient/PatientSummaryCards';
import PatientHealthOverview from '../components/patient/PatientHealthOverview';
import PatientRecentRecords from '../components/patient/PatientRecentRecords';
import PatientUpcomingCare from '../components/patient/PatientUpcomingCare';
import PatientRequests from '../components/patient/PatientRequests';
import PatientTimelineCard from '../components/patient/PatientTimelineCard';

import PatientProfileView from '../components/patient/PatientProfileView';
import PatientMedicalHistoryView from '../components/patient/PatientMedicalHistoryView';
import PatientPrescriptionsView from '../components/patient/PatientPrescriptionsView';
import PatientLabReportsView from '../components/patient/PatientLabReportsView';
import PatientNutritionView from '../components/patient/PatientNutritionView';
import PatientTelemedicineView from '../components/patient/PatientTelemedicineView';
import PatientHomeVisitsView from '../components/patient/PatientHomeVisitsView';
import PatientEquipmentView from '../components/patient/PatientEquipmentView';
import PatientWelfareView from '../components/patient/PatientWelfareView';
import PatientCaregiverView from '../components/patient/PatientCaregiverView';
import PatientNotificationsView from '../components/patient/PatientNotificationsView';
import PatientFullTimelineView from '../components/patient/PatientFullTimelineView';

import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export default function PatientDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data States
  const [dashboardData, setDashboardData] = useState({
    patient_info: {},
    summary_cards: {},
    health_overview: {},
    recent_records: [],
    upcoming_care: [],
    my_requests: [],
    timeline: [],
  });

  const [medicalHistory, setMedicalHistory] = useState({});
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [homeVisitsData, setHomeVisitsData] = useState({ schedule: null, occurrences: [] });
  const [notifications, setNotifications] = useState([]);
  const [fullTimeline, setFullTimeline] = useState([]);

  const { showSuccess, showError } = useToast();

  const fetchPatientData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Consolidated Dashboard Data
      try {
        const dRes = await apiClient.get('/patient/dashboard/');
        setDashboardData(dRes || {});
      } catch (err) {
        console.warn('Dashboard fetch fallback:', err);
      }

      // 2. Fetch Medical History
      try {
        const medRes = await apiClient.get('/patient/medical-history/');
        setMedicalHistory(medRes || {});
      } catch (err) {
        console.warn('Medical history fetch:', err);
      }

      // 3. Fetch Prescriptions
      try {
        const rxRes = await apiClient.get('/patient/prescriptions/');
        setPrescriptions(rxRes || []);
      } catch (err) {
        console.warn('Prescriptions fetch:', err);
      }

      // 4. Fetch Lab Reports
      try {
        const labRes = await apiClient.get('/patient/lab-reports/');
        setLabReports(labRes || []);
      } catch (err) {
        console.warn('Lab reports fetch:', err);
      }

      // 5. Fetch Nutrition Plans
      try {
        const nutRes = await apiClient.get('/patient/nutrition/');
        setNutritionPlans(nutRes || []);
      } catch (err) {
        console.warn('Nutrition fetch:', err);
      }

      // 6. Fetch Home Visits
      try {
        const hvRes = await apiClient.get('/patient/home-visits/');
        setHomeVisitsData(hvRes || { schedule: null, occurrences: [] });
      } catch (err) {
        console.warn('Home visits fetch:', err);
      }

      // 7. Fetch Notifications
      try {
        const notifRes = await apiClient.get('/notifications/');
        setNotifications(notifRes || []);
      } catch (err) {
        console.warn('Notifications fetch:', err);
      }

      // 8. Fetch Full Timeline
      try {
        const timeRes = await apiClient.get('/patient/timeline/');
        setFullTimeline(timeRes || []);
      } catch (err) {
        console.warn('Timeline fetch:', err);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, []);

  const patientInfo = dashboardData.patient_info || {};
  const status = (patientInfo.registration_status || user?.status || 'PENDING').toUpperCase();
  const unreadCount = dashboardData.summary_cards?.unread_notifications_count ?? 0;

  const renderActiveView = () => {
    switch (currentView) {
      case 'profile':
        return (
          <PatientProfileView
            profile={patientInfo}
            onRefresh={fetchPatientData}
          />
        );

      case 'medical_history':
        return (
          <PatientMedicalHistoryView
            history={medicalHistory}
          />
        );

      case 'lab_reports':
        return (
          <PatientLabReportsView
            reports={labReports}
          />
        );

      case 'prescriptions':
        return (
          <PatientPrescriptionsView
            prescriptions={prescriptions}
          />
        );

      case 'nutrition':
        return (
          <PatientNutritionView
            nutritionPlans={nutritionPlans}
          />
        );

      case 'timeline':
        return (
          <PatientFullTimelineView
            timelineEvents={fullTimeline}
          />
        );

      case 'telemedicine':
        return (
          <PatientTelemedicineView
            userProfile={user}
            onRefresh={fetchPatientData}
          />
        );

      case 'home_visits':
        return (
          <PatientHomeVisitsView
            homeVisitsData={homeVisitsData}
            onRefresh={fetchPatientData}
          />
        );

      case 'schedule_change':
        return (
          <PatientHomeVisitsView
            homeVisitsData={homeVisitsData}
            onRefresh={fetchPatientData}
            initialModal="schedule_change"
          />
        );

      case 'equipment':
        return (
          <PatientEquipmentView
            onRefresh={fetchPatientData}
          />
        );

      case 'welfare_schemes':
        return (
          <PatientWelfareView
            initialTab="schemes"
            onRefresh={fetchPatientData}
          />
        );

      case 'my_applications':
        return (
          <PatientWelfareView
            initialTab="applications"
            onRefresh={fetchPatientData}
          />
        );

      case 'caregiver':
        return (
          <PatientCaregiverView />
        );

      case 'notifications':
        return (
          <PatientNotificationsView
            notifications={notifications}
            onRefresh={fetchPatientData}
          />
        );

      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            {/* REGISTRATION STATUS ALERT (IF PENDING OR REJECTED) */}
            {status === 'PENDING' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fffdfa] border border-amber-300 flex items-start gap-3.5 shadow-2xs">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950">
                    Registration Pending Doctor Verification
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5 font-medium leading-relaxed">
                    Your medical discharge summary is currently being reviewed by an assigned Doctor. You will receive an alert once clinical verification is finalized.
                  </p>
                </div>
              </div>
            )}

            {status === 'REJECTED' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3.5 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-rose-950">
                    Registration Clinical Review Incomplete
                  </h3>
                  <p className="text-xs text-rose-900 mt-0.5 font-medium leading-relaxed">
                    {patientInfo.rejection_reason || 'Please upload an updated or legible discharge summary document.'}
                  </p>
                </div>
              </div>
            )}

            {/* 1. EXACTLY FIVE SUMMARY CARDS */}
            <PatientSummaryCards
              summary={dashboardData.summary_cards || {}}
              onNavigate={setCurrentView}
            />

            {/* 2. SECTION A & SECTION B: MY HEALTH OVERVIEW & RECENT RECORDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PatientHealthOverview
                healthData={dashboardData.health_overview || {}}
                onNavigate={setCurrentView}
              />
              <PatientRecentRecords
                records={dashboardData.recent_records || []}
                onNavigate={setCurrentView}
              />
            </div>

            {/* 3. LOWER SECTION: UPCOMING CARE & MY REQUESTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PatientUpcomingCare
                careItems={dashboardData.upcoming_care || []}
                onNavigate={setCurrentView}
              />
              <PatientRequests
                requests={dashboardData.my_requests || []}
                onNavigate={setCurrentView}
              />
            </div>

            {/* 4. BOTTOM SECTION: PATIENT TIMELINE */}
            <PatientTimelineCard
              timeline={dashboardData.timeline || []}
              onNavigate={setCurrentView}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#fff9ef] text-[#1e1b14] font-sans antialiased flex flex-row selection:bg-[#b5ad8f] selection:text-[#1e1b14]">
      {/* Left Sidebar (240–260px) */}
      <PatientSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        onLogout={onLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <PatientHeader
          patientInfo={patientInfo}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
          onLogout={onLogout}
          onNavigate={setCurrentView}
          unreadCount={unreadCount}
        />

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderActiveView()}
        </main>

        {/* Subtle Footer */}
        <footer className="py-4 px-6 border-t border-[#e9e2d5] bg-[#fdfbf7] text-center text-xs text-[#7b776c]">
          <p>© 2026 KarunaGrid Care Network. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
