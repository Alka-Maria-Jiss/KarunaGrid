import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  Phone,
  MapPin,
  FileText,
  Award,
  Users,
  Send,
  Check,
  X,
  Star,
  AlertTriangle,
  Plus,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Calendar,
  Home,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import CaregiverSidebar from '../components/caregiver/CaregiverSidebar';
import CaregiverHeader from '../components/caregiver/CaregiverHeader';
import CaregiverProfileView from '../components/caregiver/CaregiverProfileView';
import CaregiverNotifications from '../components/caregiver/CaregiverNotifications';
import CaregiverSettings from '../components/caregiver/CaregiverSettings';

export default function CaregiverDashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  const activeUser = currentUser || user;
  const status = (activeUser?.status || activeUser?.details?.verification_status || 'PENDING').toUpperCase();
  const isApproved = status === 'APPROVED';
  const rejectionReason = activeUser?.rejection_reason || activeUser?.details?.rejection_reason;
  const details = activeUser?.details || {};

  // 6 Views matching the Sidebar:
  // 'dashboard' | 'assignments' | 'visits' | 'profile' | 'notifications' | 'settings'
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeAssignmentData, setActiveAssignmentData] = useState(null);
  const [requestsList, setRequestsList] = useState([]);
  const [historyData, setHistoryData] = useState({ history: [], average_rating: 5.0, total_reviews: 0 });
  const [complaintsList, setComplaintsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    subject: '',
    category: 'Patient-related',
    description: '',
    attachment: null,
  });

  const [rejectRequestModal, setRejectRequestModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const { unreadCount = 0 } = useNotifications() || {};

  const loadCaregiverData = async () => {
    if (!isApproved) return;
    setIsLoading(true);
    try {
      const [assignRes, reqRes, histRes, compRes] = await Promise.allSettled([
        apiClient.get('/caregiver/assignment/'),
        apiClient.get('/caregiver/requests/'),
        apiClient.get('/caregiver/care-history/'),
        apiClient.get('/caregiver/complaints/'),
      ]);

      if (assignRes.status === 'fulfilled') {
        setActiveAssignmentData(assignRes.value || null);
      }
      if (reqRes.status === 'fulfilled') {
        setRequestsList(Array.isArray(reqRes.value) ? reqRes.value : []);
      }
      if (histRes.status === 'fulfilled') {
        setHistoryData(histRes.value || { history: [], average_rating: 5.0, total_reviews: 0 });
      }
      if (compRes.status === 'fulfilled') {
        setComplaintsList(Array.isArray(compRes.value) ? compRes.value : []);
      }
    } catch (err) {
      console.error('Error loading caregiver dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaregiverData();
  }, [isApproved]);

  // Accept Caregiver Request
  const handleAcceptRequest = async (requestId, patientName) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/caregiver/requests/${requestId}/accept/`);
      showSuccess(res.message || `Care request for ${patientName} accepted. Care is now active.`);
      loadCaregiverData();
      setCurrentView('assignments');
    } catch (err) {
      showError(err.message || 'Failed to accept care request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Caregiver Request
  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!rejectRequestModal) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/caregiver/requests/${rejectRequestModal.request_id}/reject/`, {
        reason: rejectReason.trim(),
      });
      showSuccess(res.message || 'Care request declined.');
      setRejectRequestModal(null);
      setRejectReason('');
      loadCaregiverData();
    } catch (err) {
      showError(err.message || 'Failed to reject request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Active Care Assignment
  const handleCompleteCare = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/caregiver/assignment/complete/', {
        notes: completeNotes.trim(),
      });
      showSuccess(res.message || 'Care assignment marked as completed! You are now available for new requests.');
      setShowCompleteModal(false);
      setCompleteNotes('');
      loadCaregiverData();
    } catch (err) {
      showError(err.message || 'Failed to complete care assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Complaint / Grievance
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.subject.trim() || !complaintForm.description.trim()) {
      showError('Please fill in both subject and description.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', complaintForm.subject.trim());
      formData.append('category', complaintForm.category);
      formData.append('description', complaintForm.description.trim());
      if (complaintForm.attachment) {
        formData.append('attachment', complaintForm.attachment);
      }

      const res = await apiClient.post('/caregiver/complaints/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showSuccess(res.message || 'Complaint submitted successfully.');
      setShowComplaintModal(false);
      setComplaintForm({ subject: '', category: 'Patient-related', description: '', attachment: null });
      loadCaregiverData();
    } catch (err) {
      showError(err.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRequestsCount = requestsList.filter((r) => r.status === 'Pending').length;
  const hasActiveAssignment = activeAssignmentData?.has_active_assignment;
  const currentAssignment = activeAssignmentData?.assignment;

  return (
    <div className="min-h-screen bg-[#fff9ef] flex text-[#1e1b14] font-sans antialiased">
      {/* 1. SIDEBAR MATCHING USER SPECIFICATION */}
      <CaregiverSidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={onLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* 2. MAIN VIEWPORT & HEADER */}
      <div className="flex-1 flex flex-col min-w-0">
        <CaregiverHeader
          caregiver={activeUser}
          unreadCount={unreadCount}
          hasActiveAssignment={hasActiveAssignment}
          onLogout={onLogout}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={(view) => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* TOP STATUS BANNERS */}
          {status === 'PENDING' && (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 flex items-start gap-4 shadow-sm animate-in fade-in">
              <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-amber-950">Registration Pending Nurse Verification</h3>
                <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                  Your caregiver application and identity proof document are currently being reviewed by the KarunaGrid nursing team. You will receive an approval email and notification once your account is verified.
                </p>
              </div>
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-300 flex items-start gap-4 shadow-sm animate-in fade-in">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-rose-950">Registration Not Approved</h3>
                <p className="text-xs sm:text-sm text-rose-900 font-medium leading-relaxed">
                  Your caregiver verification application was reviewed and could not be approved at this time.
                </p>
                {rejectionReason && (
                  <div className="mt-3 p-3 bg-white/90 rounded-xl border border-rose-200 text-xs font-bold text-rose-950">
                    <strong>Reason:</strong> {rejectionReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD VIEW (Overview, Metrics, Quick Cards) */}
          {/* ======================================================== */}
          {currentView === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* METRICS & QUICK SUMMARY */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
                  <span className="text-[11px] font-bold text-[#7b776c] uppercase block">Caregiver Status</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${hasActiveAssignment ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm font-black text-[#1e1b14]">
                      {hasActiveAssignment ? 'Assigned (Busy)' : 'Available for Care'}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
                  <span className="text-[11px] font-bold text-[#7b776c] uppercase block">Average Rating</span>
                  <div className="flex items-center space-x-1.5 text-amber-600 font-black text-lg mt-0.5">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{historyData.average_rating || '5.0'}</span>
                    <span className="text-xs text-[#7b776c] font-normal">({historyData.total_reviews} reviews)</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
                  <span className="text-[11px] font-bold text-[#7b776c] uppercase block">Patient Requests</span>
                  <p className="text-xl font-black text-[#1e1b14] mt-0.5">
                    {pendingRequestsCount} <span className="text-xs font-normal text-[#7b776c]">pending</span>
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
                  <span className="text-[11px] font-bold text-[#7b776c] uppercase block">Completed Care</span>
                  <p className="text-xl font-black text-[#1e1b14] mt-0.5">
                    {historyData.total_completed_patients || historyData.history?.length || 0} <span className="text-xs font-normal text-[#7b776c]">patients</span>
                  </p>
                </div>
              </div>

              {/* ACTIVE PATIENT ASSIGNMENT PREVIEW */}
              <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#645e45]" />
                    <h3 className="font-black text-base text-[#1e1b14]">Current Patient Assignment</h3>
                  </div>
                  <button
                    onClick={() => setCurrentView('assignments')}
                    className="text-xs font-bold text-[#645e45] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Assignments</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {hasActiveAssignment && currentAssignment ? (
                  <div className="p-5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#f8f3eb] text-[#7a6449] flex items-center justify-center font-black text-xl border border-[#e8dccb]">
                        {currentAssignment.patient_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#1e1b14]">
                            {currentAssignment.patient_name}
                          </h4>
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Active Care
                          </span>
                        </div>
                        <p className="text-xs text-[#7b776c] mt-0.5">
                          {currentAssignment.patient_house_name}, {currentAssignment.patient_place} • Phone: {currentAssignment.patient_phone || 'N/A'}
                        </p>
                        <p className="text-[11px] text-[#7b776c]">
                          Assigned: {currentAssignment.assigned_at?.slice(0, 10)} • Nurse: {currentAssignment.assigned_by_nurse_name}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all self-start md:self-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Patient Care</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600/50 mx-auto" />
                    <p className="text-sm font-bold text-[#1e1b14]">Available for Patient Assignments</p>
                    <p className="text-xs text-[#7b776c] max-w-md mx-auto">
                      You are currently available. Patients and supervising nurses in your coverage zone can request your palliative care support.
                    </p>
                  </div>
                )}
              </div>

              {/* ROW: PENDING REQUESTS & RECENT REVIEWS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Requests Preview */}
                <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#645e45]" />
                      <h3 className="font-black text-sm text-[#1e1b14]">Pending Care Requests</h3>
                    </div>
                    <button
                      onClick={() => setCurrentView('assignments')}
                      className="text-xs font-bold text-[#645e45] hover:underline"
                    >
                      View all ({requestsList.length})
                    </button>
                  </div>

                  {requestsList.filter((r) => r.status === 'Pending').length === 0 ? (
                    <p className="text-xs text-[#7b776c] p-6 text-center">
                      No pending care requests. New incoming requests will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {requestsList
                        .filter((r) => r.status === 'Pending')
                        .slice(0, 2)
                        .map((req) => (
                          <div
                            key={req.request_id}
                            className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <p className="font-extrabold text-[#1e1b14]">{req.patient_name}</p>
                              <p className="text-[11px] text-[#7b776c]">
                                {req.patient_place} • Phone: {req.patient_phone}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAcceptRequest(req.request_id, req.patient_name)}
                              disabled={isSubmitting || hasActiveAssignment}
                              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl ${
                                hasActiveAssignment
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                              }`}
                            >
                              Accept
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Recent Reviews Preview */}
                <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#645e45]" />
                      <h3 className="font-black text-sm text-[#1e1b14]">Recent Patient Feedback</h3>
                    </div>
                    <button
                      onClick={() => setCurrentView('visits')}
                      className="text-xs font-bold text-[#645e45] hover:underline"
                    >
                      View history ({historyData.history?.length || 0})
                    </button>
                  </div>

                  {historyData.history?.length === 0 ? (
                    <p className="text-xs text-[#7b776c] p-6 text-center">
                      No feedback recorded yet. Ratings from completed care assignments will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {historyData.history.slice(0, 2).map((item) => (
                        <div
                          key={item.assignment_id}
                          className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-extrabold text-[#1e1b14]">{item.patient_name}</p>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-900">
                              {item.status}
                            </span>
                          </div>
                          {item.feedback ? (
                            <div className="flex items-center gap-1 text-amber-600 font-bold text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{item.feedback.rating}/5</span>
                              {item.feedback.comment && (
                                <span className="text-[#7b776c] italic font-normal ml-1 truncate max-w-[200px]">
                                  "{item.feedback.comment}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#7b776c] italic">No written comment</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MY ASSIGNMENTS VIEW */}
          {/* ======================================================== */}
          {currentView === 'assignments' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* CURRENT ACTIVE ASSIGNMENT */}
              {hasActiveAssignment && currentAssignment ? (
                <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f0ece1]">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#f8f3eb] text-[#7a6449] flex items-center justify-center font-black text-2xl border border-[#e8dccb]">
                        {currentAssignment.patient_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-[#1e1b14]">
                            {currentAssignment.patient_name}
                          </h3>
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Active Care
                          </span>
                        </div>
                        <p className="text-xs text-[#7b776c] mt-0.5">
                          Assigned on {currentAssignment.assigned_at?.slice(0, 10)} • Coordinated by {currentAssignment.assigned_by_nurse_name}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Patient Care</span>
                    </button>
                  </div>

                  {/* Patient Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                      <span className="text-[#7b776c] font-bold text-[10px] uppercase block">Location & Address</span>
                      <p className="text-sm font-black text-[#1e1b14]">
                        {currentAssignment.patient_house_name}, {currentAssignment.patient_place}
                      </p>
                      <p className="text-[#7b776c] text-[11px]">{currentAssignment.patient_panchayath}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                      <span className="text-[#7b776c] font-bold text-[10px] uppercase block">Patient Contact</span>
                      <p className="text-sm font-black text-[#1e1b14]">
                        {currentAssignment.patient_phone || 'Phone not listed'}
                      </p>
                      <p className="text-[#7b776c] text-[11px]">Primary phone</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1 md:col-span-2 lg:col-span-1">
                      <span className="text-[#7b776c] font-bold text-[10px] uppercase block">Emergency Contact</span>
                      <p className="text-sm font-black text-[#1e1b14]">
                        {currentAssignment.emergency_contact_name || 'Family Contact'}
                      </p>
                      <p className="text-[#7b776c] text-[11px]">{currentAssignment.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#e0d9cc] text-xs text-[#7b776c] space-y-1">
                    <p className="font-extrabold text-[#645e45]">Palliative Care Duty Checklist</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Support daily mobility, comfort positioning, and prescribed hydration/nutrition.</li>
                      <li>Observe changes in pain or discomfort and report to community nursing team.</li>
                      <li>When your scheduled care term concludes, click "Complete Patient Care" above to free your availability.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-[#e9e2d5] space-y-4 shadow-2xs">
                  <CheckCircle2 className="w-14 h-14 text-emerald-600/40 mx-auto" />
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="font-black text-base text-[#1e1b14]">
                      Available for Patient Assignments
                    </h3>
                    <p className="text-xs text-[#7b776c] leading-relaxed">
                      You currently have no active care assignments. Patients in your community network can discover your profile and send care requests below.
                    </p>
                  </div>
                </div>
              )}

              {/* INCOMING PATIENT REQUESTS */}
              <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f0ece1] pb-4">
                  <div>
                    <h3 className="font-black text-sm text-[#1e1b14]">
                      Incoming Patient Care Requests
                    </h3>
                    <p className="text-xs text-[#7b776c] mt-0.5">
                      Review and accept requests from registered patients in your service area.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#645e45]">
                    {requestsList.length} total requests
                  </span>
                </div>

                {requestsList.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#7b776c]">
                    No care requests received yet. As patients request your services, they will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requestsList.map((req) => {
                      const isPending = req.status === 'Pending';
                      return (
                        <div
                          key={req.request_id}
                          className="p-5 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="font-black text-sm text-[#1e1b14]">{req.patient_name}</h4>
                              <p className="text-xs text-[#7b776c] mt-0.5">
                                Locality: {req.patient_place} • Phone: {req.patient_phone} • Requested on {req.created_at?.slice(0, 10)}
                              </p>
                            </div>
                            <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full self-start sm:self-auto border ${
                              isPending ? 'bg-amber-100 text-amber-900 border-amber-300' :
                              req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                              'bg-rose-100 text-rose-900 border-rose-300'
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          {req.patient_message && (
                            <div className="p-3 bg-white rounded-xl border border-[#f0ece1] text-xs text-[#4a473d]">
                              <strong>Patient Note:</strong> "{req.patient_message}"
                            </div>
                          )}

                          {isPending && (
                            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#f0ece1]">
                              <button
                                onClick={() => setRejectRequestModal(req)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptRequest(req.request_id, req.patient_name)}
                                disabled={isSubmitting || hasActiveAssignment}
                                className={`px-5 py-2 font-extrabold text-xs rounded-xl shadow-2xs flex items-center space-x-1.5 ${
                                  hasActiveAssignment
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                                }`}
                              >
                                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Accept Request</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MY VISITS VIEW (Care History & Feedback) */}
          {/* ======================================================== */}
          {currentView === 'visits' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[#f0ece1] pb-4">
                  <div>
                    <h3 className="font-black text-sm text-[#1e1b14]">
                      Completed Care History & Patient Feedback
                    </h3>
                    <p className="text-xs text-[#7b776c] mt-0.5">
                      Record of all completed assignments, visit durations, and patient satisfaction ratings.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-black text-xs text-amber-950">{historyData.average_rating}</span>
                    <span className="text-[11px] text-amber-900">({historyData.total_reviews} reviews)</span>
                  </div>
                </div>

                {historyData.history?.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#7b776c]">
                    No completed care history yet. Finished assignments and reviews will be cataloged here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.history.map((item) => (
                      <div
                        key={item.assignment_id}
                        className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm text-[#1e1b14]">{item.patient_name}</h4>
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                            {item.status}
                          </span>
                        </div>

                        <p className="text-[#7b776c] text-[11px]">
                          Duration: {item.assigned_at?.slice(0, 10)} to {item.completed_at?.slice(0, 10) || item.ended_at?.slice(0, 10) || 'Completed'}
                        </p>

                        {item.feedback ? (
                          <div className="p-3 bg-white rounded-xl border border-[#f0ece1] space-y-1">
                            <div className="flex items-center space-x-1 text-amber-600 font-extrabold">
                              <span>Patient Rating:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= item.feedback.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {item.feedback.comment && (
                              <p className="text-[#4a473d] italic text-[11px]">
                                "{item.feedback.comment}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#7b776c] italic">No written feedback provided yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CAREGIVER PROFILE VIEW (View & Edit Profile) */}
          {/* ======================================================== */}
          {currentView === 'profile' && (
            <div className="animate-in fade-in duration-150">
              <CaregiverProfileView
                user={activeUser}
                onUpdateUser={(updated) => {
                  setCurrentUser(updated);
                  loadCaregiverData();
                }}
                onRefresh={loadCaregiverData}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: NOTIFICATIONS VIEW */}
          {/* ======================================================== */}
          {currentView === 'notifications' && (
            <div className="animate-in fade-in duration-150">
              <CaregiverNotifications />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: SETTINGS VIEW */}
          {/* ======================================================== */}
          {currentView === 'settings' && (
            <div className="animate-in fade-in duration-150">
              <CaregiverSettings
                user={activeUser}
                complaintsList={complaintsList}
                onOpenComplaintModal={() => setShowComplaintModal(true)}
                onNavigateProfile={() => setCurrentView('profile')}
                hasActiveAssignment={hasActiveAssignment}
              />
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: COMPLETE PATIENT CARE CONFIRMATION */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleCompleteCare} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-[#1e1b14]">
                Complete Patient Care?
              </h3>
              <p className="text-xs text-[#7b776c] leading-relaxed">
                Are you sure you want to conclude care for <strong>{currentAssignment?.patient_name}</strong>? This will free your availability for new patient requests and invite the patient to leave a review.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Care Summary / Completion Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Concluded 2-week palliative comfort support. Patient stable and comfortable..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Complete Care</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: SUBMIT COMPLAINT / GRIEVANCE */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleSubmitComplaint} className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">
                Submit Grievance / Complaint
              </h3>
              <button
                type="button"
                onClick={() => setShowComplaintModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Subject <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={complaintForm.subject}
                  onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                  className="w-full p-2.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={complaintForm.category}
                  onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                  className="w-full p-2.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
                >
                  <option value="Patient-related">Patient-related</option>
                  <option value="Schedule-related">Schedule-related</option>
                  <option value="Safety concern">Safety concern</option>
                  <option value="Payment / Administrative">Payment / Administrative</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Detailed Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what occurred, any patient details, dates, or assistance needed..."
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Optional Supporting Document / Attachment
                </label>
                <input
                  type="file"
                  onChange={(e) => setComplaintForm({ ...complaintForm, attachment: e.target.files?.[0] || null })}
                  className="w-full text-xs text-[#7b776c]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setShowComplaintModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Complaint</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: DECLINE REQUEST REASON */}
      {rejectRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleRejectRequest} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">
                Decline Care Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectRequestModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7b776c]">
              Decline care request from <strong>{rejectRequestModal.patient_name}</strong>?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Reason for Declining (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Outside my current travel zone or schedule conflict..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setRejectRequestModal(null)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Decline Request</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
