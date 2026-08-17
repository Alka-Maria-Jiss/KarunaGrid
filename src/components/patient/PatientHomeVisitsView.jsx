import React, { useState } from 'react';
import { Home, Plus, Calendar, Clock, CheckCircle2, User, Activity, AlertCircle, RefreshCw, X, HeartPulse } from 'lucide-react';
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
  const [selectedSummary, setSelectedSummary] = useState(null);

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
      showSuccess(res.message || 'Home visit request submitted successfully!');
      setShowRequestModal(false);
      setNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to submit visit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upcomingOccurrences = occurrences.filter((o) => o.status === 'Scheduled' || o.status === 'Pending');
  const pastOccurrences = occurrences.filter((o) => o.status === 'Completed' || o.status === 'Skipped');

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
            Palliative nurse home visit schedules, additional visit requests, and recorded vitals reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRequestType('schedule_change');
              setShowRequestModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
          >
            Change Schedule
          </button>
          <button
            type="button"
            onClick={() => {
              setRequestType('additional');
              setShowRequestModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            + Request Home Visit
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
                {schedule.frequency} Home Palliative Visits
              </h3>
              <p className="text-xs text-[#7b776c]">
                Assigned by Dr. {schedule.doctor_name} since {schedule.start_date}
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
              ? 'Click "+ Request Home Visit" above to request an additional care visit from our nursing team.'
              : 'Completed visit reports and recorded vital stats will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((occ) => (
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-[#1e1b14]">
                        {occ.visit_type} Home Visit
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#f4ede0] text-[#645e45]">
                        {occ.urgency_level}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                          occ.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {occ.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                      Scheduled Date: {occ.scheduled_date} • Assigned Nurse: {occ.nurse_name}
                    </p>
                  </div>
                </div>

                {occ.summary && (
                  <button
                    type="button"
                    onClick={() => setSelectedSummary(occ.summary)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl cursor-pointer"
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>View Vitals</span>
                  </button>
                )}
              </div>

              {occ.notes && (
                <p className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                  <strong>Notes:</strong> {occ.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REQUEST VISIT / SCHEDULE CHANGE MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRequestSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442]">
                  <Home className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-[#1e1b14]">
                  {requestType === 'schedule_change'
                    ? 'Request Schedule Frequency Change'
                    : 'Request Home Visit'}
                </h3>
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
                  Request Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  <option value="additional">One-Time Additional Visit</option>
                  <option value="regular">Regular Scheduled Visit</option>
                  <option value="schedule_change">Recurring Frequency Change</option>
                </select>
              </div>

              {requestType === 'schedule_change' ? (
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Desired Visit Frequency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={requestedFrequency}
                    onChange={(e) => setRequestedFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  >
                    <option value="Weekly">Weekly (Once a week)</option>
                    <option value="TwiceWeekly">Twice Weekly (Two visits a week)</option>
                    <option value="Fortnightly">Fortnightly (Every 2 weeks)</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              ) : (
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
                      className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#1e1b14] mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency Care</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Reason & Notes for Nursing Team
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your current care requirements or specific palliative support needed..."
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
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VITALS SUMMARY DETAIL MODAL */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Visit Vitals Summary
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSummary(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
                <span className="text-[10px] text-[#7b776c] font-bold">Blood Pressure</span>
                <p className="text-sm font-black text-[#1e1b14]">{selectedSummary.blood_pressure || 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
                <span className="text-[10px] text-[#7b776c] font-bold">Pulse Rate</span>
                <p className="text-sm font-black text-[#1e1b14]">{selectedSummary.pulse ? `${selectedSummary.pulse} bpm` : 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
                <span className="text-[10px] text-[#7b776c] font-bold">Oxygen (SpO2)</span>
                <p className="text-sm font-black text-[#1e1b14]">{selectedSummary.oxygen_level ? `${selectedSummary.oxygen_level}%` : 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
                <span className="text-[10px] text-[#7b776c] font-bold">Temperature</span>
                <p className="text-sm font-black text-[#1e1b14]">{selectedSummary.temperature ? `${selectedSummary.temperature} °F` : 'N/A'}</p>
              </div>
            </div>

            {selectedSummary.treatment_notes && (
              <p className="text-xs text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                <strong>Treatment Notes:</strong> {selectedSummary.treatment_notes}
              </p>
            )}

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSummary(null)}
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
