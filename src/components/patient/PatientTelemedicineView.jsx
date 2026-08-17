import React, { useState, useEffect } from 'react';
import { Video, Plus, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Eye, ExternalLink, X, Search } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientTelemedicineView({
  userProfile = {},
  onRefresh,
}) {
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Selected Consultation Detail Modal
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const { showSuccess, showError } = useToast();

  const fetchTelemedicineData = async () => {
    try {
      setIsLoading(true);
      // Fetch consultations
      const consultRes = await apiClient.get('/telemedicine/consultations/');
      setConsultations(consultRes || []);

      // Fetch doctors list for selection
      try {
        const docRes = await apiClient.get('/admin/users/');
        const docList = (docRes || []).filter((u) => u.role?.toLowerCase() === 'doctor');
        setDoctors(docList);
        if (docList.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docList[0].user_id);
        }
      } catch (err) {
        console.warn('Doctors list fetch error:', err);
      }
    } catch (error) {
      console.error('Error fetching telemedicine data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemedicineData();
  }, []);

  // Fetch available slots when doctor and date change
  useEffect(() => {
    if (!selectedDoctorId || !targetDate) return;

    const fetchSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const res = await apiClient.get(`/telemedicine/available-slots/?doctor_id=${selectedDoctorId}&date=${targetDate}`);
        setAvailableSlots(res.available_slots || []);
        if (res.available_slots && res.available_slots.length > 0) {
          setSelectedTimeSlot(res.available_slots[0]);
        } else {
          setSelectedTimeSlot('');
        }
      } catch (err) {
        setAvailableSlots([]);
        setSelectedTimeSlot('');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, targetDate]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !targetDate || !selectedTimeSlot) {
      showError('Please select a doctor, date, and available time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/telemedicine/consultations/', {
        doctor_id: selectedDoctorId,
        requested_date: targetDate,
        requested_time: selectedTimeSlot,
        reason: reason.trim(),
        symptoms: symptoms.trim(),
        priority,
      });

      showSuccess('Telemedicine consultation request submitted successfully!');
      setShowRequestModal(false);
      setReason('');
      setSymptoms('');
      fetchTelemedicineData();
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to submit consultation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Telemedicine Consultations & Video Care
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4f2e9] text-[#645e45] rounded-full border border-[#e2dec9]">
              {consultations.length} Consultations
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Book medical officer video consultations, view scheduled appointments, and join live sessions
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setTargetDate(tomorrow.toISOString().split('T')[0]);
            setShowRequestModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Request Telemedicine Consultation</span>
        </button>
      </div>

      {/* Consultations List */}
      {consultations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <Video className="w-10 h-10 text-[#645e45] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Telemedicine Consultations Scheduled
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            You currently have no active or past video consultations. Click "+ Request Telemedicine Consultation" to book a session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => {
            const isScheduled = c.status === 'Scheduled' || c.status === 'In Progress' || c.status === 'Accepted';
            const canJoin = bool => c.meeting_link && isScheduled;

            return (
              <div
                key={c.consultation_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2ece1] gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isScheduled
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                      }`}
                    >
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-[#1e1b14]">
                          Consultation with {c.doctor_name || 'Medical Officer'}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            c.status === 'Scheduled' || c.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : c.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                        Date: {c.scheduled_date || c.requested_date} • Time: {c.scheduled_start_time || c.requested_time || 'TBD'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {c.meeting_link && isScheduled && (
                      <a
                        href={c.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-2xs transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join Video Call</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedConsultation(c)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0] space-y-1">
                  <p><strong>Reason for Consultation:</strong> {c.reason || 'Routine follow-up'}</p>
                  {c.symptoms && <p><strong>Symptoms:</strong> {c.symptoms}</p>}
                  {c.rejection_reason && (
                    <p className="text-rose-700 font-bold">
                      <strong>Rejection Reason:</strong> {c.rejection_reason}
                    </p>
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
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Request Video Consultation
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Select an available doctor and time slot for your appointment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Select Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  {doctors.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      Dr. {d.name} ({d.details?.specialization || 'Palliative Medicine'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Preferred Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Available Slots <span className="text-rose-500">*</span>
                  </label>
                  {isLoadingSlots ? (
                    <p className="py-2 text-[#7b776c] italic">Loading slots...</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="py-2 text-rose-600 font-bold">No slots on this date.</p>
                  ) : (
                    <select
                      required
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                    >
                      {availableSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Reason for Consultation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Follow-up on pain medication, new symptom review"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Current Symptoms & Notes
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe your current discomfort or questions for the doctor..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableSlots.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Consultation Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#1e1b14]">
              <p><strong>Doctor:</strong> {selectedConsultation.doctor_name || 'Medical Officer'}</p>
              <p><strong>Status:</strong> {selectedConsultation.status}</p>
              <p><strong>Date:</strong> {selectedConsultation.scheduled_date || selectedConsultation.requested_date}</p>
              <p><strong>Time:</strong> {selectedConsultation.scheduled_start_time || selectedConsultation.requested_time || 'TBD'}</p>
              <p><strong>Reason:</strong> {selectedConsultation.reason || 'N/A'}</p>
              <p><strong>Symptoms:</strong> {selectedConsultation.symptoms || 'None recorded'}</p>
              {selectedConsultation.meeting_link && (
                <div className="pt-2">
                  <a
                    href={selectedConsultation.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl"
                  >
                    <span>Open Jitsi Meeting Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
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
