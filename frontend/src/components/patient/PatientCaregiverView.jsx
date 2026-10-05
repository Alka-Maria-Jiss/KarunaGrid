import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Phone,
  Mail,
  MapPin,
  Award,
  Calendar,
  ShieldCheck,
  Heart,
  Star,
  Search,
  CheckCircle2,
  Clock,
  Send,
  X,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientCaregiverView() {
  const [activeTab, setActiveTab] = useState('my_caregiver'); // 'my_caregiver' | 'find_caregiver' | 'history'
  const [statusData, setStatusData] = useState(null);
  const [approvedCaregivers, setApprovedCaregivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Request modal state
  const [requestModalCaregiver, setRequestModalCaregiver] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Feedback modal / section state
  const [feedbackModalAssignment, setFeedbackModalAssignment] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadPatientCaregiverData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, caregiversRes] = await Promise.allSettled([
        apiClient.get('/patient/caregiver/'),
        apiClient.get('/patient/caregivers/'),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatusData(statusRes.value || null);
        // If there's an assignment awaiting feedback, automatically pop up the feedback modal
        if (statusRes.value?.pending_feedback_assignments?.length > 0) {
          setFeedbackModalAssignment(statusRes.value.pending_feedback_assignments[0]);
        }
      }

      if (caregiversRes.status === 'fulfilled') {
        setApprovedCaregivers(Array.isArray(caregiversRes.value) ? caregiversRes.value : []);
      }
    } catch (err) {
      console.error('Error loading patient caregiver data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientCaregiverData();
  }, []);

  // Submit Caregiver Request
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestModalCaregiver) return;
    setIsSubmittingRequest(true);
    try {
      const res = await apiClient.post('/patient/caregiver-requests/', {
        caregiver_id: requestModalCaregiver.caregiver_id,
        message: requestMessage.trim(),
      });
      showSuccess(res.message || `Caregiver request sent to ${requestModalCaregiver.name} successfully.`);
      setRequestModalCaregiver(null);
      setRequestMessage('');
      setActiveTab('my_caregiver');
      loadPatientCaregiverData();
    } catch (err) {
      showError(err.message || 'Failed to send caregiver request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Submit Feedback
  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModalAssignment) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await apiClient.post('/patient/caregiver-feedback/', {
        assignment_id: feedbackModalAssignment.assignment_id,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      });
      showSuccess(res.message || 'Thank you! Your feedback has been recorded.');
      setFeedbackModalAssignment(null);
      setFeedbackRating(5);
      setFeedbackComment('');
      loadPatientCaregiverData();
    } catch (err) {
      showError(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const hasActiveAssignment = statusData?.has_active_assignment;
  const activeAssignment = statusData?.active_assignment;
  const pendingRequests = statusData?.pending_requests || [];
  const pendingFeedbackList = statusData?.pending_feedback_assignments || [];
  const pastAssignments = statusData?.past_assignments || [];

  const filteredCaregivers = approvedCaregivers.filter((cg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return cg.name?.toLowerCase().includes(q) || cg.location?.toLowerCase().includes(q) || cg.specialization?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4ede0] text-[#645e45] flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">
              Community Caregiver Support
            </h2>
            <p className="text-xs text-[#7b776c] font-medium mt-0.5">
              Verified community palliative caregivers to provide personalized home assistance and care support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveAssignment ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Caregiver Active</span>
            </span>
          ) : (
            <button
              onClick={() => setActiveTab('find_caregiver')}
              className="px-4 py-2 bg-[#645e45] text-white text-xs font-extrabold rounded-xl hover:bg-[#524d38] flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Find a Caregiver</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-[#e9e2d5] flex flex-wrap gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab('my_caregiver')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'my_caregiver'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>My Caregiver</span>
          {pendingFeedbackList.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-amber-950">
              Rate Care
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('find_caregiver')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'find_caregiver'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Find a Caregiver</span>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
            activeTab === 'find_caregiver' ? 'bg-white text-[#645e45]' : 'bg-[#f4ede0] text-[#645e45]'
          }`}>
            {approvedCaregivers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Care History</span>
        </button>
      </div>

      {/* TAB 1: MY CAREGIVER & CURRENT STATUS */}
      {activeTab === 'my_caregiver' && (
        <div className="space-y-6">
          {/* Rating prompt if completed care has no feedback yet */}
          {pendingFeedbackList.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-amber-950">
                    How was your care with {pendingFeedbackList[0].caregiver_name}?
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5 font-medium leading-relaxed">
                    Your care assignment has concluded. Please take a moment to provide feedback and rate your experience.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackModalAssignment(pendingFeedbackList[0])}
                className="px-5 py-2.5 bg-[#645e45] text-white font-extrabold text-xs rounded-xl hover:bg-[#524d38] shadow-sm transition-all whitespace-nowrap cursor-pointer"
              >
                Rate Your Caregiver ★
              </button>
            </div>
          )}

          {/* Active Assigned Caregiver Card */}
          {hasActiveAssignment && activeAssignment ? (
            <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f0ece1]">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#f8f3eb] text-[#7a6449] flex items-center justify-center font-black text-2xl border border-[#e8dccb]">
                    {activeAssignment.caregiver_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[#1e1b14]">
                        {activeAssignment.caregiver_name}
                      </h3>
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Active Caregiver
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#645e45] mt-0.5">
                      {activeAssignment.caregiver_qualifications || 'Certified Community Caregiver'}
                    </p>
                    <p className="text-[11px] text-[#7b776c]">
                      Experience: {activeAssignment.caregiver_experience || 'Experienced'}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-[#7b776c]">
                  <span>Assigned On:</span>
                  <p className="font-extrabold text-[#1e1b14]">{activeAssignment.assigned_at?.slice(0, 10)}</p>
                  <p className="text-[10px] text-[#645e45] mt-0.5">Coordinated by: {activeAssignment.assigned_by_nurse_name}</p>
                </div>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                  <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                    <Phone className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Contact Phone</span>
                  </div>
                  <p className="text-sm font-black text-[#1e1b14]">
                    {activeAssignment.caregiver_phone || 'Phone not available'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                  <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                    <Award className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Specialization</span>
                  </div>
                  <p className="text-sm font-black text-[#1e1b14]">
                    {activeAssignment.caregiver_specialization || 'Palliative Home Care'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                    <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Status</span>
                  </div>
                  <p className="text-sm font-black text-emerald-800">
                    Active Care Support
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#e0d9cc] text-xs text-[#7b776c] space-y-1">
                <p className="font-extrabold text-[#645e45]">Care Protocol Reminder</p>
                <p>
                  Your community caregiver is here to assist with home palliative comfort and non-clinical daily support. Clinical decisions are guided by your assigned doctor and nursing staff.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#e9e2d5] space-y-4 shadow-2xs">
              <HeartHandshake className="w-14 h-14 text-[#7a6449]/40 mx-auto" />
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-black text-base text-[#1e1b14]">
                  No Caregiver Currently Assigned
                </h3>
                <p className="text-xs text-[#7b776c] leading-relaxed">
                  You can browse approved community caregivers in your locality and send a care request directly, or your nursing team can coordinate one for you.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('find_caregiver')}
                className="px-6 py-2.5 bg-[#645e45] text-white font-extrabold text-xs rounded-xl hover:bg-[#524d38] shadow-sm transition-all cursor-pointer"
              >
                Browse & Request Caregiver
              </button>
            </div>
          )}

          {/* Pending Sent Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#1e1b14]">
                  Caregiver Requests Sent ({pendingRequests.length})
                </h3>
                <span className="text-xs text-[#7b776c]">Awaiting caregiver response</span>
              </div>

              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.request_id}
                    className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-black text-[#1e1b14] text-sm">{req.caregiver_name}</h4>
                      <p className="text-[#7b776c] text-[11px] mt-0.5">
                        Requested on {req.created_at?.slice(0, 10)}
                        {req.patient_message && ` • Note: "${req.patient_message}"`}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                      Pending Caregiver Acceptance
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FIND A CAREGIVER (Section 9, 10, 11) */}
      {activeTab === 'find_caregiver' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7b776c] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search approved caregivers by name, locality, specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>
          </div>

          {filteredCaregivers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#e9e2d5] space-y-2 shadow-2xs">
              <HeartHandshake className="w-10 h-10 text-[#7b776c]/40 mx-auto" />
              <h3 className="font-extrabold text-sm text-[#1e1b14]">No Caregivers Found</h3>
              <p className="text-xs text-[#7b776c]">Try adjusting your search criteria or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCaregivers.map((cg) => {
                const isAvailable = cg.is_available_now;
                const isRequested = pendingRequests.some((r) => r.caregiver === cg.caregiver_id);

                return (
                  <div
                    key={cg.caregiver_id}
                    className="bg-white rounded-3xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Name & Availability */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#1e1b14] leading-tight">{cg.name}</h4>
                          <p className="text-[11px] font-bold text-[#645e45] mt-0.5">
                            {cg.specialization || 'Certified Palliative Caregiver'}
                          </p>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Rating & Experience Card (Section 10) */}
                      <div className="p-3 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-amber-600 font-extrabold">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span>{cg.average_rating || '5.0'}</span>
                          <span className="text-[#7b776c] font-normal text-[10px]">({cg.total_reviews} reviews)</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#7b776c]">
                          {cg.experience_years || '1+ years exp'}
                        </span>
                      </div>

                      {/* Location & Details */}
                      <div className="space-y-1.5 text-xs text-[#7b776c]">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#645e45] shrink-0" />
                          <span className="truncate">{cg.location}</span>
                        </div>
                        {cg.qualifications && (
                          <div className="flex items-center space-x-1.5">
                            <Award className="w-3.5 h-3.5 text-[#645e45] shrink-0" />
                            <span className="truncate">{cg.qualifications}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-[#7b776c]">
                          Active Patients: <strong className="text-[#1e1b14]">{cg.active_assignments_count || 0}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-[#f0ece1]">
                      {hasActiveAssignment ? (
                        <button
                          disabled
                          className="w-full py-2 bg-stone-100 text-stone-400 font-bold text-xs rounded-xl cursor-not-allowed"
                        >
                          Caregiver Already Assigned
                        </button>
                      ) : isRequested ? (
                        <button
                          disabled
                          className="w-full py-2 bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl cursor-not-allowed"
                        >
                          Request Pending Response
                        </button>
                      ) : (
                        <button
                          onClick={() => setRequestModalCaregiver(cg)}
                          disabled={!isAvailable}
                          className={`w-full py-2 font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-1.5 ${
                            isAvailable
                              ? 'bg-[#645e45] hover:bg-[#524d38] text-white cursor-pointer'
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Request Caregiver</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CARE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-[#1e1b14]">
            Past Care Assignments & Reviews
          </h3>

          {pastAssignments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7b776c]">
              No past care assignments recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {pastAssignments.map((a) => (
                <div
                  key={a.assignment_id}
                  className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-black text-[#1e1b14] text-sm">{a.caregiver_name}</h4>
                    <p className="text-[#7b776c] text-[11px] mt-0.5">
                      Period: {a.assigned_at?.slice(0, 10)} to {a.completed_at?.slice(0, 10) || a.ended_at?.slice(0, 10) || 'Completed'}
                    </p>
                    {a.feedback && (
                      <div className="mt-2 flex items-center space-x-1.5 text-amber-600 font-extrabold">
                        <span>Your Rating:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= a.feedback.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          ))}
                        </div>
                        {a.feedback.comment && (
                          <span className="text-[#4a473d] font-normal italic">
                            — "{a.feedback.comment}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 self-start md:self-auto">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REQUEST CAREGIVER CONFIRMATION (Section 12) */}
      {requestModalCaregiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleSendRequest} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">
                Request {requestModalCaregiver.name}?
              </h3>
              <button
                type="button"
                onClick={() => setRequestModalCaregiver(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] text-xs space-y-1 text-[#7b776c]">
              <p><strong>Caregiver:</strong> {requestModalCaregiver.name}</p>
              <p><strong>Locality:</strong> {requestModalCaregiver.location}</p>
              <p><strong>Rating:</strong> ★ {requestModalCaregiver.average_rating || '5.0'} ({requestModalCaregiver.total_reviews} reviews)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Message / Care Needs (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Assistance with daily mobility and evening comfort care..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setRequestModalCaregiver(null)}
                disabled={isSubmittingRequest}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="px-5 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isSubmittingRequest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: RATE YOUR CAREGIVER FEEDBACK (Section 18 & 19) */}
      {feedbackModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleSendFeedback} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mx-auto mb-2">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <h3 className="font-black text-base text-[#1e1b14]">
                Rate Your Caregiver
              </h3>
              <p className="text-xs text-[#7b776c]">
                How was your experience with <strong>{feedbackModalAssignment.caregiver_name}</strong>?
              </p>
            </div>

            {/* 1-5 Star Interactive Selector */}
            <div className="flex items-center justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className="p-1.5 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= feedbackRating
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-stone-300 hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Your Feedback & Comments (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Share your experience with their punctuality, kindness, and comfort support..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setFeedbackModalAssignment(null)}
                disabled={isSubmittingFeedback}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Skip / Later
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="px-5 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isSubmittingFeedback && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
