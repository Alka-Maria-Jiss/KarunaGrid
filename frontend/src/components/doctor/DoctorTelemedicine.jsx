import React, { useState, useEffect } from 'react';
import {
  Video, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  FileText, Plus, ExternalLink, User, X, AlertTriangle, Play, ChevronRight,
  Stethoscope, HelpCircle
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function DoctorTelemedicine() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'upcoming' | 'completed'
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Consultation & Modals
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Accept Modal State (supports confirming requested slot or changing slot)
  const [acceptDate, setAcceptDate] = useState('');
  const [acceptSlot, setAcceptSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Reject Modal State
  const [rejectionReason, setRejectionReason] = useState('');

  // Reschedule Modal State
  const [reschedDate, setReschedDate] = useState('');
  const [reschedSlot, setReschedSlot] = useState('');
  const [reschedAvailableSlots, setReschedAvailableSlots] = useState([]);
  const [isLoadingReschedSlots, setIsLoadingReschedSlots] = useState(false);

  // Clinical Notes State
  const [notesData, setNotesData] = useState({
    symptoms_discussed: '',
    clinical_observations: '',
    advice: '',
    recommendations: '',
    notes: '',
  });

  // Followup State
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('10:00');
  const [followupReason, setFollowupReason] = useState('Palliative Symptom Review');
  const [followupType, setFollowupType] = useState('Telemedicine');
  const [followupNotes, setFollowupNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchConsultations = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/doctor/telemedicine/consultations/');
      setConsultations(Array.isArray(res) ? res : (res?.results || []));
    } catch (err) {
      console.error('Error fetching telemedicine consultations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  // Filter consultations by status
  const pendingConsultations = consultations.filter((c) => c.status === 'Pending');
  const upcomingConsultations = consultations.filter(
    (c) => c.status === 'Scheduled' || c.status === 'In Progress' || c.status === 'Accepted' || c.status === 'Rescheduled'
  );
  const completedConsultations = consultations.filter((c) => c.status === 'Completed' || c.status === 'Rejected' || c.status === 'Cancelled');

  // Load available slots for Accept Modal
  useEffect(() => {
    if (!showAcceptModal || !selectedConsultation || !acceptDate) return;

    const fetchSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const docId = selectedConsultation.doctor?.doctor_id || selectedConsultation.doctor;
        const res = await apiClient.get(`/telemedicine/available-slots/?doctor_id=${docId}&date=${acceptDate}`);
        setAvailableSlots(res?.slots || (Array.isArray(res) ? res : []));
      } catch (err) {
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [showAcceptModal, selectedConsultation, acceptDate]);

  // Load available slots for Reschedule Modal
  useEffect(() => {
    if (!showScheduleModal || !selectedConsultation || !reschedDate) return;

    const fetchSlots = async () => {
      try {
        setIsLoadingReschedSlots(true);
        const docId = selectedConsultation.doctor?.doctor_id || selectedConsultation.doctor;
        const res = await apiClient.get(`/telemedicine/available-slots/?doctor_id=${docId}&date=${reschedDate}`);
        setReschedAvailableSlots(res?.slots || (Array.isArray(res) ? res : []));
      } catch (err) {
        setReschedAvailableSlots([]);
      } finally {
        setIsLoadingReschedSlots(false);
      }
    };

    fetchSlots();
  }, [showScheduleModal, selectedConsultation, reschedDate]);

  // --- ACTIONS ---

  const handleOpenAccept = (c) => {
    setSelectedConsultation(c);
    setAcceptDate(c.requested_date || new Date().toISOString().split('T')[0]);
    setAcceptSlot(c.requested_time ? c.requested_time.slice(0, 5) : '09:30');
    setShowAcceptModal(true);
  };

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsultation || !acceptSlot) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/doctor/telemedicine/${selectedConsultation.consultation_id}/accept/`, {
        scheduled_date: acceptDate,
        scheduled_start_time: acceptSlot,
      });
      showSuccess(`Consultation with ${selectedConsultation.patient_name || 'Patient'} scheduled successfully!`);
      setShowAcceptModal(false);
      fetchConsultations();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to accept consultation.';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReject = (c) => {
    setSelectedConsultation(c);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsultation || !rejectionReason.trim()) {
      showError('Please provide a reason for declining this consultation request.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/doctor/telemedicine/${selectedConsultation.consultation_id}/reject/`, {
        rejection_reason: rejectionReason.trim(),
      });
      showSuccess('Consultation request declined and patient notified.');
      setShowRejectModal(false);
      fetchConsultations();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reject consultation.';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartConsultation = async (c) => {
    try {
      const res = await apiClient.post(`/doctor/telemedicine/${c.consultation_id}/start/`);
      showSuccess('Consultation marked In Progress. Opening Jitsi Video Room...');
      const meetingLink = res?.consultation?.meeting_link || c.meeting_link;
      if (meetingLink) {
        window.open(meetingLink, '_blank', 'noopener,noreferrer');
      }
      fetchConsultations();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to start consultation.');
    }
  };

  const handleOpenReschedule = (c) => {
    setSelectedConsultation(c);
    setReschedDate(c.scheduled_date || c.requested_date || new Date().toISOString().split('T')[0]);
    setReschedSlot(c.scheduled_start_time ? c.scheduled_start_time.slice(0, 5) : '09:30');
    setShowScheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsultation || !reschedSlot) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/doctor/telemedicine/${selectedConsultation.consultation_id}/reschedule/`, {
        scheduled_date: reschedDate,
        scheduled_start_time: reschedSlot,
      });
      showSuccess('Consultation rescheduled successfully.');
      setShowScheduleModal(false);
      fetchConsultations();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reschedule consultation.';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenNotes = (c) => {
    setSelectedConsultation(c);
    setNotesData({
      symptoms_discussed: c.symptoms || '',
      clinical_observations: '',
      advice: '',
      recommendations: '',
      notes: '',
    });
    setShowNotesModal(true);
  };

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/doctor/telemedicine/${selectedConsultation.consultation_id}/notes/`, notesData);
      showSuccess('Clinical consultation notes saved.');
      setShowNotesModal(false);
      fetchConsultations();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to save notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (c) => {
    try {
      await apiClient.post(`/doctor/telemedicine/${c.consultation_id}/complete/`);
      showSuccess('Consultation completed successfully.');
      fetchConsultations();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to complete consultation.');
    }
  };

  const handleOpenFollowup = (c) => {
    setSelectedConsultation(c);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFollowupDate(nextWeek.toISOString().split('T')[0]);
    setFollowupTime('10:00');
    setFollowupReason('Follow-up on symptom progress');
    setFollowupType('Telemedicine');
    setFollowupNotes('');
    setShowFollowupModal(true);
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/doctor/telemedicine/${selectedConsultation.consultation_id}/schedule-followup/`, {
        followup_date: followupDate,
        followup_time: followupTime,
        reason: followupReason,
        followup_type: followupType,
        notes: followupNotes,
      });
      showSuccess('Follow-up consultation successfully scheduled.');
      setShowFollowupModal(false);
      fetchConsultations();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to schedule follow-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Telemedicine Consultation Management
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Review patient virtual consultation requests, schedule fixed 30-minute video slots, record structured observations, and coordinate follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConsultations}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Consultations</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e9e2d5] pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white border-[#e9e2d5] text-[#1e1b14] shadow-2xs'
              : 'bg-[#f4ede0]/50 border-transparent text-[#7b776c] hover:bg-[#f4ede0]'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-700" />
          <span>Pending Requests</span>
          {pendingConsultations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
              {pendingConsultations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-white border-[#e9e2d5] text-[#1e1b14] shadow-2xs'
              : 'bg-[#f4ede0]/50 border-transparent text-[#7b776c] hover:bg-[#f4ede0]'
          }`}
        >
          <Video className="w-4 h-4 text-emerald-700" />
          <span>Upcoming & In Progress</span>
          {upcomingConsultations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white">
              {upcomingConsultations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-white border-[#e9e2d5] text-[#1e1b14] shadow-2xs'
              : 'bg-[#f4ede0]/50 border-transparent text-[#7b776c] hover:bg-[#f4ede0]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#645e45]" />
          <span>Completed History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e9e2d5] text-[#645e45]">
            {completedConsultations.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. PENDING REQUESTS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingConsultations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 opacity-80" />
              <p className="font-black text-sm text-[#1e1b14]">No Pending Requests</p>
              <p className="text-xs text-[#7b776c]">All patient telemedicine consultation requests have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingConsultations.map((c) => (
                <div
                  key={c.consultation_id}
                  className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2ece1] gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm text-[#1e1b14]">
                            {c.patient_name || 'Patient'}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              c.priority === 'Emergency'
                                ? 'bg-rose-100 text-rose-800'
                                : c.priority === 'Urgent'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#f4ede0] text-[#645e45]'
                            }`}
                          >
                            {c.priority || 'Routine'} Priority
                          </span>
                        </div>
                        <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                          Requested Slot: <strong>{c.requested_date}</strong> at <strong>{c.requested_time ? c.requested_time.slice(0, 5) : 'Anytime'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAccept(c)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReject(c)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0] space-y-1">
                    <p><strong>Chief Complaint:</strong> {c.reason || 'General Consult'}</p>
                    {c.symptoms && <p><strong>Symptoms Described:</strong> {c.symptoms}</p>}
                    {c.patient_notes && <p><strong>Patient Note:</strong> {c.patient_notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. UPCOMING & IN PROGRESS */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingConsultations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
              <Video className="w-8 h-8 mx-auto text-[#645e45] opacity-70" />
              <p className="font-black text-sm text-[#1e1b14]">No Scheduled Sessions</p>
              <p className="text-xs text-[#7b776c]">No upcoming virtual video appointments currently scheduled.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingConsultations.map((c) => (
                <div
                  key={c.consultation_id}
                  className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2ece1] gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          c.status === 'In Progress'
                            ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm text-[#1e1b14]">
                            {c.patient_name || 'Patient'}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              c.status === 'In Progress'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : c.status === 'Rescheduled'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                          Appointment: <strong>{c.scheduled_date || c.requested_date}</strong> • Slot: <strong>{c.scheduled_start_time ? `${c.scheduled_start_time.slice(0, 5)} – ${c.scheduled_end_time ? c.scheduled_end_time.slice(0, 5) : '30m'}` : 'Time TBD'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleStartConsultation(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Call</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenNotes(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fdfbf7] border border-[#e0d9cc] text-[#1e1b14] hover:bg-[#f4ede0] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Clinical Notes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReschedule(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#eee7da] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFollowup(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-800 hover:bg-stone-200 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Follow-up</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleComplete(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4c472f] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0] space-y-1">
                    <p><strong>Reason:</strong> {c.reason || 'N/A'}</p>
                    {c.symptoms && <p><strong>Symptoms:</strong> {c.symptoms}</p>}
                    {c.meeting_link && (
                      <p className="text-emerald-800 text-[11px] font-mono truncate pt-1">
                        <strong>Meeting URL:</strong> {c.meeting_link}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLETED HISTORY */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedConsultations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
              <FileText className="w-8 h-8 mx-auto text-[#645e45] opacity-70" />
              <p className="font-black text-sm text-[#1e1b14]">No Completed Consultations</p>
              <p className="text-xs text-[#7b776c]">Completed consultations will appear in this historical archive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {completedConsultations.map((c) => (
                <div
                  key={c.consultation_id}
                  className="bg-white rounded-2xl border border-[#e9e2d5] p-4 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        c.status === 'Completed'
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-[#1e1b14]">{c.patient_name || 'Patient'}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            c.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7b776c] mt-0.5">
                        Date: {c.scheduled_date || c.requested_date} • {c.reason || 'General Consult'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConsultation(c);
                      setShowDetailModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#eee7da] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>View Record</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. ACCEPT / CONFIRM SLOT MODAL */}
      {showAcceptModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAcceptSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Accept Consultation
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Confirm requested slot for {selectedConsultation.patient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Consultation Date
                </label>
                <input
                  type="date"
                  required
                  value={acceptDate}
                  onChange={(e) => setAcceptDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Fixed 30-Minute Slot
                </label>
                {isLoadingSlots ? (
                  <p className="py-2 text-[#7b776c] italic">Checking availability...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 bg-[#fdfbf7] rounded-xl border border-[#e9e2d5]">
                    {availableSlots.map((s) => {
                      const isBooked = !s.is_available && s.start_time !== selectedConsultation.requested_time;
                      const isSelected = acceptSlot === s.start_time;

                      return (
                        <button
                          key={s.start_time}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setAcceptSlot(s.start_time)}
                          className={`p-2 rounded-lg text-center font-bold text-xs border transition-all ${
                            isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : isBooked
                              ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed line-through'
                              : 'bg-white text-[#1e1b14] border-[#e0d9cc] hover:bg-[#f4ede0] cursor-pointer'
                          }`}
                        >
                          <div>{s.start_time}</div>
                          <div className="text-[9px] opacity-75">{s.end_time}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !acceptSlot}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Confirming...' : 'Schedule & Generate Jitsi Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. REJECT REQUEST MODAL */}
      {showRejectModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Decline Consultation
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Provide a mandatory reason for declining {selectedConsultation.patient_name}'s request
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-extrabold text-[#1e1b14]">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. In emergency clinic duty at requested time. Please book afternoon slot..."
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Declining...' : 'Decline Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. RESCHEDULE MODAL */}
      {showScheduleModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRescheduleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Reschedule Consultation
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Choose a new valid 30-minute slot for {selectedConsultation.patient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  required
                  value={reschedDate}
                  onChange={(e) => setReschedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Select New Fixed Slot
                </label>
                {isLoadingReschedSlots ? (
                  <p className="py-2 text-[#7b776c] italic">Checking availability...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 bg-[#fdfbf7] rounded-xl border border-[#e9e2d5]">
                    {reschedAvailableSlots.map((s) => {
                      const isBooked = !s.is_available;
                      const isSelected = reschedSlot === s.start_time;

                      return (
                        <button
                          key={s.start_time}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setReschedSlot(s.start_time)}
                          className={`p-2 rounded-lg text-center font-bold text-xs border transition-all ${
                            isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : isBooked
                              ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed line-through'
                              : 'bg-white text-[#1e1b14] border-[#e0d9cc] hover:bg-[#f4ede0] cursor-pointer'
                          }`}
                        >
                          <div>{s.start_time}</div>
                          <div className="text-[9px] opacity-75">{s.end_time}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reschedSlot}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Rescheduling...' : 'Save Rescheduled Slot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. CLINICAL NOTES MODAL */}
      {showNotesModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleNotesSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Record Clinical Notes
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Patient: {selectedConsultation.patient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Symptoms Discussed
                </label>
                <textarea
                  rows={2}
                  value={notesData.symptoms_discussed}
                  onChange={(e) => setNotesData({ ...notesData, symptoms_discussed: e.target.value })}
                  placeholder="e.g. Persistent lower quadrant pain, breathlessness on exertion..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Clinical Observations & Assessment
                </label>
                <textarea
                  rows={2}
                  value={notesData.clinical_observations}
                  onChange={(e) => setNotesData({ ...notesData, clinical_observations: e.target.value })}
                  placeholder="e.g. Mild pallor noted, alert, oriented, distress level manageable..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Medical Advice Given
                </label>
                <textarea
                  rows={2}
                  value={notesData.advice}
                  onChange={(e) => setNotesData({ ...notesData, advice: e.target.value })}
                  placeholder="e.g. Elevate extremities, ensure adequate fluid intake, avoid heavy strain..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Prescription / Care Recommendations
                </label>
                <textarea
                  rows={2}
                  value={notesData.recommendations}
                  onChange={(e) => setNotesData({ ...notesData, recommendations: e.target.value })}
                  placeholder="e.g. Titrate analgesics, order routine CBC lab test, request nurse home visit..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Additional Doctor Notes
                </label>
                <textarea
                  rows={2}
                  value={notesData.notes}
                  onChange={(e) => setNotesData({ ...notesData, notes: e.target.value })}
                  placeholder="Internal notes or caregiver coordination instructions..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving Notes...' : 'Save Clinical Notes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. FOLLOW-UP MODAL */}
      {showFollowupModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleFollowupSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Schedule Follow-up
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Plan next checkup for {selectedConsultation.patient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFollowupModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Follow-up Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={followupTime}
                    onChange={(e) => setFollowupTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Follow-up Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Telemedicine', 'In-Person Visit'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFollowupType(t)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        followupType === t
                          ? 'bg-[#645e45] text-white border-[#645e45]'
                          : 'bg-[#fdfbf7] text-[#4a473d] border-[#e0d9cc]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Reason for Follow-up
                </label>
                <input
                  type="text"
                  required
                  value={followupReason}
                  onChange={(e) => setFollowupReason(e.target.value)}
                  placeholder="e.g. Routine pain evaluation, lab report review"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Instructions for patient or caregiver..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFollowupModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Scheduling...' : 'Save Follow-up'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. DETAIL / CLINICAL SUMMARY MODAL */}
      {showDetailModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Consultation Clinical Record
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    {selectedConsultation.patient_name ? `Patient: ${selectedConsultation.patient_name} • ` : ''}Historical consultation details & clinical notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1e1b14]">
              <div className="grid grid-cols-2 gap-2 bg-[#fdfbf7] p-3 rounded-xl border border-[#e9e2d5]">
                <div>
                  <span className="text-[#7b776c] font-medium block">Patient:</span>
                  <strong>{selectedConsultation.patient_name || 'Patient'}</strong>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Status:</span>
                  <span className="font-extrabold text-[#645e45]">{selectedConsultation.status}</span>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Appointment Date:</span>
                  <strong>{selectedConsultation.scheduled_date || selectedConsultation.requested_date} • {selectedConsultation.scheduled_start_time || selectedConsultation.requested_time}</strong>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Priority:</span>
                  <strong>{selectedConsultation.priority}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <p><strong>Chief Reason:</strong> {selectedConsultation.reason || 'N/A'}</p>
                {selectedConsultation.symptoms && <p><strong>Symptoms:</strong> {selectedConsultation.symptoms}</p>}
                {selectedConsultation.patient_notes && <p><strong>Patient Notes:</strong> {selectedConsultation.patient_notes}</p>}
                {selectedConsultation.rejection_reason && (
                  <p className="text-rose-700"><strong>Rejection Reason:</strong> {selectedConsultation.rejection_reason}</p>
                )}
              </div>

              {/* Consultation Notes */}
              {selectedConsultation.consultation_notes && selectedConsultation.consultation_notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#f2ece1]">
                  <h4 className="font-extrabold text-sm text-[#1e1b14]">Recorded Clinical Notes</h4>
                  {selectedConsultation.consultation_notes.map((note) => (
                    <div key={note.note_id} className="p-3 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] space-y-1">
                      {note.symptoms_discussed && <p><strong>Symptoms:</strong> {note.symptoms_discussed}</p>}
                      {note.clinical_observations && <p><strong>Observations:</strong> {note.clinical_observations}</p>}
                      {note.advice && <p><strong>Advice:</strong> {note.advice}</p>}
                      {note.recommendations && <p><strong>Recommendations:</strong> {note.recommendations}</p>}
                      {note.notes && <p><strong>Notes:</strong> {note.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-ups */}
              {selectedConsultation.followups && selectedConsultation.followups.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#f2ece1]">
                  <h4 className="font-extrabold text-sm text-[#1e1b14]">Scheduled Follow-ups</h4>
                  {selectedConsultation.followups.map((fu) => (
                    <div key={fu.followup_id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                      <p><strong>Date & Time:</strong> {fu.followup_date} at {fu.followup_time}</p>
                      <p><strong>Type:</strong> {fu.followup_type} • <strong>Reason:</strong> {fu.reason}</p>
                      {fu.notes && <p><strong>Notes:</strong> {fu.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] rounded-xl hover:bg-[#4c472f]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
