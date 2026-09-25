import React, { useState } from 'react';
import {
  Home,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Activity,
  AlertCircle,
  RefreshCw,
  X,
  HeartPulse,
  UserCheck,
  Stethoscope,
  MapPin,
  FileText
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientHomeVisitsView({
  homeVisitsData = {},
  onRefresh,
  initialModal = null,
}) {
  const schedule = homeVisitsData.schedule;
  const occurrences = homeVisitsData.occurrences || [];

  const [activeTab, setActiveTab] = useState('upcoming');
  const [showRequestModal, setShowRequestModal] = useState(Boolean(initialModal));
  const [requestType, setRequestType] = useState(initialModal === 'schedule_change' ? 'schedule_change' : 'additional');
  const [requestDate, setRequestDate] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('Routine');
  const [requestedFrequency, setRequestedFrequency] = useState('Weekly');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

  const { showSuccess, showError } = useToast();

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        request_type: requestType,
        date: requestDate,
        urgency_level: urgencyLevel,
        frequency: requestedFrequency,
        notes: notes.trim(),
      };

      const res = await apiClient.post('/patient/home-visits/', payload);
      showSuccess(res.message || 'Home visit request submitted successfully to nursing team!');
      setShowRequestModal(false);
      setNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to submit visit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseVisitDate = (occ) => {
    if (!occ) return 0;
    if (occ.raw_date) return new Date(occ.raw_date).getTime();
    if (occ.scheduled_date) return new Date(occ.scheduled_date).getTime();
    return 0;
  };

  const sortedOccurrences = [...occurrences].sort((a, b) => parseVisitDate(a) - parseVisitDate(b));

  const upcomingOccurrences = sortedOccurrences.filter((o) => o.status === 'Scheduled' || o.status === 'Pending' || o.status === 'Rescheduled');
  const pastOccurrences = sortedOccurrences.filter((o) => o.status === 'Completed' || o.status === 'Skipped');

  const displayList = activeTab === 'upcoming' ? upcomingOccurrences : pastOccurrences;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Home Care Visits & Community Nursing
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
              {occurrences.length} Total Visits
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Doctor + Nurse team palliative home visits, urgent care requests, and recorded clinical vitals reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRequestType('additional');
              setShowRequestModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Urgent Visit</span>
          </button>
        </div>
      </div>

      {/* SCHEDULE SUMMARY CARD */}
      {schedule && (
        <div className="bg-[#fdfbf7] p-5 rounded-2xl border border-[#e0d9cc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#645e45] text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                Recurring Care Frequency
              </p>
              <h3 className="text-sm font-black text-[#1e1b14]">
                {schedule.frequency_display || schedule.frequency} Home Palliative Visits
              </h3>
              <p className="text-xs text-[#7b776c]">
                Managed by Nurse {schedule.nurse_name || 'Care Team'} • Started on {schedule.start_date}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
            {schedule.status} Schedule
          </span>
        </div>
      )}

      {/* TABS (Upcoming vs Past Visits) */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            Upcoming Visits ({upcomingOccurrences.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'past'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            Visit History & Vitals ({pastOccurrences.length})
          </button>
        </div>
      </div>

      {/* Visits List */}
      {displayList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <Home className="w-10 h-10 text-[#426442] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            {activeTab === 'upcoming'
              ? 'No Upcoming Home Visits Scheduled'
              : 'No Past Visit Reports Recorded'}
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'Click "Request Urgent Visit" above if you require an out-of-cycle visit from our clinical team.'
              : 'Completed visit reports and recorded vital stats will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((occ) => {
            const hasTeam = (occ.allocated_nurse_name || occ.nurse_name) && occ.visiting_doctor_name;
            return (
              <div
                key={occ.occurrence_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#f2ece1] gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-[#1e1b14]">
                          {occ.visit_type} Home Visit
                        </h4>
                        {(occ.frequency_display || occ.frequency) && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
                            {occ.frequency_display || occ.frequency}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                          occ.urgency_level === 'Emergency' ? 'bg-red-100 text-red-900' :
                          occ.urgency_level === 'Urgent' ? 'bg-amber-100 text-amber-900' : 'bg-[#f4ede0] text-[#645e45]'
                        }`}>
                          {occ.urgency_level || 'Routine'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            occ.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : hasTeam
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}
                        >
                          {occ.status === 'Completed' ? 'Completed' : hasTeam ? 'Team Assigned' : occ.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                        Scheduled Date: <strong>{occ.scheduled_date}</strong>
                      </p>
                    </div>
                  </div>

                  {occ.summary && (
                    <button
                      type="button"
                      onClick={() => setSelectedVisitDetail(occ)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl cursor-pointer"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>View Vitals & Summary</span>
                    </button>
                  )}
                </div>

                {/* HOME VISIT TEAM BADGE */}
                <div className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0ece1] flex flex-wrap items-center gap-4 text-xs text-[#4a473d]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-[#645e45]" />
                    Nurse: <strong className="text-[#1e1b14]">{occ.allocated_nurse_name || occ.nurse_name || 'Palliative Nurse'}</strong>
                  </span>
                  <span className="text-[#d8d2c2]">|</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <Stethoscope className="w-3.5 h-3.5 text-[#645e45]" />
                    Visiting Doctor: <strong className="text-[#1e1b14]">{occ.visiting_doctor_name || 'Assigned Visiting Doctor'}</strong>
                  </span>
                </div>

                {occ.notes && (
                  <p className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                    <strong>Notes:</strong> {occ.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST URGENT VISIT MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleRequestSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#645e45] text-white">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Request Home Visit
                  </h3>
                  <p className="text-xs text-[#7b776c]">Direct triage to our palliative nursing team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Urgency Level *
                  </label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                  >
                    <option value="Routine">Routine Care</option>
                    <option value="Urgent">Urgent Visit</option>
                    <option value="Emergency">Emergency Palliative Support</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Reason & Care Needs *
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Please describe symptoms, discomfort, or care requirements..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 text-xs"
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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VITALS & CLINICAL SUMMARY DETAIL MODAL */}
      {selectedVisitDetail && selectedVisitDetail.summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Visit Vitals & Summary
                  </h3>
                  <p className="text-xs text-[#7b776c]">Recorded on {selectedVisitDetail.scheduled_date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitDetail(null)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visit Team Info */}
            <div className="p-3 bg-[#faf8f4] rounded-2xl border border-[#f0ece1] text-xs space-y-1">
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Visiting Team</p>
              <div className="grid grid-cols-2 gap-2 font-bold text-[#1e1b14]">
                <div>Nurse: {selectedVisitDetail.allocated_nurse_name || selectedVisitDetail.nurse_name}</div>
                <div>Doctor: {selectedVisitDetail.visiting_doctor_name || 'Assigned Doctor'}</div>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-[10px] text-purple-800 font-bold">Blood Pressure</span>
                <p className="text-sm font-black text-purple-950">{selectedVisitDetail.summary.blood_pressure || 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-[10px] text-purple-800 font-bold">Pulse Rate</span>
                <p className="text-sm font-black text-purple-950">{selectedVisitDetail.summary.pulse ? `${selectedVisitDetail.summary.pulse} bpm` : 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-[10px] text-purple-800 font-bold">Oxygen (SpO2)</span>
                <p className="text-sm font-black text-purple-950">{selectedVisitDetail.summary.oxygen_level ? `${selectedVisitDetail.summary.oxygen_level}%` : 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-[10px] text-purple-800 font-bold">Temperature</span>
                <p className="text-sm font-black text-purple-950">{selectedVisitDetail.summary.temperature ? `${selectedVisitDetail.summary.temperature} °F` : 'N/A'}</p>
              </div>
            </div>

            {/* Symptoms */}
            {selectedVisitDetail.summary.symptoms && selectedVisitDetail.summary.symptoms.length > 0 && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-[#1e1b14]">Reported Symptoms:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedVisitDetail.summary.symptoms.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                      {s.symptom_name} ({s.severity})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Treatment Notes */}
            {selectedVisitDetail.summary.treatment_notes && (
              <p className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                <strong>Care Notes:</strong> {selectedVisitDetail.summary.treatment_notes}
              </p>
            )}

            {selectedVisitDetail.summary.next_visit_recommendation && (
              <p className="text-xs text-[#7b776c]">
                Next Visit Recommendation: <strong className="text-[#1e1b14]">{selectedVisitDetail.summary.next_visit_recommendation}</strong>
              </p>
            )}

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVisitDetail(null)}
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
