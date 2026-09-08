import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  UploadCloud,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Stethoscope,
  X,
  UserPlus,
  Edit3,
  CheckSquare,
  Square
} from 'lucide-react';

const WEEKDAYS = [
  { id: 'Monday', label: 'Monday' },
  { id: 'Tuesday', label: 'Tuesday' },
  { id: 'Wednesday', label: 'Wednesday' },
  { id: 'Thursday', label: 'Thursday' },
  { id: 'Friday', label: 'Friday' },
  { id: 'Saturday', label: 'Saturday' },
  { id: 'Sunday', label: 'Sunday', disabled: true },
];

export default function NurseHomeVisits({
  onOpenCompleteModal = () => {},
  onOpenSummaryModal = () => {},
  onNavigateTab = () => {},
}) {
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'available' | 'allocated' | 'upcoming' | 'completed' | 'schedules'
  const [visits, setVisits] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [allocatingId, setAllocatingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Create Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [approvedPatients, setApprovedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('Weekly');
  const [scheduleCustomDays, setScheduleCustomDays] = useState(['Monday', 'Wednesday', 'Friday']);
  const [scheduleStartDate, setScheduleStartDate] = useState(() => {
    const today = new Date();
    if (today.getDay() === 0) { // Sunday -> move to Monday
      today.setDate(today.getDate() + 1);
    }
    return today.toISOString().split('T')[0];
  });
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Edit Schedule Modal State
  const [editScheduleModal, setEditScheduleModal] = useState(null); // schedule object
  const [editFrequency, setEditFrequency] = useState('Weekly');
  const [editCustomDays, setEditCustomDays] = useState([]);
  const [editEffectiveDate, setEditEffectiveDate] = useState(() => {
    const today = new Date();
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    return today.toISOString().split('T')[0];
  });
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Assign/Change Doctor Modal State
  const [assignDoctorModal, setAssignDoctorModal] = useState(null); // occurrence object
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);

  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/home-visits/?tab=${activeSubTab}&search=${encodeURIComponent(searchQuery)}`, {
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
      console.error('Error fetching nurse home visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/home-visits/schedules/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching recurring schedules:', err);
    }
  };

  const fetchApprovedPatients = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/nurse/patients/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const patientList = Array.isArray(data) ? data : (data.patients || []);
        setApprovedPatients(patientList);
        if (patientList.length > 0 && !selectedPatientId) {
          setSelectedPatientId(patientList[0].patient_id);
        }
      }
    } catch (err) {
      console.error('Error fetching approved patients:', err);
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
      console.error('Error fetching available doctors:', err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'schedules') {
      fetchSchedules();
    } else {
      fetchVisits();
    }
  }, [activeSubTab, searchQuery]);

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
        setFeedbackMsg({ text: data.message || 'Visit successfully allocated to you.', type: 'success' });
        fetchVisits();
      } else {
        setFeedbackMsg({ text: data.detail || 'Allocation failed.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error during self-allocation.', type: 'error' });
    } finally {
      setAllocatingId(null);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setFeedbackMsg({ text: 'Please select an approved patient.', type: 'error' });
      return;
    }

    if (scheduleFrequency === 'Custom' && scheduleCustomDays.length === 0) {
      setFeedbackMsg({ text: 'Please select at least one working day for Custom frequency.', type: 'error' });
      return;
    }

    const checkDate = new Date(scheduleStartDate);
    if (checkDate.getDay() === 0) {
      setFeedbackMsg({ text: 'Sunday is a non-working day. Please select Monday through Saturday.', type: 'error' });
      return;
    }

    setIsSubmittingSchedule(true);
    setFeedbackMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/home-visits/schedules/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          frequency: scheduleFrequency,
          custom_days: scheduleFrequency === 'Custom' ? scheduleCustomDays : [],
          start_date: scheduleStartDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ text: data.message || 'Recurring Home Visit schedule created successfully!', type: 'success' });
        setShowScheduleModal(false);
        fetchVisits();
        fetchSchedules();
      } else {
        const errorDetail = data.detail || (data.errors ? Object.values(data.errors).flat().join(' ') : 'Failed to create schedule.');
        setFeedbackMsg({ text: errorDetail, type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error while creating schedule.', type: 'error' });
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleOpenEditSchedule = (schedule) => {
    setEditScheduleModal(schedule);
    setEditFrequency(schedule.frequency || 'Weekly');
    setEditCustomDays(schedule.custom_days || ['Monday', 'Wednesday', 'Friday']);
    const today = new Date();
    if (today.getDay() === 0) today.setDate(today.getDate() + 1);
    setEditEffectiveDate(today.toISOString().split('T')[0]);
    setEditReason('');
  };

  const handleSaveEditSchedule = async (e) => {
    e.preventDefault();
    if (!editScheduleModal) return;

    if (editFrequency === 'Custom' && editCustomDays.length === 0) {
      setFeedbackMsg({ text: 'Please select at least one working day for Custom frequency.', type: 'error' });
      return;
    }

    const checkDate = new Date(editEffectiveDate);
    if (checkDate.getDay() === 0) {
      setFeedbackMsg({ text: 'Sunday is a non-working day. Effective date must be Monday through Saturday.', type: 'error' });
      return;
    }

    setIsSubmittingEdit(true);
    setFeedbackMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/schedules/${editScheduleModal.schedule_id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frequency: editFrequency,
          custom_days: editFrequency === 'Custom' ? editCustomDays : [],
          effective_date: editEffectiveDate,
          reason: editReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ text: data.message || 'Recurring schedule updated successfully!', type: 'success' });
        setEditScheduleModal(null);
        fetchVisits();
        fetchSchedules();
      } else {
        const errorDetail = data.detail || (data.errors ? Object.values(data.errors).flat().join(' ') : 'Failed to update schedule.');
        setFeedbackMsg({ text: errorDetail, type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error while updating schedule.', type: 'error' });
    } finally {
      setIsSubmittingEdit(false);
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
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ text: data.message || 'Visiting Doctor updated successfully.', type: 'success' });
        setAssignDoctorModal(null);
        fetchVisits();
      } else {
        setFeedbackMsg({ text: data.detail || 'Failed to assign visiting doctor.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error while assigning doctor.', type: 'error' });
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  const openScheduleModal = () => {
    fetchApprovedPatients();
    setShowScheduleModal(true);
  };

  const openAssignDoctorModal = (occ) => {
    fetchDoctors();
    setAssignDoctorModal(occ);
    if (occ.visiting_doctor_id) {
      setSelectedDoctorId(occ.visiting_doctor_id);
    }
  };

  const toggleCustomDay = (dayId, isEdit = false) => {
    if (dayId === 'Sunday') return; // Permanently disabled
    if (isEdit) {
      setEditCustomDays((prev) =>
        prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
      );
    } else {
      setScheduleCustomDays((prev) =>
        prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
      );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-50 text-red-800 border-red-200 font-bold';
      case 'urgent':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getStatusBadge = (status, isAllocatedToMe) => {
    if (status === 'Completed') {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (isAllocatedToMe) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
    }
    if (status === 'Scheduled' || status === 'Rescheduled') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Home Visit Management</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Doctor + Nurse community palliative care, scheduling, team allocation, and clinical documentation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <button
            onClick={openScheduleModal}
            className="px-4 py-2.5 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Recurring Schedule</span>
          </button>
          <button
            onClick={() => onNavigateTab('visit_allocations')}
            className="px-4 py-2.5 bg-[#f3ede2] text-[#645e45] text-xs font-black rounded-xl hover:bg-[#e6dccb] transition-all flex items-center space-x-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Open Allocations</span>
          </button>
          <button
            onClick={() => {
              if (activeSubTab === 'schedules') fetchSchedules();
              else fetchVisits();
            }}
            className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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

      {/* Tabs & Search Filter */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Sub-tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#f5f1e8] p-1.5 rounded-xl">
          {[
            { id: 'all', label: 'All Visits' },
            { id: 'available', label: 'Available for Allocation' },
            { id: 'allocated', label: 'My Allocated' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
            { id: 'schedules', label: 'Recurring Schedules' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeSubTab === t.id
                  ? 'bg-white text-[#645e45] shadow-xs'
                  : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {activeSubTab !== 'schedules' && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7b776c]" />
            <input
              type="text"
              placeholder="Search patient, reg ID, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 bg-[#fdfcf9]"
            />
          </div>
        )}
      </div>

      {/* RECURRING SCHEDULES TAB */}
      {activeSubTab === 'schedules' ? (
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
              <Calendar className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
              <h3 className="text-sm font-black text-[#1e1b14]">No recurring schedules found</h3>
              <p className="text-xs text-[#7b776c] mt-1">Create a recurring palliative schedule for an approved patient.</p>
            </div>
          ) : (
            schedules.map((sch) => (
              <div
                key={sch.schedule_id}
                className="bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:border-[#645e45]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-[#1e1b14]">{sch.patient_name}</span>
                    <span className="text-xs font-bold text-[#7b776c]">(#{sch.patient_reg_id})</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#f3ede2] text-[#645e45] border border-[#e2d7c5]">
                      {sch.frequency_display || sch.frequency}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {sch.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#7b776c]">
                    <span className="flex items-center space-x-1 font-semibold text-[#4a473d]">
                      <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                      <span>Started: {sch.start_date}</span>
                    </span>
                    <span>•</span>
                    <span>Managed by: <strong>Nurse {sch.nurse_name}</strong></span>
                    {sch.default_visiting_doctor_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center space-x-1 text-[#645e45] font-semibold">
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Default Doctor: {sch.default_visiting_doctor_name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEditSchedule(sch)}
                    className="px-4 py-2 bg-[#fdfbf7] text-[#645e45] border border-[#e0d9cc] text-xs font-bold rounded-xl hover:bg-[#f4ede0] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Recurring Schedule</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VISITS LIST */
        isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white border border-[#e9e2d5] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
            <Home className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
            <h3 className="text-sm font-black text-[#1e1b14]">No home visits found</h3>
            <p className="text-xs text-[#7b776c] mt-1">There are no visits matching the selected tab or search query.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((occ) => (
              <div
                key={occ.occurrence_id}
                className="bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:border-[#645e45]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-[#1e1b14]">
                      {occ.patient_name}
                    </span>
                    <span className="text-xs font-bold text-[#7b776c]">
                      (#{occ.patient_reg_id})
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${getPriorityBadge(occ.urgency_level)}`}>
                      {occ.urgency_level || 'Routine'}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${getStatusBadge(occ.status, occ.is_allocated_to_me)}`}>
                      {occ.is_allocated_to_me ? 'Allocated to You' : occ.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#f3ede2] text-[#645e45] font-semibold">
                      {occ.visit_type} Visit
                    </span>
                    {/* Dedicated Frequency Badge */}
                    <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#faf8f4] text-[#4a473d] border border-[#e9e2d5] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#645e45]" />
                      <span>Frequency: {occ.frequency_display || occ.frequency || 'Every Day'}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#7b776c]">
                    <span className="flex items-center space-x-1 font-bold text-[#4a473d]">
                      <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                      <span>{occ.scheduled_date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#7b776c]" />
                      <span>{occ.location}</span>
                    </span>
                  </div>

                  {/* Team Assignment Banner */}
                  <div className="p-2.5 rounded-xl bg-[#faf8f4] border border-[#f0ece1] flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-bold text-[#645e45] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#645e45]" />
                      Nurse: <strong className="text-[#1e1b14]">{occ.allocated_nurse || 'Unallocated'}</strong>
                    </span>
                    <span className="text-[#d8d2c2]">|</span>
                    <span className="font-bold text-[#645e45] flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#645e45]" />
                      Visiting Doctor: <strong className="text-[#1e1b14]">
                        {occ.visiting_doctor_name || (occ.visiting_doctor && occ.visiting_doctor !== 'Unassigned' ? occ.visiting_doctor : 'Not Assigned')}
                      </strong>
                    </span>
                  </div>

                  {occ.notes && (
                    <p className="text-xs text-[#4a473d] bg-[#faf8f4] p-2.5 rounded-xl border border-[#f0ece1]">
                      <span className="font-semibold text-[#7b776c]">Notes: </span>
                      {occ.notes}
                    </p>
                  )}

                  {/* Vitals Summary if Completed */}
                  {occ.summary && (
                    <div className="mt-2 p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-purple-950">
                        <span>Nurse Recorded Vitals & Assessment:</span>
                        <span className="text-[10px] font-normal text-purple-700">{occ.summary.recorded_at}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-purple-900 pt-1">
                        <div>BP: <strong>{occ.summary.blood_pressure || 'N/A'}</strong></div>
                        <div>Pulse: <strong>{occ.summary.pulse ? `${occ.summary.pulse} bpm` : 'N/A'}</strong></div>
                        <div>Temp: <strong>{occ.summary.temperature ? `${occ.summary.temperature} °F` : 'N/A'}</strong></div>
                        <div>SpO2: <strong>{occ.summary.oxygen_level ? `${occ.summary.oxygen_level}%` : 'N/A'}</strong></div>
                      </div>
                      {occ.summary.treatment_notes && (
                        <p className="text-[11px] text-purple-950 pt-1">
                          <strong>Care: </strong>{occ.summary.treatment_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 flex-shrink-0 self-end lg:self-center flex-wrap gap-y-2">
                  {occ.status !== 'Completed' && (
                    <button
                      onClick={() => openAssignDoctorModal(occ)}
                      className="px-3.5 py-2 bg-[#fdfbf7] text-[#645e45] border border-[#e0d9cc] text-xs font-bold rounded-xl hover:bg-[#f4ede0] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                      title="Change or assign visiting doctor"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{occ.visiting_doctor_id || occ.visiting_doctor_name ? 'Change Doctor' : 'Assign Doctor'}</span>
                    </button>
                  )}

                  {occ.is_allocated_to_me && occ.status !== 'Completed' && (
                    <button
                      onClick={() => onOpenCompleteModal(occ)}
                      className="px-4 py-2 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Visit</span>
                    </button>
                  )}

                  {occ.is_allocated_to_me && (
                    <button
                      onClick={() => onOpenSummaryModal(occ)}
                      className="px-3.5 py-2 bg-blue-50 text-blue-900 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Upload Summary File"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Doc</span>
                    </button>
                  )}

                  {!occ.allocated_nurse_id && occ.status !== 'Completed' && (
                    <button
                      onClick={() => handleSelfAllocate(occ)}
                      disabled={allocatingId === occ.occurrence_id}
                      className="px-4 py-2 bg-[#f3ede2] text-[#645e45] text-xs font-bold rounded-xl hover:bg-[#645e45] hover:text-white transition-all flex items-center space-x-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {allocatingId === occ.occurrence_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Claim Visit</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE RECURRING SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Create Recurring Schedule</h2>
                  <p className="text-xs text-[#7b776c]">Establish palliative community visit routine</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Select Approved Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                  required
                >
                  {approvedPatients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} (#{p.registration_id}) — {p.place || 'All Areas'}
                    </option>
                  ))}
                  {approvedPatients.length === 0 && (
                    <option value="" disabled>No approved patients found</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Recurring Frequency *
                </label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                >
                  <option value="Every Day">Every Day (Mon – Sat)</option>
                  <option value="Weekly">Weekly (Every 7 days)</option>
                  <option value="Every 2 Weeks">Every 2 Weeks (14 days)</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Custom">Custom (Select Weekdays)</option>
                </select>
              </div>

              {/* CUSTOM WEEKDAYS SELECTION */}
              {scheduleFrequency === 'Custom' && (
                <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e9e2d5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4a473d]">Repeat on:</span>
                    <span className="text-[10px] text-[#7b776c]">Select at least 1 working day</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {WEEKDAYS.map((day) => {
                      const isSelected = scheduleCustomDays.includes(day.id);
                      if (day.disabled) {
                        return (
                          <div
                            key={day.id}
                            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-400 text-xs font-medium cursor-not-allowed"
                            title="Sunday is a non-working day"
                          >
                            <Square className="w-3.5 h-3.5 text-stone-300" />
                            <span>{day.label} (Off)</span>
                          </div>
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={day.id}
                          onClick={() => toggleCustomDay(day.id, false)}
                          className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : 'bg-white text-[#4a473d] border-[#e9e2d5] hover:border-[#645e45]/40'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#7b776c]" />
                          )}
                          <span>{day.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[#7b776c] italic pt-1">
                    * Sunday is a permanent non-working day and cannot be selected.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f0ece1] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule || approvedPatients.length === 0}
                  className="px-5 py-2 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingSchedule ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <span>Create Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RECURRING SCHEDULE MODAL */}
      {editScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Edit Recurring Schedule</h2>
                  <p className="text-xs text-[#7b776c]">Patient: {editScheduleModal.patient_name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditScheduleModal(null)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  New Frequency *
                </label>
                <select
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                >
                  <option value="Every Day">Every Day (Mon – Sat)</option>
                  <option value="Weekly">Weekly (Every 7 days)</option>
                  <option value="Every 2 Weeks">Every 2 Weeks (14 days)</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Custom">Custom (Select Weekdays)</option>
                </select>
              </div>

              {/* CUSTOM WEEKDAYS SELECTION FOR EDIT */}
              {editFrequency === 'Custom' && (
                <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e9e2d5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4a473d]">Repeat on:</span>
                    <span className="text-[10px] text-[#7b776c]">Select working days</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {WEEKDAYS.map((day) => {
                      const isSelected = editCustomDays.includes(day.id);
                      if (day.disabled) {
                        return (
                          <div
                            key={day.id}
                            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-400 text-xs font-medium cursor-not-allowed"
                          >
                            <Square className="w-3.5 h-3.5 text-stone-300" />
                            <span>{day.label} (Off)</span>
                          </div>
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={day.id}
                          onClick={() => toggleCustomDay(day.id, true)}
                          className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : 'bg-white text-[#4a473d] border-[#e9e2d5] hover:border-[#645e45]/40'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#7b776c]" />
                          )}
                          <span>{day.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[#7b776c] italic pt-1">
                    * Sunday is a permanent non-working day and cannot be selected.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Effective From *
                </label>
                <input
                  type="date"
                  value={editEffectiveDate}
                  onChange={(e) => setEditEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                  required
                />
                <p className="text-[10px] text-[#7b776c] mt-1">
                  Historical and already allocated visits are preserved safely.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a473d] mb-1.5">
                  Reason for Change (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Clinical stabilization, increased care need"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditScheduleModal(null)}
                  className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f0ece1] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN / CHANGE VISITING DOCTOR MODAL */}
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
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors cursor-pointer"
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
                  className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f0ece1] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoctor || availableDoctors.length === 0}
                  className="px-5 py-2 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDoctor ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Save Visiting Doctor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
