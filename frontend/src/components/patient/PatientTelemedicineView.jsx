import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  X,
  User,
  FileText,
  AlertTriangle,
  RefreshCw,
  Check,
  Stethoscope,
  Info
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

// Helper to format time strings (HH:MM -> hh:mm AM/PM)
const formatSlotTime = (timeStr) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const formattedH = h < 10 ? `0${h}` : `${h}`;
  return `${formattedH}:${m} ${ampm}`;
};

const formatSlotRange = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  return `${formatSlotTime(startTime)} – ${formatSlotTime(endTime)}`;
};

export default function PatientTelemedicineView({
  userProfile = {},
  onRefresh,
}) {
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [doctorError, setDoctorError] = useState('');

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [slotsData, setSlotsData] = useState([]);
  const [lunchBreakData, setLunchBreakData] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [priority, setPriority] = useState('Routine');
  const [patientNotes, setPatientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Selected Consultation Detail Modal
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const { showSuccess, showError } = useToast();

  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      const consultRes = await apiClient.get('/telemedicine/my-consultations/');
      setConsultations(Array.isArray(consultRes) ? consultRes : (consultRes?.results || []));
    } catch (error) {
      console.error('Error fetching telemedicine data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setIsLoadingDoctors(true);
      setDoctorError('');
      const docRes = await apiClient.get('/telemedicine/doctors/');
      const docList = Array.isArray(docRes) ? docRes : (docRes?.results || []);
      setDoctors(docList);
      if (docList.length > 0 && !selectedDoctorId) {
        // If patient has an assigned doctor in profile, prioritize them
        const assignedId = userProfile?.assigned_doctor_id || userProfile?.reviewed_by_doctor_id;
        const matchedDoc = docList.find(d => d.doctor_id === assignedId || d.user_id === assignedId);
        if (matchedDoc) {
          setSelectedDoctorId(String(matchedDoc.doctor_id));
        } else {
          setSelectedDoctorId(String(docList[0].doctor_id));
        }
      }
    } catch (err) {
      console.error('Doctors list fetch error:', err);
      setDoctorError('Unable to load doctors. Please try again.');
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchDoctors();
  }, []);

  // Fetch available fixed slots when doctor or date changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDoctorId || !targetDate) {
      setSlotsData([]);
      return;
    }

    try {
      setIsLoadingSlots(true);
      setSlotsError('');
      const res = await apiClient.get(`/telemedicine/available-slots/?doctor_id=${selectedDoctorId}&date=${targetDate}`);
      if (res && res.slots) {
        setSlotsData(res.slots || []);
        setLunchBreakData(res.lunch_break || null);
      } else if (Array.isArray(res)) {
        setSlotsData(res);
      } else {
        setSlotsData([]);
      }
    } catch (err) {
      console.error('Available slots fetch error:', err);
      setSlotsError('Unable to load available consultation slots.');
      setSlotsData([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDoctorId, targetDate]);

  useEffect(() => {
    if (showRequestModal && selectedDoctorId && targetDate) {
      setSelectedTimeSlot('');
      fetchSlots();
    }
  }, [selectedDoctorId, targetDate, showRequestModal, fetchSlots]);

  const handleOpenRequestModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTargetDate(tomorrow.toISOString().split('T')[0]);
    setSelectedTimeSlot('');
    setReason('');
    setSymptoms('');
    setPatientNotes('');
    setPriority('Routine');
    setSlotsError('');
    setShowRequestModal(true);

    if (doctors.length === 0) {
      fetchDoctors();
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showError('Please select a doctor.');
      return;
    }
    if (!targetDate) {
      showError('Please select a consultation date.');
      return;
    }
    if (!selectedTimeSlot) {
      showError('Please select an available 30-minute consultation slot.');
      return;
    }
    if (!reason.trim()) {
      showError('Please enter the reason for consultation.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/telemedicine/request/', {
        doctor_id: parseInt(selectedDoctorId, 10),
        requested_date: targetDate,
        requested_time: selectedTimeSlot,
        reason: reason.trim(),
        symptoms: symptoms.trim(),
        priority,
        patient_notes: patientNotes.trim(),
      });

      showSuccess('Telemedicine consultation request submitted successfully! Your doctor will review the slot.');
      setShowRequestModal(false);
      fetchConsultations();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit consultation request.';
      showError(msg);
      // Refresh available slots in case slot was occupied in real-time
      fetchSlots();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Split slots into Morning (7 slots) and Afternoon (4 slots)
  const morningSlots = slotsData.filter(s => s.start_time < '13:00');
  const afternoonSlots = slotsData.filter(s => s.start_time >= '14:00');
  const allSlotsBooked = slotsData.length > 0 && slotsData.every(s => !s.is_available);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Telemedicine Consultations & Virtual Care
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4f2e9] text-[#645e45] rounded-full border border-[#e2dec9]">
              {consultations.length} {consultations.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Book fixed 30-minute virtual consultations with verified palliative doctors, view status, and join video sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenRequestModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Request Video Consultation</span>
        </button>
      </div>

      {/* Consultations List */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <div className="w-6 h-6 border-2 border-[#645e45] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#7b776c]">Loading consultation records...</p>
        </div>
      ) : consultations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <Video className="w-10 h-10 text-[#645e45] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Telemedicine Consultations Scheduled
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            You currently have no active or previous virtual consultations. Click "Request Video Consultation" to book an appointment with your doctor.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => {
            const isScheduled = c.status === 'Scheduled' || c.status === 'In Progress' || c.status === 'Accepted' || c.status === 'Rescheduled';
            const canJoin = Boolean(c.meeting_link && (c.status === 'Scheduled' || c.status === 'In Progress' || c.status === 'Rescheduled'));

            return (
              <div
                key={c.consultation_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2ece1] gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        c.status === 'In Progress'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                          : isScheduled
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : c.status === 'Completed'
                          ? 'bg-stone-100 text-stone-700 border-stone-300'
                          : c.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-[#1e1b14]">
                          Consultation with {c.doctor_name || 'Medical Officer'}
                        </h3>
                        {c.doctor_specialization && (
                          <span className="text-[10px] font-bold text-[#7b776c] bg-[#f4ede0] px-2 py-0.5 rounded-md">
                            {c.doctor_specialization}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            c.status === 'In Progress'
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : c.status === 'Scheduled' || c.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : c.status === 'Rescheduled'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : c.status === 'Completed'
                              ? 'bg-stone-100 text-stone-800 border-stone-300'
                              : c.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {c.status === 'Pending' ? 'Pending — Waiting for doctor approval' : c.status}
                        </span>
                        {c.priority && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              c.priority === 'Emergency'
                                ? 'bg-rose-100 text-rose-800'
                                : c.priority === 'Urgent'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#f4ede0] text-[#645e45]'
                            }`}
                          >
                            {c.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                        Appointment: <strong>{c.scheduled_date || c.requested_date}</strong> • Slot: <strong>{c.scheduled_start_time ? formatSlotRange(c.scheduled_start_time.slice(0, 5), c.scheduled_end_time ? c.scheduled_end_time.slice(0, 5) : '10:00') : (c.requested_time ? formatSlotTime(c.requested_time.slice(0, 5)) : 'Pending')}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {canJoin && (
                      <a
                        href={c.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Video Call</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedConsultation(c)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{c.status === 'Completed' ? 'View Summary' : 'Details'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0] space-y-1">
                  <p><strong>Chief Reason:</strong> {c.reason || 'Routine follow-up'}</p>
                  {c.symptoms && <p><strong>Reported Symptoms:</strong> {c.symptoms}</p>}
                  {c.patient_notes && <p><strong>Patient Notes:</strong> {c.patient_notes}</p>}
                  {c.rejection_reason && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 mt-2">
                      <strong className="block font-bold">Doctor Rejection Reason:</strong>
                      <span>{c.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST CONSULTATION MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRequestSubmit}
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Request Video Consultation
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Select a verified doctor, consultation date, and fixed 30-minute time slot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* STEP 1 & 2: Doctor & Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Doctor Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-[#1e1b14]">
                      Select Doctor <span className="text-rose-500">*</span>
                    </label>
                    {isLoadingDoctors && (
                      <span className="text-[10px] text-[#7b776c] font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                      </span>
                    )}
                  </div>

                  {doctorError ? (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between">
                      <span className="text-[11px] font-bold">{doctorError}</span>
                      <button
                        type="button"
                        onClick={fetchDoctors}
                        className="text-[10px] underline font-bold hover:text-rose-900 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      disabled={isLoadingDoctors || doctors.length === 0}
                      className="w-full px-3 py-2.5 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]/20 disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      {isLoadingDoctors ? (
                        <option value="">Loading verified doctors...</option>
                      ) : doctors.length === 0 ? (
                        <option value="">No doctors are currently available for telemedicine.</option>
                      ) : (
                        <>
                          <option value="">Select a Doctor...</option>
                          {doctors.map((d) => (
                            <option key={d.doctor_id} value={d.doctor_id}>
                              {d.name} — {d.specialization || 'Palliative Medicine'}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  )}
                </div>

                {/* Consultation Date */}
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Consultation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]/20"
                  />
                </div>
              </div>

              {/* STEP 3 & 4: 30-MINUTE FIXED SLOT SELECTION */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#1e1b14]">
                    Select Fixed 30-Minute Slot <span className="text-rose-500">*</span>
                  </label>
                  {selectedTimeSlot && (
                    <span className="text-[11px] font-extrabold text-[#645e45] bg-[#f4ede0] px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-[#e2dec9]">
                      <Check className="w-3 h-3 text-[#645e45]" />
                      Selected: {formatSlotTime(selectedTimeSlot)}
                    </span>
                  )}
                </div>

                {/* Slot Display Conditional States */}
                {!selectedDoctorId || !targetDate ? (
                  <div className="p-6 text-center bg-[#fdfbf7] rounded-xl border border-dashed border-[#e0d9cc] space-y-1.5">
                    <Clock className="w-6 h-6 mx-auto text-[#7b776c] opacity-70" />
                    <p className="text-xs font-bold text-[#1e1b14]">
                      Select a doctor and date to view available slots.
                    </p>
                    <p className="text-[11px] text-[#7b776c]">
                      Fixed 30-minute consultation slots will load automatically once a doctor and date are chosen.
                    </p>
                  </div>
                ) : isLoadingSlots ? (
                  <div className="p-8 text-center text-[#7b776c] bg-[#fdfbf7] rounded-xl border border-[#e9e2d5] space-y-2">
                    <div className="w-6 h-6 border-2 border-[#645e45] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold text-xs">Checking doctor slot availability...</p>
                  </div>
                ) : slotsError ? (
                  <div className="p-4 text-center bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-2 text-xs">
                    <AlertCircle className="w-5 h-5 mx-auto text-rose-600" />
                    <p className="font-bold">{slotsError}</p>
                    <button
                      type="button"
                      onClick={fetchSlots}
                      className="px-3 py-1.5 bg-rose-700 text-white rounded-lg font-bold hover:bg-rose-800 transition-colors cursor-pointer text-xs inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                ) : slotsData.length === 0 ? (
                  <div className="p-6 text-center bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1 text-xs font-bold">
                    <p>Unable to load consultation slots for this doctor on the selected date.</p>
                    <button
                      type="button"
                      onClick={fetchSlots}
                      className="text-xs text-[#645e45] underline mt-1"
                    >
                      Refresh Slots
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-[#fdfbf7] p-3.5 rounded-xl border border-[#e9e2d5]">
                    {allSlotsBooked && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold text-center">
                        No consultation slots are available for this doctor on the selected date. Please choose another date or doctor.
                      </div>
                    )}

                    {/* Morning Sessions (7 Slots) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7b776c]">
                          Morning Sessions (09:30 AM – 01:00 PM)
                        </p>
                        <span className="text-[10px] text-[#7b776c] font-semibold">7 Slots</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {morningSlots.map((s) => {
                          const isBooked = !s.is_available;
                          const isSelected = selectedTimeSlot === s.start_time;

                          return (
                            <button
                              key={s.start_time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTimeSlot(s.start_time)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                isSelected
                                  ? 'bg-[#645e45] text-white border-[#645e45] shadow-xs ring-2 ring-[#645e45]/30'
                                  : isBooked
                                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-75'
                                  : 'bg-white text-[#1e1b14] border-[#e0d9cc] hover:border-[#645e45] hover:bg-[#f4ede0] cursor-pointer shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-extrabold text-xs ${isSelected ? 'text-white' : isBooked ? 'line-through text-zinc-400' : 'text-[#1e1b14]'}`}>
                                  {formatSlotRange(s.start_time, s.end_time)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : isBooked
                                      ? 'bg-zinc-200 text-zinc-500'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {isSelected ? 'Selected ✓' : isBooked ? 'Booked' : 'Available'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* LUNCH BREAK BANNER (UNAVAILABLE) */}
                    <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <div>
                          <p className="font-bold text-xs">Lunch Break (01:00 PM – 02:00 PM)</p>
                          <p className="text-[10px] text-amber-800 opacity-90">No consultations are scheduled during doctor lunch hour</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                        Unavailable
                      </span>
                    </div>

                    {/* Afternoon Sessions (4 Slots) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7b776c]">
                          Afternoon Sessions (02:00 PM – 04:00 PM)
                        </p>
                        <span className="text-[10px] text-[#7b776c] font-semibold">4 Slots</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {afternoonSlots.map((s) => {
                          const isBooked = !s.is_available;
                          const isSelected = selectedTimeSlot === s.start_time;

                          return (
                            <button
                              key={s.start_time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTimeSlot(s.start_time)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                isSelected
                                  ? 'bg-[#645e45] text-white border-[#645e45] shadow-xs ring-2 ring-[#645e45]/30'
                                  : isBooked
                                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-75'
                                  : 'bg-white text-[#1e1b14] border-[#e0d9cc] hover:border-[#645e45] hover:bg-[#f4ede0] cursor-pointer shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-extrabold text-xs ${isSelected ? 'text-white' : isBooked ? 'line-through text-zinc-400' : 'text-[#1e1b14]'}`}>
                                  {formatSlotRange(s.start_time, s.end_time)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : isBooked
                                      ? 'bg-zinc-200 text-zinc-500'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {isSelected ? 'Selected ✓' : isBooked ? 'Booked' : 'Available'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 5: Consultation Details */}
              {/* Urgency Priority */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Urgency Priority <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Routine', 'Urgent', 'Emergency'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        priority === p
                          ? p === 'Emergency'
                            ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                            : p === 'Urgent'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-[#645e45] text-white border-[#645e45] shadow-xs'
                          : 'bg-[#fdfbf7] text-[#4a473d] border-[#e0d9cc] hover:bg-[#f4ede0]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Reason for Consultation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Breakthrough pain review, medication guidance"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45] font-medium"
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Symptoms & Discomfort
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe current symptoms (e.g. pain level, nausea, breathlessness)..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45] font-medium"
                />
              </div>

              {/* Patient Notes */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Additional Notes for Doctor
                </label>
                <textarea
                  rows={2}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Any special requests or details..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45] font-medium"
                />
              </div>
            </div>

            {/* STEP 6: Submit Request */}
            <div className="pt-3 border-t border-[#f2ece1] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-[#7b776c]">
                {!selectedDoctorId ? (
                  <span className="text-amber-700 font-medium">Please select a doctor.</span>
                ) : !targetDate ? (
                  <span className="text-amber-700 font-medium">Please select a consultation date.</span>
                ) : !selectedTimeSlot ? (
                  <span className="text-amber-700 font-medium">Please select an available 30-minute consultation slot.</span>
                ) : !reason.trim() ? (
                  <span className="text-amber-700 font-medium">Please enter the reason for consultation.</span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready to submit request
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedDoctorId || !targetDate || !selectedTimeSlot || !reason.trim()}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting Request...' : 'Submit Consultation Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL / CLINICAL SUMMARY MODAL */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Telemedicine Consultation Summary
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Detailed virtual consultation overview and clinical observations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1e1b14]">
              <div className="grid grid-cols-2 gap-2 bg-[#fdfbf7] p-3 rounded-xl border border-[#e9e2d5]">
                <div>
                  <span className="text-[#7b776c] font-medium block">Attending Doctor:</span>
                  <strong>{selectedConsultation.doctor_name || 'Medical Officer'}</strong>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Status:</span>
                  <span className="font-extrabold text-[#645e45]">{selectedConsultation.status}</span>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Scheduled Date:</span>
                  <strong>{selectedConsultation.scheduled_date || selectedConsultation.requested_date}</strong>
                </div>
                <div>
                  <span className="text-[#7b776c] font-medium block">Time Slot:</span>
                  <strong>
                    {selectedConsultation.scheduled_start_time
                      ? formatSlotRange(selectedConsultation.scheduled_start_time.slice(0, 5), selectedConsultation.scheduled_end_time?.slice(0, 5))
                      : (selectedConsultation.requested_time ? formatSlotTime(selectedConsultation.requested_time.slice(0, 5)) : 'Pending')}
                  </strong>
                </div>
              </div>

              {selectedConsultation.meeting_link && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 block">Jitsi Video Meeting Room</span>
                    <span className="text-[10px] text-emerald-700">Encrypted virtual consultation link</span>
                  </div>
                  <a
                    href={selectedConsultation.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Join Room</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#e9e2d5] space-y-1">
                <p><strong>Chief Reason:</strong> {selectedConsultation.reason}</p>
                {selectedConsultation.symptoms && <p><strong>Symptoms Reported:</strong> {selectedConsultation.symptoms}</p>}
                {selectedConsultation.patient_notes && <p><strong>Patient Notes:</strong> {selectedConsultation.patient_notes}</p>}
              </div>

              {/* Doctor Consultation Notes */}
              {selectedConsultation.consultation_notes && selectedConsultation.consultation_notes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[#1e1b14] flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-[#645e45]" />
                    <span>Doctor Clinical Notes</span>
                  </h4>
                  {selectedConsultation.consultation_notes.map((note) => (
                    <div key={note.note_id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-stone-900">
                      {note.symptoms_discussed && <p><strong>Symptoms Discussed:</strong> {note.symptoms_discussed}</p>}
                      {note.clinical_observations && <p><strong>Observations:</strong> {note.clinical_observations}</p>}
                      {note.advice && <p><strong>Clinical Advice:</strong> {note.advice}</p>}
                      {note.recommendations && <p><strong>Recommendations:</strong> {note.recommendations}</p>}
                      {note.notes && <p><strong>Additional Notes:</strong> {note.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-ups */}
              {selectedConsultation.followups && selectedConsultation.followups.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[#1e1b14] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#645e45]" />
                    <span>Follow-up Consultations</span>
                  </h4>
                  {selectedConsultation.followups.map((fu) => (
                    <div key={fu.followup_id} className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-900">
                      <p><strong>Follow-up Date:</strong> {fu.followup_date} at {formatSlotTime(fu.followup_time ? fu.followup_time.slice(0, 5) : '')} ({fu.followup_type})</p>
                      {fu.reason && <p><strong>Reason:</strong> {fu.reason}</p>}
                      {fu.notes && <p><strong>Notes:</strong> {fu.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="px-4 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
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
