import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Home,
  Stethoscope,
  X,
  UserPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function NurseVisitCalendar({
  onOpenCompleteModal = () => {},
}) {
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Assign Doctor Modal State
  const [assignDoctorModal, setAssignDoctorModal] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);
  const [allocatingId, setAllocatingId] = useState(null);

  const fetchCalendarVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/calendar/?scope=${scope}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setVisits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching calendar visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/home-visits/available-doctors/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableDoctors(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(data[0].doctor_id);
        }
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  useEffect(() => {
    fetchCalendarVisits();
  }, [scope]);

  const handleSelfAllocate = async (occ) => {
    setAllocatingId(occ.occurrence_id);
    setFeedbackMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/occurrences/${occ.occurrence_id}/claim/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ text: data.message || 'Visit successfully claimed.', type: 'success' });
        fetchCalendarVisits();
      } else {
        setFeedbackMsg({ text: data.detail || 'Claim failed.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error during claim.', type: 'error' });
    } finally {
      setAllocatingId(null);
    }
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    if (!assignDoctorModal || !selectedDoctorId) return;

    setIsSubmittingDoctor(true);
    setFeedbackMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/occurrences/${assignDoctorModal.occurrence_id}/assign-doctor/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctor_id: selectedDoctorId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ text: data.message || 'Visiting Doctor assigned to team.', type: 'success' });
        setAssignDoctorModal(null);
        fetchCalendarVisits();
      } else {
        setFeedbackMsg({ text: data.detail || 'Doctor assignment failed.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error during doctor assignment.', type: 'error' });
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  const openAssignDoctorModal = (occ) => {
    fetchDoctors();
    setAssignDoctorModal(occ);
    if (occ.visiting_doctor_id) {
      setSelectedDoctorId(occ.visiting_doctor_id);
    }
  };

  const filteredVisits = visits.filter((v) => {
    const visitDate = v.scheduled_date || v.raw_date;
    return visitDate === selectedDate;
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Visit Calendar</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Doctor + Nurse shared palliative visit timetable (Single Source of Truth)
            </p>
          </div>
        </div>

        {/* Scope Toggle & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#f5f1e8] p-1 rounded-xl">
            <button
              onClick={() => setScope('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                scope === 'mine' ? 'bg-white text-[#645e45] shadow-xs' : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              My Visits
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                scope === 'all' ? 'bg-white text-[#645e45] shadow-xs' : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              All Team Visits
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 rounded-xl bg-[#f3ede2] text-xs font-bold text-[#645e45] hover:bg-[#645e45] hover:text-white transition-colors"
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
            />
            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={fetchCalendarVisits}
              className="p-2 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2]"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Selected Day Visits */}
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs">
        <div className="flex items-center justify-between border-b border-[#f0ece1] pb-4 mb-4">
          <h3 className="font-extrabold text-sm text-[#1e1b14]">
            Visits for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <span className="text-xs font-bold text-[#645e45] bg-[#f3ede2] px-3 py-1 rounded-full">
            {filteredVisits.length} Visit{filteredVisits.length !== 1 ? 's' : ''} ({scope === 'mine' ? 'My Visits' : 'All Team'})
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-12 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5]">
            <Home className="w-10 h-10 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No visits scheduled for this date.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">Use the date navigation arrows to inspect other dates or switch to "All Team Visits".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((v) => (
              <div
                key={v.occurrence_id}
                className="p-5 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-[#1e1b14]">{v.patient_name}</span>
                    <span className="text-xs text-[#7b776c] font-semibold">(#{v.patient_reg_id})</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3ede2] text-[#645e45]">
                      {v.visit_type || 'Routine'} Visit
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      v.status === 'Completed' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {v.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7b776c]">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#7b776c]" />
                      <span>{v.location}</span>
                    </span>
                    <span>•</span>
                    <span>Nurse: <strong className="text-[#1e1b14]">{v.allocated_nurse_name || v.allocated_nurse || 'Unassigned'}</strong></span>
                    <span>•</span>
                    <span>Doctor: <strong className="text-[#1e1b14]">{v.visiting_doctor_name || 'Not Assigned'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                  {v.status !== 'Completed' && (
                    <button
                      onClick={() => openAssignDoctorModal(v)}
                      className="px-3 py-1.5 bg-[#fdfbf7] text-[#645e45] border border-[#e0d9cc] text-xs font-bold rounded-xl hover:bg-[#f4ede0] transition-colors flex items-center space-x-1"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{v.visiting_doctor_id || v.visiting_doctor_name ? 'Change Doctor' : 'Assign Doctor'}</span>
                    </button>
                  )}

                  {!v.allocated_nurse_id && v.status !== 'Completed' && (
                    <button
                      onClick={() => handleSelfAllocate(v)}
                      disabled={allocatingId === v.occurrence_id}
                      className="px-3.5 py-1.5 bg-[#f3ede2] text-[#645e45] text-xs font-bold rounded-xl hover:bg-[#645e45] hover:text-white transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      {allocatingId === v.occurrence_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Claim</span>
                    </button>
                  )}

                  {v.status !== 'Completed' && (v.is_allocated_to_me || v.allocated_nurse_id) && (
                    <button
                      onClick={() => onOpenCompleteModal(v)}
                      className="px-4 py-2 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 flex-shrink-0 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Form</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASSIGN DOCTOR MODAL */}
      {assignDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">
                    {assignDoctorModal.visiting_doctor_id || assignDoctorModal.visiting_doctor_name ? 'Change Visiting Doctor' : 'Assign Visiting Doctor'}
                  </h2>
                  <p className="text-xs text-[#7b776c]">
                    For {assignDoctorModal.patient_name} on {assignDoctorModal.scheduled_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignDoctorModal(null)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignDoctor} className="p-6 space-y-4">
              <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#e9e2d5] text-xs">
                <p className="text-[#7b776c]">
                  Doctor + Nurse visit the patient together as a palliative clinical team.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Select Visiting Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                  required
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.doctor_name} — {doc.specialization} ({doc.service_area})
                    </option>
                  ))}
                  {availableDoctors.length === 0 && (
                    <option value="" disabled>No verified doctors available</option>
                  )}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssignDoctorModal(null)}
                  className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f0ece1] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoctor || availableDoctors.length === 0}
                  className="px-5 py-2 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingDoctor ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Assign Doctor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
