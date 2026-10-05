import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Stethoscope,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  HeartPulse,
  Filter,
  CalendarDays,
  CheckSquare,
  Square,
  ChevronDown,
  Edit3,
  Check,
  CalendarPlus,
  ArrowRight
} from 'lucide-react';

const WEEKDAYS = [
  { id: 'Monday', label: 'Mon' },
  { id: 'Tuesday', label: 'Tue' },
  { id: 'Wednesday', label: 'Wed' },
  { id: 'Thursday', label: 'Thu' },
  { id: 'Friday', label: 'Fri' },
  { id: 'Saturday', label: 'Sat' },
  { id: 'Sunday', label: 'Sun', disabled: true },
];

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return dateObj.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
  return dateStr;
}

export default function NurseHomeVisits({
  subPage = 'all', // 'all' | 'schedules' | 'completed' | legacy aliases ('my_visits', 'available')
  onOpenCompleteModal = () => {},
  onOpenSummaryModal = () => {},
  onNavigateTab = () => {},
  onUpdateCounts = () => {},
}) {
  // Current view: 'all' | 'completed' | 'schedules'
  const [currentTab, setCurrentTab] = useState(
    subPage === 'schedules' ? 'schedules' : subPage === 'completed' ? 'completed' : 'all'
  );

  useEffect(() => {
    if (subPage === 'schedules') {
      setCurrentTab('schedules');
    } else if (subPage === 'completed') {
      setCurrentTab('completed');
    } else {
      setCurrentTab('all');
    }
  }, [subPage]);

  // Date selection for daily work area (default: Today)
  const [selectedDate, setSelectedDate] = useState(() => formatDateForInput(new Date()));

  // Data states
  const [visits, setVisits] = useState([]);
  const [completedVisits, setCompletedVisits] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [approvedPatients, setApprovedPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Filters for Home Visits
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [completedDateFilter, setCompletedDateFilter] = useState('');
  const [completedDatePreset, setCompletedDatePreset] = useState('all'); // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'

  // Assign / Change Doctor Modal State
  const [assignDoctorModal, setAssignDoctorModal] = useState(null); // occurrence object or null
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);

  // Create Recurring Schedule Modal State
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [createPatientId, setCreatePatientId] = useState('');
  const [createFrequency, setCreateFrequency] = useState('Weekly');
  const [createCustomDays, setCreateCustomDays] = useState(['Monday', 'Thursday']);
  const [createStartDate, setCreateStartDate] = useState(() => {
    const today = new Date();
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    return formatDateForInput(today);
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Recurring Schedule Modal State
  const [editScheduleModal, setEditScheduleModal] = useState(null);
  const [editFrequency, setEditFrequency] = useState('Weekly');
  const [editCustomDays, setEditCustomDays] = useState([]);
  const [editEffectiveDate, setEditEffectiveDate] = useState(() => formatDateForInput(new Date()));
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // 1. Fetch Visits for the selected date
  const fetchVisitsForDate = async (targetDate) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const dateParam = targetDate || selectedDate;
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/home-visits/?date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVisits(list);
      }
    } catch (err) {
      console.error('Error fetching home visits for date:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Recurring Schedules
  const fetchSchedules = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Doctors list for doctor assignment modal
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
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // 4. Fetch Approved Patients for creating schedule
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
        if (patientList.length > 0 && !createPatientId) {
          setCreatePatientId(patientList[0].patient_id);
        }
      }
    } catch (err) {
      console.error('Error fetching approved patients:', err);
    }
  };

  // 5. Fetch Completed Visits
  const fetchCompletedVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/nurse/home-visits/?tab=completed', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedVisits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching completed home visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchApprovedPatients();
  }, []);

  useEffect(() => {
    if (currentTab === 'schedules') {
      fetchSchedules();
    } else if (currentTab === 'completed') {
      fetchCompletedVisits();
    } else {
      fetchVisitsForDate(selectedDate);
    }
  }, [currentTab, selectedDate]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const parts = selectedDate.split('-');
    const cur = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(formatDateForInput(cur));
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-');
    const cur = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(formatDateForInput(cur));
  };

  const handleToday = () => {
    setSelectedDate(formatDateForInput(new Date()));
  };

  const isTodaySelected = selectedDate === formatDateForInput(new Date());

  // Filtered Visits for display
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (statusFilter !== 'all' && v.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.patient_name?.toLowerCase().includes(q);
        const matchReg = v.patient_reg_id?.toLowerCase().includes(q);
        const matchLocation = v.location?.toLowerCase().includes(q);
        const matchDoc = v.visiting_doctor?.toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchLocation && !matchDoc) {
          return false;
        }
      }
      return true;
    });
  }, [visits, statusFilter, searchQuery]);

  // Filtered Completed Visits for display (Search text + Date filter/preset)
  const filteredCompletedVisits = useMemo(() => {
    const today = new Date();
    const todayStr = formatDateForInput(today);

    return completedVisits.filter((v) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.patient_name?.toLowerCase().includes(q);
        const matchReg = v.patient_reg_id?.toLowerCase().includes(q);
        const matchLocation = v.location?.toLowerCase().includes(q);
        const matchNurse = (v.completed_by_nurse_name || v.summary?.nurse_name || '')?.toLowerCase().includes(q);
        const matchDoc = v.visiting_doctor?.toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchLocation && !matchNurse && !matchDoc) {
          return false;
        }
      }

      // 2. Date Filtering
      const rawDate = v.raw_date; // e.g. "2026-10-05"

      // Custom date selected
      if (completedDateFilter) {
        if (rawDate && rawDate !== completedDateFilter) {
          return false;
        }
      } else if (completedDatePreset === 'today') {
        if (rawDate && rawDate !== todayStr) {
          return false;
        }
      } else if (completedDatePreset === 'this_week') {
        if (rawDate) {
          const parts = rawDate.split('-');
          const vDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const diffDays = (today.getTime() - vDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays < 0 || diffDays > 7) {
            return false;
          }
        }
      } else if (completedDatePreset === 'this_month') {
        if (rawDate) {
          const parts = rawDate.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y !== today.getFullYear() || m !== today.getMonth()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [completedVisits, searchQuery, completedDateFilter, completedDatePreset]);

  // Summary counts for the selected date
  const scheduledCount = visits.filter(v => v.status === 'Scheduled').length;
  const completedCount = visits.filter(v => v.status === 'Completed').length;
  const doctorsAssignedCount = visits.filter(v => v.visiting_doctor_id).length;

  // Open Assign / Change Doctor Modal
  const handleOpenDoctorModal = (occ) => {
    setAssignDoctorModal(occ);
    setSelectedDoctorId(occ.visiting_doctor_id ? String(occ.visiting_doctor_id) : (availableDoctors[0]?.doctor_id ? String(availableDoctors[0].doctor_id) : ''));
  };

  // Submit Doctor Assignment for Occurrence
  const handleSaveDoctorAssignment = async (e) => {
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
          doctor_id: parseInt(selectedDoctorId, 10),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({
          text: data.message || `Doctor assigned for ${assignDoctorModal.patient_name}'s visit.`,
          type: 'success',
        });
        setAssignDoctorModal(null);
        fetchVisitsForDate(selectedDate);
      } else {
        setFeedbackMsg({
          text: data.detail || 'Failed to assign doctor.',
          type: 'error',
        });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error while assigning doctor.', type: 'error' });
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  // Create Schedule Submit
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!createPatientId) {
      setFeedbackMsg({ text: 'Please select an approved patient.', type: 'error' });
      return;
    }

    if (createFrequency === 'Custom' && createCustomDays.length === 0) {
      setFeedbackMsg({ text: 'Please select at least one working day for custom frequency.', type: 'error' });
      return;
    }

    const checkDate = new Date(createStartDate);
    if (checkDate.getDay() === 0) {
      setFeedbackMsg({ text: 'Sunday is a non-working day. Please select Monday through Saturday.', type: 'error' });
      return;
    }

    setIsSubmittingCreate(true);
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
          patient_id: parseInt(createPatientId, 10),
          frequency: createFrequency,
          custom_days: createFrequency === 'Custom' ? createCustomDays : [],
          start_date: createStartDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({
          text: data.message || 'Recurring care schedule created successfully.',
          type: 'success',
        });
        setShowCreateScheduleModal(false);
        fetchSchedules();
      } else {
        const errorDetail = data.detail || (data.errors?.start_date?.[0]) || 'Failed to create schedule.';
        setFeedbackMsg({ text: errorDetail, type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error creating schedule.', type: 'error' });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Schedule Submit
  const handleEditSchedule = async (e) => {
    e.preventDefault();
    if (!editScheduleModal) return;

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
        setFeedbackMsg({
          text: data.message || 'Schedule frequency updated successfully.',
          type: 'success',
        });
        setEditScheduleModal(null);
        fetchSchedules();
      } else {
        setFeedbackMsg({
          text: data.detail || 'Failed to update schedule.',
          type: 'error',
        });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Network error updating schedule.', type: 'error' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const toggleCustomDay = (day) => {
    if (day === 'Sunday') return;
    if (createCustomDays.includes(day)) {
      setCreateCustomDays(createCustomDays.filter(d => d !== day));
    } else {
      setCreateCustomDays([...createCustomDays, day]);
    }
  };

  const toggleEditCustomDay = (day) => {
    if (day === 'Sunday') return;
    if (editCustomDays.includes(day)) {
      setEditCustomDays(editCustomDays.filter(d => d !== day));
    } else {
      setEditCustomDays([...editCustomDays, day]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback Alert */}
      {feedbackMsg.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-xs border transition-all animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-xs font-bold">{feedbackMsg.text}</p>
          </div>
          <button
            onClick={() => setFeedbackMsg({ text: '', type: '' })}
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Section Header with Sub-Page Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#f7f5ee] text-[#645e45] flex items-center justify-center font-black">
              {currentTab === 'schedules' ? (
                <RefreshCw className="w-5 h-5" />
              ) : currentTab === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Home className="w-5 h-5" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1e1b14] tracking-tight">
                {currentTab === 'schedules'
                  ? 'RECURRING CARE SCHEDULES'
                  : currentTab === 'completed'
                  ? 'COMPLETED HOME VISITS'
                  : 'ALL HOME VISITS'}
              </h1>
              <p className="text-xs font-semibold text-[#7b776c]">
                {currentTab === 'schedules'
                  ? 'Manage long-term recurring palliative care plans for registered patients'
                  : currentTab === 'completed'
                  ? 'Audit trail of completed visits, recorded vitals, and documented nursing care summaries'
                  : 'Shared daily home visit schedule • Any nurse can document and complete visits'}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Primary Action */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#f7f5ee] p-1 rounded-2xl flex items-center border border-[#e9e2d5]">
            <button
              onClick={() => setCurrentTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                currentTab === 'all'
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:text-[#1e1b14]'
              }`}
            >
              All Home Visits
            </button>
            <button
              onClick={() => setCurrentTab('completed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                currentTab === 'completed'
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:text-[#1e1b14]'
              }`}
            >
              Completed Visits
            </button>
            <button
              onClick={() => setCurrentTab('schedules')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                currentTab === 'schedules'
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:text-[#1e1b14]'
              }`}
            >
              Recurring Schedules
            </button>
          </div>

          {currentTab === 'schedules' && (
            <button
              onClick={() => setShowCreateScheduleModal(true)}
              className="px-4 py-2.5 bg-[#645e45] text-white rounded-2xl text-xs font-black hover:bg-[#524d38] shadow-xs transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ALL HOME VISITS (DAILY WORK AREA) */}
      {/* ========================================================================= */}
      {currentTab === 'all' && (
        <div className="space-y-6">
          {/* Top Date Navigation Bar (Requirement 3) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Quick Date Stepper: [ ← ] [ Date Display ] [ Today ] [ → ] */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-start">
              <button
                onClick={handlePrevDay}
                className="p-2.5 rounded-2xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors flex items-center justify-center"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-2 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-center min-w-[170px]">
                <div className="text-xs font-black text-[#1e1b14]">
                  {formatDisplayDate(selectedDate)}
                </div>
                {isTodaySelected && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full uppercase tracking-wider">
                    Today
                  </span>
                )}
              </div>

              <button
                onClick={handleNextDay}
                className="p-2.5 rounded-2xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors flex items-center justify-center"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                disabled={isTodaySelected}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  isTodaySelected
                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                    : 'bg-[#645e45]/10 text-[#645e45] border-[#645e45]/30 hover:bg-[#645e45]/20'
                }`}
              >
                Today
              </button>
            </div>

            {/* Date Picker Input & Quick Stats */}
            <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-[#7b776c] hidden lg:inline">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="px-3.5 py-2 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                />
              </div>

              {/* Day Counts */}
              <div className="hidden sm:flex items-center space-x-2 text-xs font-extrabold">
                <span className="px-3 py-1.5 bg-[#f7f5ee] rounded-xl text-[#645e45] border border-[#e9e2d5]">
                  {visits.length} Visits
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-200">
                  {completedCount} Completed
                </span>
              </div>
            </div>
          </div>

          {/* Search & Status Filter Bar */}
          <div className="bg-white rounded-3xl p-4 border border-[#e9e2d5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7b776c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, registration ID, place, or doctor..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-medium text-[#1e1b14] placeholder:text-[#7b776c] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-[#7b776c]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
              >
                <option value="all">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>

          {/* Visits Table / Cards (Requirement 4 & 5) */}
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#645e45] mx-auto" />
              <p className="text-xs font-bold text-[#7b776c]">Loading home visits for {formatDisplayDate(selectedDate)}...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-dashed border-[#e9e2d5] text-center space-y-3">
              <Home className="w-12 h-12 text-[#7b776c]/30 mx-auto" />
              <h3 className="text-base font-black text-[#1e1b14]">No Home Visits Scheduled</h3>
              <p className="text-xs text-[#7b776c] max-w-md mx-auto">
                There are no palliative care home visits scheduled on {formatDisplayDate(selectedDate)}.
                Use the date stepper above or check Recurring Schedules to plan future visits.
              </p>
              <button
                onClick={() => setCurrentTab('schedules')}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#f7f5ee] text-[#645e45] rounded-2xl text-xs font-bold border border-[#e9e2d5] hover:bg-[#645e45]/10"
              >
                <span>View Recurring Schedules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e9e2d5] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf6] border-b border-[#e9e2d5] text-[#7b776c] font-black uppercase text-[10px] tracking-wider">
                      <th className="py-4 px-5">Patient Details</th>
                      <th className="py-4 px-4">Time & Cadence</th>
                      <th className="py-4 px-5">Visiting Doctor / Provider</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece1]">
                    {filteredVisits.map((occ) => {
                      const isCompleted = occ.status === 'Completed';
                      const hasDoctor = Boolean(occ.visiting_doctor_id);

                      return (
                        <tr
                          key={occ.occurrence_id}
                          className="hover:bg-[#fdfbf7] transition-colors"
                        >
                          {/* Patient Info */}
                          <td className="py-4 px-5">
                            <div className="font-extrabold text-[#1e1b14] text-sm">
                              {occ.patient_name}
                            </div>
                            <div className="text-[11px] text-[#7b776c] font-medium flex items-center space-x-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#645e45]" />
                              <span>{occ.location}</span>
                            </div>
                          </td>

                          {/* Time & Cadence */}
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-1.5 font-bold text-[#1e1b14]">
                              <Clock className="w-3.5 h-3.5 text-[#645e45]" />
                              <span>{occ.time || '09:00 AM'}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-[#7b776c] mt-0.5">
                              {occ.frequency_display || 'Weekly'}
                            </div>
                          </td>

                          {/* Visiting Doctor / Provider (Requirement 5 & 7) */}
                          <td className="py-4 px-5">
                            {hasDoctor ? (
                              <div>
                                <div className="flex items-center space-x-1.5 font-black text-[#1e1b14]">
                                  <Stethoscope className="w-3.5 h-3.5 text-[#645e45]" />
                                  <span>{occ.visiting_doctor}</span>
                                </div>
                                {occ.visiting_doctor_specialization && (
                                  <div className="text-[10px] font-medium text-[#7b776c] mt-0.5">
                                    {occ.visiting_doctor_specialization}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                Not Assigned
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                isCompleted
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : occ.status === 'Rescheduled'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {occ.status}
                            </span>
                            {occ.completed_by_nurse_name && (
                              <div className="text-[10px] text-[#7b776c] mt-0.5">
                                Done by: {occ.completed_by_nurse_name}
                              </div>
                            )}
                          </td>

                          {/* Actions: Assign/Change Doctor, View, Complete (Requirement 5 & 10) */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Assign / Change Doctor Button */}
                              {!isCompleted && (
                                <button
                                  onClick={() => handleOpenDoctorModal(occ)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border ${
                                    hasDoctor
                                      ? 'bg-white text-[#4a473d] border-[#d8d2c4] hover:bg-[#f7f5ee]'
                                      : 'bg-[#645e45]/10 text-[#645e45] border-[#645e45]/30 hover:bg-[#645e45]/20'
                                  }`}
                                  title={hasDoctor ? 'Change visiting doctor for this date' : 'Assign doctor for this date'}
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  <span>{hasDoctor ? 'Change Doctor' : 'Assign Doctor'}</span>
                                </button>
                              )}

                              {/* View Details / Summary Button */}
                              <button
                                onClick={() => onOpenSummaryModal(occ)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#4a473d] bg-white border border-[#d8d2c4] hover:bg-[#f7f5ee] transition-all"
                              >
                                View
                              </button>

                              {/* Complete Visit Button (Any Nurse) */}
                              {!isCompleted && (
                                <button
                                  onClick={() => onOpenCompleteModal(occ)}
                                  className="px-3 py-1.5 bg-[#645e45] text-white rounded-xl text-xs font-black hover:bg-[#524d38] shadow-xs transition-all flex items-center space-x-1"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>Complete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPLETED HOME VISITS (AUDIT TRAIL & CARE LOGS) */}
      {/* ========================================================================= */}
      {currentTab === 'completed' && (
        <div className="space-y-6">
          {/* Search & Date Filter Toolbar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e9e2d5] shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#7b776c] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient, ID, location, doctor, or nurse..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs text-[#1e1b14] placeholder-[#7b776c] focus:outline-hidden focus:border-[#645e45] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                  title="Clear text search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Filters: Quick Preset Buttons & Interactive Date Picker */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Presets */}
              <div className="bg-[#f7f5ee] p-1 rounded-2xl flex items-center border border-[#e9e2d5]">
                <button
                  type="button"
                  onClick={() => {
                    setCompletedDatePreset('all');
                    setCompletedDateFilter('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    completedDatePreset === 'all' && !completedDateFilter
                      ? 'bg-[#645e45] text-white shadow-xs'
                      : 'text-[#4a473d] hover:text-[#1e1b14]'
                  }`}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedDatePreset('today');
                    setCompletedDateFilter('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    completedDatePreset === 'today'
                      ? 'bg-[#645e45] text-white shadow-xs'
                      : 'text-[#4a473d] hover:text-[#1e1b14]'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedDatePreset('this_week');
                    setCompletedDateFilter('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    completedDatePreset === 'this_week'
                      ? 'bg-[#645e45] text-white shadow-xs'
                      : 'text-[#4a473d] hover:text-[#1e1b14]'
                  }`}
                >
                  Past 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedDatePreset('this_month');
                    setCompletedDateFilter('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    completedDatePreset === 'this_month'
                      ? 'bg-[#645e45] text-white shadow-xs'
                      : 'text-[#4a473d] hover:text-[#1e1b14]'
                  }`}
                >
                  This Month
                </button>
              </div>

              {/* Specific Date Picker Input */}
              <div className="flex items-center space-x-1.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                <span className="text-[11px] font-semibold text-[#7b776c]">Date:</span>
                <input
                  type="date"
                  value={completedDateFilter}
                  onChange={(e) => {
                    setCompletedDateFilter(e.target.value);
                    if (e.target.value) {
                      setCompletedDatePreset('custom');
                    } else {
                      setCompletedDatePreset('all');
                    }
                  }}
                  className="bg-transparent text-xs text-[#1e1b14] font-bold focus:outline-hidden cursor-pointer"
                  title="Select specific date to filter"
                />
                {completedDateFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedDateFilter('');
                      setCompletedDatePreset('all');
                    }}
                    className="text-stone-400 hover:text-stone-700 p-0.5 ml-1"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Records Counter & Refresh Button */}
            <div className="flex items-center space-x-3 justify-between xl:justify-end border-t xl:border-t-0 pt-2 xl:pt-0 border-[#f0ece1]">
              <span className="text-xs font-bold text-[#7b776c]">
                Showing <strong className="text-[#1e1b14]">{filteredCompletedVisits.length}</strong> records
              </span>
              <button
                type="button"
                onClick={fetchCompletedVisits}
                className="p-2.5 rounded-2xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors flex items-center justify-center cursor-pointer"
                title="Refresh Completed Visits"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Completed Visits List / Table */}
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#645e45] mx-auto" />
              <p className="text-xs font-bold text-[#7b776c]">Loading completed visit records...</p>
            </div>
          ) : filteredCompletedVisits.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-dashed border-[#e9e2d5] text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600/40 mx-auto" />
              <h3 className="text-base font-black text-[#1e1b14]">No Completed Visits Found</h3>
              <p className="text-xs text-[#7b776c] max-w-md mx-auto">
                {searchQuery
                  ? 'No completed visit records match your search criteria.'
                  : 'Completed home visits documented by the nursing team will appear here with full vitals and care summaries.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e9e2d5] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf6] border-b border-[#e9e2d5] text-[#7b776c] font-black uppercase text-[10px] tracking-wider">
                      <th className="py-4 px-5">Patient & Location</th>
                      <th className="py-4 px-4">Visit Date & Time</th>
                      <th className="py-4 px-4">Documented By</th>
                      <th className="py-4 px-4">Visiting Doctor</th>
                      <th className="py-4 px-4">Vitals Summary</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece1]">
                    {filteredCompletedVisits.map((occ) => {
                      const summary = occ.summary;
                      return (
                        <tr key={occ.occurrence_id} className="hover:bg-[#fdfbf7] transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-extrabold text-[#1e1b14] text-sm">
                              {occ.patient_name}
                            </div>
                            <div className="text-[11px] text-[#7b776c] flex items-center space-x-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{occ.location}</span>
                            </div>
                            <div className="text-[10px] text-[#7b776c]/80 mt-0.5">
                              ID: {occ.patient_reg_id || occ.patient_id}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-bold text-[#1e1b14]">
                              {occ.scheduled_date}
                            </div>
                            <div className="text-[11px] text-[#7b776c] flex items-center space-x-1 mt-0.5">
                              <Clock className="w-3 h-3 text-[#7b776c]" />
                              <span>{occ.time || 'Visit Slot'}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                              {occ.completed_by_nurse_name || summary?.nurse_name || 'Nurse'}
                            </span>
                            {summary?.recorded_at && (
                              <div className="text-[10px] text-[#7b776c] mt-0.5">
                                Logged: {summary.recorded_at}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {occ.visiting_doctor && occ.visiting_doctor !== 'Not Assigned' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                {occ.visiting_doctor}
                              </span>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic">Nurse Led</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {summary ? (
                              <div className="space-y-0.5 text-[11px]">
                                {summary.blood_pressure && (
                                  <div>
                                    <span className="text-[#7b776c]">BP: </span>
                                    <strong className="text-[#1e1b14]">{summary.blood_pressure}</strong>
                                  </div>
                                )}
                                {summary.pulse && (
                                  <div>
                                    <span className="text-[#7b776c]">Pulse: </span>
                                    <strong className="text-[#1e1b14]">{summary.pulse} bpm</strong>
                                  </div>
                                )}
                                {summary.oxygen_level && (
                                  <div>
                                    <span className="text-[#7b776c]">SpO2: </span>
                                    <strong className="text-[#1e1b14]">{summary.oxygen_level}%</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic">Vitals logged in chart</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              <span>Completed</span>
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => onOpenSummaryModal(occ)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#645e45] bg-[#645e45]/10 hover:bg-[#645e45]/20 border border-[#645e45]/30 transition-all flex items-center space-x-1.5 ml-auto cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Summary</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECURRING SCHEDULES (LONG-TERM CARE PLANS) */}
      {/* ========================================================================= */}
      {currentTab === 'schedules' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#645e45] mx-auto" />
              <p className="text-xs font-bold text-[#7b776c]">Loading recurring care schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-dashed border-[#e9e2d5] text-center space-y-3">
              <Calendar className="w-12 h-12 text-[#7b776c]/30 mx-auto" />
              <h3 className="text-base font-black text-[#1e1b14]">No Recurring Schedules Configured</h3>
              <p className="text-xs text-[#7b776c] max-w-md mx-auto">
                Create a recurring visit schedule for approved palliative patients to automatically generate individual home visit dates.
              </p>
              <button
                onClick={() => setShowCreateScheduleModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#645e45] text-white rounded-2xl text-xs font-bold shadow-xs hover:bg-[#524d38]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Schedule</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e9e2d5] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf6] border-b border-[#e9e2d5] text-[#7b776c] font-black uppercase text-[10px] tracking-wider">
                      <th className="py-4 px-5">Patient Name</th>
                      <th className="py-4 px-4">Frequency & Cadence</th>
                      <th className="py-4 px-4">Start Date</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece1]">
                    {schedules.map((s) => (
                      <tr key={s.schedule_id} className="hover:bg-[#fdfbf7] transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-[#1e1b14] text-sm">
                            {s.patient_name}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-[#1e1b14] flex items-center space-x-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[#645e45]" />
                            <span>{s.frequency_display || s.frequency}</span>
                          </div>
                          {s.custom_days && s.custom_days.length > 0 && (
                            <div className="text-[10px] text-[#7b776c] mt-0.5">
                              Days: {s.custom_days.join(', ')}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-[#4a473d] font-medium">
                          {s.start_date}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              s.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => {
                              setEditScheduleModal(s);
                              setEditFrequency(s.frequency || 'Weekly');
                              setEditCustomDays(s.custom_days || []);
                              setEditReason('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#645e45] bg-[#645e45]/10 hover:bg-[#645e45]/20 border border-[#645e45]/30 transition-all flex items-center space-x-1.5 ml-auto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Change Frequency</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ASSIGN / CHANGE DOCTOR MODAL (Requirement 6 & 7) */}
      {/* ========================================================================= */}
      {assignDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">
                    {assignDoctorModal.visiting_doctor_id ? 'Change Visiting Doctor' : 'Assign Visiting Doctor'}
                  </h2>
                  <p className="text-[11px] font-medium text-[#7b776c]">
                    Assigns doctor specifically for this individual date
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignDoctorModal(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#e9e2d5]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDoctorAssignment} className="p-6 space-y-4">
              <div className="bg-[#fcfaf6] p-4 rounded-2xl border border-[#e9e2d5] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b776c] font-semibold">Patient:</span>
                  <span className="font-bold text-[#1e1b14]">
                    {assignDoctorModal.patient_name}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b776c] font-semibold">Visit Date:</span>
                  <span className="font-bold text-[#1e1b14]">{assignDoctorModal.scheduled_date}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b776c] font-semibold">Visit Time:</span>
                  <span className="font-bold text-[#1e1b14]">{assignDoctorModal.time || '09:00 AM'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b776c] font-semibold">Current Doctor:</span>
                  <span className="font-bold text-[#645e45]">
                    {assignDoctorModal.visiting_doctor || 'Not Assigned'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-2 uppercase tracking-wider">
                  Select Doctor / Provider
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                  required
                >
                  <option value="">-- Choose Doctor / Specialist --</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.doctor_name} — {doc.specialization} ({doc.service_area})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#7b776c] mt-1.5">
                  Changing the doctor applies ONLY to this visit date ({assignDoctorModal.scheduled_date}).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#f0ece1]">
                <button
                  type="button"
                  onClick={() => setAssignDoctorModal(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#4a473d] hover:bg-[#f7f5ee] border border-[#e9e2d5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoctor || !selectedDoctorId}
                  className="px-5 py-2.5 bg-[#645e45] text-white rounded-2xl text-xs font-black hover:bg-[#524d38] shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingDoctor ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{assignDoctorModal.visiting_doctor_id ? 'Change Doctor' : 'Assign Doctor'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE RECURRING SCHEDULE MODAL */}
      {/* ========================================================================= */}
      {showCreateScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden my-8">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Create Recurring Care Schedule</h2>
                  <p className="text-[11px] font-medium text-[#7b776c]">Establish long-term home visit plan for a patient</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateScheduleModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#e9e2d5]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  Select Approved Patient
                </label>
                <select
                  value={createPatientId}
                  onChange={(e) => setCreatePatientId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {approvedPatients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} {p.place ? `— ${p.place}` : (p.panchayath ? `— ${p.panchayath}` : '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  Visit Frequency
                </label>
                <select
                  value={createFrequency}
                  onChange={(e) => setCreateFrequency(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                >
                  <option value="Weekly">Weekly (Every 7 Days)</option>
                  <option value="TwiceWeekly">Twice Weekly (e.g. Mon, Thu)</option>
                  <option value="Every 2 Weeks">Every 2 Weeks (Fortnightly)</option>
                  <option value="Monthly">Monthly (Every 28 Days)</option>
                  <option value="Every Day">Every Day (Mon - Sat)</option>
                  <option value="Custom">Custom Working Days</option>
                </select>
              </div>

              {/* Custom Working Days Selector */}
              {createFrequency === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold text-[#1e1b14] mb-2">
                    Select Working Days (Sunday excluded):
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = createCustomDays.includes(wd.id);
                      return (
                        <button
                          type="button"
                          key={wd.id}
                          disabled={wd.disabled}
                          onClick={() => toggleCustomDay(wd.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                            wd.disabled
                              ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : 'bg-white text-[#4a473d] border-[#e9e2d5] hover:bg-[#f7f5ee]'
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  Schedule Start Date
                </label>
                <input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                  required
                />
                <p className="text-[11px] text-[#7b776c] mt-1">
                  Sunday is a non-working day. Dates landing on Sunday will automatically shift to Monday.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#f0ece1]">
                <button
                  type="button"
                  onClick={() => setShowCreateScheduleModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#4a473d] hover:bg-[#f7f5ee] border border-[#e9e2d5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !createPatientId}
                  className="px-5 py-2.5 bg-[#645e45] text-white rounded-2xl text-xs font-black hover:bg-[#524d38] shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Schedule</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EDIT RECURRING SCHEDULE MODAL */}
      {/* ========================================================================= */}
      {editScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Update Care Frequency</h2>
                  <p className="text-[11px] font-medium text-[#7b776c]">
                    For {editScheduleModal.patient_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditScheduleModal(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#e9e2d5]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  New Visit Frequency
                </label>
                <select
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                >
                  <option value="Weekly">Weekly (Every 7 Days)</option>
                  <option value="TwiceWeekly">Twice Weekly</option>
                  <option value="Every 2 Weeks">Every 2 Weeks (Fortnightly)</option>
                  <option value="Monthly">Monthly (Every 28 Days)</option>
                  <option value="Every Day">Every Day (Mon - Sat)</option>
                  <option value="Custom">Custom Working Days</option>
                </select>
              </div>

              {editFrequency === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold text-[#1e1b14] mb-2">
                    Select Working Days:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = editCustomDays.includes(wd.id);
                      return (
                        <button
                          type="button"
                          key={wd.id}
                          disabled={wd.disabled}
                          onClick={() => toggleEditCustomDay(wd.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                            wd.disabled
                              ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#645e45] text-white border-[#645e45]'
                              : 'bg-white text-[#4a473d] border-[#e9e2d5] hover:bg-[#f7f5ee]'
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={editEffectiveDate}
                  onChange={(e) => setEditEffectiveDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#1e1b14] mb-1.5 uppercase tracking-wider">
                  Clinical Reason / Note
                </label>
                <textarea
                  rows="2"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Patient stabilized; reducing frequency to fortnightly."
                  className="w-full px-4 py-2.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-2xl text-xs text-[#1e1b14] focus:outline-none focus:ring-2 focus:ring-[#645e45]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#f0ece1]">
                <button
                  type="button"
                  onClick={() => setEditScheduleModal(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#4a473d] hover:bg-[#f7f5ee] border border-[#e9e2d5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 bg-[#645e45] text-white rounded-2xl text-xs font-black hover:bg-[#524d38] shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Frequency</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
