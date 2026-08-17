import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Plus, Filter, AlertCircle, CheckCircle2, XCircle, ChevronRight, User, RefreshCw } from 'lucide-react';
import apiClient from '../api/apiClient';
import ConsultationDetailsModal from './ConsultationDetailsModal';

export default function TelemedicinePatientSection({ userProfile, showSuccess, showError }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Form State
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [priority, setPriority] = useState('Routine');
  const [patientNotes, setPatientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Fetch consultations list
  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/telemedicine/consultations/');
      setConsultations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
      showError(err.message || 'Failed to load telemedicine consultations.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors list for dropdown
  const fetchDoctors = async () => {
    try {
      const res = await apiClient.get('/accounts/profile/');
      // Pre-select assigned doctor if available
      if (userProfile?.reviewed_by_doctor?.doctor_id) {
        setSelectedDoctorId(String(userProfile.reviewed_by_doctor.doctor_id));
      }
    } catch (err) {
      console.error('Failed to load doctor profile info:', err);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchDoctors();
  }, []);

  // Fetch time slots whenever selectedDoctorId or selectedDate changes
  const fetchAvailableSlots = async (docId, dateVal) => {
    if (!docId || !dateVal) return;
    try {
      setLoadingSlots(true);
      setBookingError('');
      const res = await apiClient.get(`/telemedicine/available-slots/?doctor_id=${docId}&date=${dateVal}`);
      setAvailableSlots(Array.isArray(res) ? res : []);
      setSelectedSlot('');
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      showError(err.message || 'Failed to fetch doctor availability slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (showRequestModal && selectedDoctorId && selectedDate) {
      fetchAvailableSlots(selectedDoctorId, selectedDate);
    }
  }, [selectedDoctorId, selectedDate, showRequestModal]);

  const handleOpenRequestModal = () => {
    if (userProfile?.reviewed_by_doctor?.doctor_id) {
      setSelectedDoctorId(String(userProfile.reviewed_by_doctor.doctor_id));
    }
    setBookingError('');
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setBookingError('Please select a doctor.');
      return;
    }
    if (!selectedSlot) {
      setBookingError('Please select an available 30-minute time slot.');
      return;
    }
    if (!reason.trim()) {
      setBookingError('Please state the reason for consultation.');
      return;
    }

    try {
      setSubmitting(true);
      setBookingError('');
      const payload = {
        doctor_id: parseInt(selectedDoctorId, 10),
        requested_date: selectedDate,
        requested_time: selectedSlot,
        reason: reason.trim(),
        symptoms: symptoms.trim(),
        priority,
        patient_notes: patientNotes.trim()
      };

      await apiClient.post('/telemedicine/consultations/', payload);
      showSuccess('Telemedicine consultation request submitted successfully!');
      setShowRequestModal(false);
      // Reset form
      setReason('');
      setSymptoms('');
      setPatientNotes('');
      setSelectedSlot('');
      fetchConsultations();
    } catch (err) {
      console.error('Booking failed:', err);
      const errMsg = err.detail || err.message || 'This time slot is no longer available. Please select another time.';
      setBookingError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConsultation = async (consultationId) => {
    if (!window.confirm('Are you sure you want to cancel this consultation request?')) return;
    try {
      await apiClient.post(`/telemedicine/consultations/${consultationId}/cancel/`);
      showSuccess('Consultation cancelled.');
      fetchConsultations();
    } catch (err) {
      showError(err.message || 'Failed to cancel consultation.');
    }
  };

  // Filter consultations
  const filteredConsultations = consultations.filter((c) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return c.status === 'Pending';
    if (activeTab === 'Scheduled') return ['Scheduled', 'Accepted', 'In Progress', 'Rescheduled'].includes(c.status);
    if (activeTab === 'Completed') return c.status === 'Completed';
    if (activeTab === 'Closed') return ['Rejected', 'Cancelled'].includes(c.status);
    return true;
  });

  const assignedDoctorName = userProfile?.reviewed_by_doctor?.name || 'Assigned Primary Doctor';

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-amber-50 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <Video className="w-4 h-4" />
            <span>Telemedicine Consultation Portal</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Virtual Care & Online Doctors</h2>
          <p className="text-sm text-emerald-100 mt-1 max-w-xl">
            Request online video consultations with your assigned palliative care physician from home.
          </p>
        </div>

        <button
          onClick={handleOpenRequestModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Request Consultation
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
        {['All', 'Pending', 'Scheduled', 'Completed', 'Closed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-emerald-900 text-amber-50 shadow-md'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      {loading ? (
        <div className="py-12 text-center text-stone-500 font-medium">Loading consultations...</div>
      ) : filteredConsultations.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <Video className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No Telemedicine Consultations Found</h3>
          <p className="text-xs text-stone-500 mt-1">
            You currently have no consultations in the <strong className="text-stone-700">{activeTab}</strong> status.
          </p>
          <button
            onClick={handleOpenRequestModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Request Consultation Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConsultations.map((c) => {
            const isJoinable = ['Scheduled', 'In Progress', 'Rescheduled'].includes(c.status) && c.meeting_link;

            return (
              <div
                key={c.consultation_id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Doctor
                      </span>
                      <h4 className="font-bold text-stone-900 text-base">Dr. {c.doctor_name}</h4>
                      <p className="text-xs text-stone-500">{c.doctor_specialization || 'Palliative Medicine'}</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
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
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 mb-3 space-y-1.5 text-xs text-stone-700">
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Date: {c.scheduled_date || c.requested_date}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Time: {c.scheduled_start_time ? `${c.scheduled_start_time} - ${c.scheduled_end_time}` : c.requested_time}
                      </span>
                    </div>
                    <div className="pt-1 text-stone-800 font-semibold line-clamp-1">
                      Reason: "{c.reason}"
                    </div>
                  </div>

                  {c.status === 'Rejected' && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 mb-3">
                      <strong>Rejection Reason:</strong> {c.rejection_reason || 'No reason provided.'}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => setSelectedConsultation(c)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {c.status === 'Pending' && (
                      <button
                        onClick={() => handleCancelConsultation(c.consultation_id)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}

                    {isJoinable && (
                      <a
                        href={c.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST CONSULTATION MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            
            <div className="px-6 py-4 bg-emerald-900 text-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">Request Telemedicine Consultation</h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {bookingError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Assigned Doctor Display */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Selected Doctor
                </label>
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between text-sm font-semibold text-stone-800">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Dr. {assignedDoctorName}</span>
                  </div>
                  <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">Assigned</span>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* 30-MINUTE TIME SLOT SELECTION GRID */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Select 30-Minute Available Time Slot *
                </label>
                {loadingSlots ? (
                  <div className="py-6 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                    Checking doctor availability slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-lg">
                    No slot information available for this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.start_time;
                      const isAvailable = slot.is_available;

                      return (
                        <button
                          key={slot.start_time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot.start_time)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'bg-emerald-800 text-amber-50 border-emerald-900 shadow-md ring-2 ring-emerald-500'
                              : isAvailable
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100 hover:border-emerald-500'
                              : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <span>{slot.start_time} - {slot.end_time}</span>
                          <span className="text-[10px]">
                            {isAvailable ? (
                              <span className="text-emerald-700 font-extrabold">✓ Available</span>
                            ) : (
                              <span className="text-stone-500 font-semibold">❌ Booked</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Urgency Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Reason for Consultation *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Severe breakthrough pain management, medication review"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Symptoms / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe your symptoms or concerns..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Patient Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="Any specific requests or preferred notes..."
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-amber-50 text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting Request...' : 'Submit Consultation Request'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONSULTATION DETAILS MODAL */}
      <ConsultationDetailsModal
        consultation={selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        onRefresh={fetchConsultations}
      />

    </div>
  );
}
