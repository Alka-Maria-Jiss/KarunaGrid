import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, FileText, User, RefreshCw, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import apiClient from '../api/apiClient';
import ConsultationDetailsModal from './ConsultationDetailsModal';

export default function TelemedicineDoctorSection({ showSuccess, showError }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Modals
  const [scheduleModalItem, setScheduleModalItem] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [notesModalItem, setNotesModalItem] = useState(null);
  const [followupModalItem, setFollowupModalItem] = useState(null);

  // Schedule Form State
  const [schedDate, setSchedDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('10:00');
  const [schedEndTime, setSchedEndTime] = useState('10:30');
  const [customMeetingLink, setCustomMeetingLink] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [schedError, setSchedError] = useState('');

  // Reject Form State
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Notes Form State
  const [symptomsDiscussed, setSymptomsDiscussed] = useState('');
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [advice, setAdvice] = useState('');
  const [consultationNotesText, setConsultationNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [markCompletedOnSave, setMarkCompletedOnSave] = useState(true);

  // Follow-up Form State
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('11:00');
  const [followupReason, setFollowupReason] = useState('7-Day Clinical Follow-up');
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/telemedicine/doctor/consultations/');
      setConsultations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch doctor consultations:', err);
      showError(err.message || 'Failed to load consultation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  // Accept Request
  const handleAccept = async (consultationId) => {
    try {
      await apiClient.post(`/telemedicine/consultations/${consultationId}/accept/`);
      showSuccess('Consultation request accepted successfully!');
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to accept consultation.');
    }
  };

  // Reject Request Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError('A rejection reason is required.');
      return;
    }
    try {
      setRejecting(true);
      await apiClient.post(`/telemedicine/consultations/${rejectModalItem.consultation_id}/reject/`, {
        rejection_reason: rejectionReason.trim()
      });
      showSuccess('Consultation request rejected.');
      setRejectModalItem(null);
      setRejectionReason('');
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to reject consultation.');
    } finally {
      setRejecting(false);
    }
  };

  // Schedule Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schedDate || !schedStartTime || !schedEndTime) {
      setSchedError('Scheduled date, start time, and end time are required.');
      return;
    }
    if (schedEndTime <= schedStartTime) {
      setSchedError('End time must be strictly after start time.');
      return;
    }

    try {
      setScheduling(true);
      setSchedError('');
      await apiClient.post(`/telemedicine/consultations/${scheduleModalItem.consultation_id}/schedule/`, {
        scheduled_date: schedDate,
        scheduled_start_time: schedStartTime,
        scheduled_end_time: schedEndTime,
        meeting_link: customMeetingLink.trim()
      });
      showSuccess('Consultation scheduled successfully!');
      setScheduleModalItem(null);
      fetchConsultations();
    } catch (err) {
      console.error('Scheduling error:', err);
      setSchedError(err.detail || err.message || 'This time slot conflicts with another scheduled consultation for this doctor.');
    } finally {
      setScheduling(false);
    }
  };

  // Start Consultation
  const handleStartConsultation = async (consultationId) => {
    try {
      await apiClient.post(`/telemedicine/consultations/${consultationId}/start/`);
      showSuccess('Consultation status updated to In Progress.');
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to start consultation.');
    }
  };

  // Submit Notes & Complete
  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingNotes(true);
      const payload = {
        symptoms_discussed: symptomsDiscussed.trim(),
        clinical_observations: clinicalObservations.trim(),
        advice: advice.trim(),
        notes: consultationNotesText.trim()
      };

      if (markCompletedOnSave) {
        await apiClient.post(`/telemedicine/consultations/${notesModalItem.consultation_id}/complete/`, payload);
        showSuccess('Consultation notes saved and marked as COMPLETED.');
      } else {
        await apiClient.post(`/telemedicine/consultations/${notesModalItem.consultation_id}/notes/`, payload);
        showSuccess('Consultation notes recorded.');
      }

      setNotesModalItem(null);
      setSymptomsDiscussed('');
      setClinicalObservations('');
      setAdvice('');
      setConsultationNotesText('');
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to save consultation notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Submit Follow-up
  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!followupDate || !followupTime) {
      showError('Follow-up date and time are required.');
      return;
    }
    try {
      setSchedulingFollowup(true);
      await apiClient.post(`/telemedicine/consultations/${followupModalItem.consultation_id}/followups/`, {
        followup_date: followupDate,
        followup_time: followupTime,
        reason: followupReason.trim()
      });
      showSuccess('Follow-up consultation scheduled successfully!');
      setFollowupModalItem(null);
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to schedule follow-up.');
    } finally {
      setSchedulingFollowup(false);
    }
  };

  // Counts
  const pendingCount = consultations.filter((c) => c.status === 'Pending').length;
  const scheduledCount = consultations.filter((c) => ['Scheduled', 'Accepted', 'Rescheduled', 'In Progress'].includes(c.status)).length;
  const completedCount = consultations.filter((c) => c.status === 'Completed').length;

  // Filter List
  const filteredConsultations = consultations.filter((c) => {
    if (activeTab === 'Pending') return c.status === 'Pending';
    if (activeTab === 'Scheduled') return ['Scheduled', 'Accepted', 'Rescheduled', 'In Progress'].includes(c.status);
    if (activeTab === 'Completed') return c.status === 'Completed';
    if (activeTab === 'Closed') return ['Rejected', 'Cancelled'].includes(c.status);
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-amber-50 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <Video className="w-4 h-4" />
            <span>Doctor Telemedicine Management</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Telemedicine & Virtual Consultations</h2>
          <p className="text-sm text-emerald-100 mt-1 max-w-xl">
            Triage pending patient requests, schedule video calls, record clinical consultation notes, and coordinate follow-up care.
          </p>
        </div>

        <button
          onClick={fetchConsultations}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-bold text-xs shadow-md transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Requests
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Requests</span>
            <h3 className="text-2xl font-extrabold text-amber-950 mt-1">{pendingCount}</h3>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-600 opacity-80" />
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Scheduled Consultations</span>
            <h3 className="text-2xl font-extrabold text-indigo-950 mt-1">{scheduledCount}</h3>
          </div>
          <Calendar className="w-8 h-8 text-indigo-600 opacity-80" />
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Completed Consultations</span>
            <h3 className="text-2xl font-extrabold text-emerald-950 mt-1">{completedCount}</h3>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
        {['Pending', 'Scheduled', 'Completed', 'Closed', 'All'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-emerald-900 text-amber-50 shadow-md'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {tab} {tab === 'Pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-stone-500 font-medium">Loading telemedicine requests...</div>
      ) : filteredConsultations.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <Video className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No Consultations Found</h3>
          <p className="text-xs text-stone-500 mt-1">
            There are currently no consultation requests in the <strong className="text-stone-700">{activeTab}</strong> tab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map((c) => {
            const isJoinable = ['Scheduled', 'In Progress', 'Rescheduled'].includes(c.status) && c.meeting_link;

            return (
              <div
                key={c.consultation_id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-700" />
                      {c.patient_name}
                    </h4>
                    <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded font-mono">
                      {c.patient_registration_id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      c.status === 'Pending'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : c.status === 'Scheduled' || c.status === 'Rescheduled'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : c.status === 'In Progress'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                        : c.status === 'Completed'
                        ? 'bg-teal-100 text-teal-900 border-teal-300'
                        : c.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}>
                      {c.status}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      c.priority === 'Urgent' ? 'bg-amber-100 text-amber-900' : c.priority === 'Emergency' ? 'bg-rose-100 text-rose-900' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {c.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div>
                      <strong className="text-stone-900 block mb-0.5">Requested Date/Time:</strong>
                      <span>{c.requested_date} at {c.requested_time}</span>
                    </div>
                    {c.scheduled_date && (
                      <div>
                        <strong className="text-emerald-900 block mb-0.5">Scheduled Date/Time:</strong>
                        <span>{c.scheduled_date} ({c.scheduled_start_time} - {c.scheduled_end_time})</span>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <strong className="text-stone-900 block mb-0.5">Reason:</strong>
                      <span>"{c.reason}"</span>
                    </div>
                    {c.symptoms && (
                      <div className="sm:col-span-2 text-stone-600">
                        <strong>Symptoms:</strong> {c.symptoms}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                  
                  <button
                    onClick={() => setSelectedConsultation(c)}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold flex items-center gap-1"
                  >
                    View Details
                  </button>

                  {c.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleAccept(c.consultation_id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm"
                      >
                        Accept
                      </button>

                      <button
                        onClick={() => {
                          setScheduleModalItem(c);
                          setSchedDate(c.requested_date || new Date().toISOString().split('T')[0]);
                          setSchedStartTime(c.requested_time || '10:00');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm"
                      >
                        Schedule
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalItem(c);
                          setRejectionReason('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {['Accepted', 'Scheduled', 'Rescheduled'].includes(c.status) && (
                    <>
                      <button
                        onClick={() => {
                          setScheduleModalItem(c);
                          setSchedDate(c.scheduled_date || c.requested_date);
                          setSchedStartTime(c.scheduled_start_time || c.requested_time);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => handleStartConsultation(c.consultation_id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Start Call
                      </button>
                    </>
                  )}

                  {c.status === 'In Progress' && (
                    <button
                      onClick={() => setNotesModalItem(c)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Record Notes & Complete
                    </button>
                  )}

                  {c.status === 'Completed' && (
                    <>
                      <button
                        onClick={() => setNotesModalItem(c)}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold"
                      >
                        Add Notes
                      </button>

                      <button
                        onClick={() => {
                          setFollowupModalItem(c);
                          setFollowupDate(new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-amber-50 text-xs font-bold"
                      >
                        Schedule Follow-up
                      </button>
                    </>
                  )}

                  {isJoinable && (
                    <a
                      href={c.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Join Link
                    </a>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE / RESCHEDULE MODAL */}
      {scheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-emerald-950">
              {scheduleModalItem.status === 'Scheduled' ? 'Reschedule Consultation' : 'Schedule Consultation'}
            </h3>
            <p className="text-xs text-stone-500">
              Patient: <strong className="text-stone-800">{scheduleModalItem.patient_name}</strong>
            </p>

            {schedError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                {schedError}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={schedStartTime}
                    onChange={(e) => setSchedStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={schedEndTime}
                    onChange={(e) => setSchedEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Custom Meeting URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="Leave empty to auto-generate Jitsi link"
                  value={customMeetingLink}
                  onChange={(e) => setCustomMeetingLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setScheduleModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold shadow-md"
                >
                  {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-rose-900">Reject Consultation Request</h3>
            <p className="text-xs text-stone-600">
              Rejecting request for <strong className="text-stone-800">{rejectModalItem.patient_name}</strong>. A mandatory reason is required.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="State the exact reason for rejecting this consultation..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONSULTATION NOTES WORKSPACE MODAL */}
      {notesModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-emerald-950">Record Consultation Notes</h3>
            <p className="text-xs text-stone-500">
              Patient: <strong className="text-stone-800">{notesModalItem.patient_name}</strong> ({notesModalItem.patient_registration_id})
            </p>

            <form onSubmit={handleNotesSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Symptoms Discussed
                </label>
                <input
                  type="text"
                  placeholder="e.g. Breakthrough pain in lumbar region, nausea"
                  value={symptomsDiscussed}
                  onChange={(e) => setSymptomsDiscussed(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Clinical Observations
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical assessment and findings..."
                  value={clinicalObservations}
                  onChange={(e) => setClinicalObservations(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Advice & Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for patient and caregiver..."
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  General Consultation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional medical notes..."
                  value={consultationNotesText}
                  onChange={(e) => setConsultationNotesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markComplete"
                  checked={markCompletedOnSave}
                  onChange={(e) => setMarkCompletedOnSave(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="markComplete" className="text-xs font-bold text-stone-800">
                  Mark consultation as COMPLETED upon saving
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setNotesModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-md"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOW-UP MODAL */}
      {followupModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-indigo-950">Schedule Follow-up Consultation</h3>
            <p className="text-xs text-stone-500">
              For original Consultation #{followupModalItem.consultation_id} (Patient: {followupModalItem.patient_name})
            </p>

            <form onSubmit={handleFollowupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Follow-up Time *
                </label>
                <input
                  type="time"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Follow-up Reason
                </label>
                <input
                  type="text"
                  value={followupReason}
                  onChange={(e) => setFollowupReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setFollowupModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingFollowup}
                  className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold shadow-md"
                >
                  {schedulingFollowup ? 'Scheduling...' : 'Schedule Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      <ConsultationDetailsModal
        consultation={selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        onRefresh={fetchConsultations}
      />

    </div>
  );
}
