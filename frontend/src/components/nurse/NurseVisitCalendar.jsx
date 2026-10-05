import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  CalendarDays,
  ListFilter,
  Layers,
  Sparkles
} from 'lucide-react';

function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(str) {
  if (!str) return new Date();
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function NurseVisitCalendar({
  onOpenCompleteModal = () => {},
}) {
  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Assign Doctor Modal State
  const [assignDoctorModal, setAssignDoctorModal] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);

  // Fetch Calendar Visits
  const fetchCalendarVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/calendar/?scope=all`, {
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
  }, []);

  // Map visits by scheduled date (YYYY-MM-DD)
  const visitsByDate = useMemo(() => {
    const map = {};
    visits.forEach((v) => {
      const dateKey = v.raw_date || v.scheduled_date;
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(v);
    });
    return map;
  }, [visits]);

  // Selected Day's Visits
  const selectedDayVisits = useMemo(() => {
    return visitsByDate[selectedDate] || [];
  }, [visitsByDate, selectedDate]);

  // Assign Doctor
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

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      const prev = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
      setCurrentMonthDate(prev);
    } else if (viewMode === 'week') {
      const sel = parseYMD(selectedDate);
      sel.setDate(sel.getDate() - 7);
      setSelectedDate(formatYMD(sel));
      setCurrentMonthDate(new Date(sel.getFullYear(), sel.getMonth(), 1));
    } else {
      const sel = parseYMD(selectedDate);
      sel.setDate(sel.getDate() - 1);
      setSelectedDate(formatYMD(sel));
      setCurrentMonthDate(new Date(sel.getFullYear(), sel.getMonth(), 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
      setCurrentMonthDate(next);
    } else if (viewMode === 'week') {
      const sel = parseYMD(selectedDate);
      sel.setDate(sel.getDate() + 7);
      setSelectedDate(formatYMD(sel));
      setCurrentMonthDate(new Date(sel.getFullYear(), sel.getMonth(), 1));
    } else {
      const sel = parseYMD(selectedDate);
      sel.setDate(sel.getDate() + 1);
      setSelectedDate(formatYMD(sel));
      setCurrentMonthDate(new Date(sel.getFullYear(), sel.getMonth(), 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
    const d = new Date();
    d.setDate(1);
    setCurrentMonthDate(d);
  };

  // Month Grid Calculation (Mon -> Sun)
  const monthGridDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday is index 6

    const days = [];
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    // Leading days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      const dateKey = formatYMD(d);
      days.push({
        date: dateKey,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isToday: dateKey === todayStr,
      });
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = formatYMD(dateObj);
      days.push({
        date: dateKey,
        dayNumber: d,
        isCurrentMonth: true,
        isSunday: dateObj.getDay() === 0,
        isToday: dateKey === todayStr,
      });
    }

    // Trailing days to fill standard grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      const dateKey = formatYMD(dateObj);
      days.push({
        date: dateKey,
        dayNumber: d,
        isCurrentMonth: false,
        isSunday: dateObj.getDay() === 0,
        isToday: dateKey === todayStr,
      });
    }

    return days;
  }, [currentMonthDate, todayStr]);

  // Week Grid Calculation (Mon -> Sun)
  const weekDays = useMemo(() => {
    const sel = parseYMD(selectedDate);
    let dayOfWeek = sel.getDay() - 1;
    if (dayOfWeek < 0) dayOfWeek = 6;

    const weekMonday = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate() - dayOfWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + i);
      const dateKey = formatYMD(d);
      days.push({
        date: dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isSunday: d.getDay() === 0,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDate,
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  // Label for Date Title
  const navigationLabel = useMemo(() => {
    if (viewMode === 'month') {
      return currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      if (weekDays.length > 0) {
        const start = parseYMD(weekDays[0].date);
        const end = parseYMD(weekDays[6].date);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return '';
    } else {
      return parseYMD(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  }, [viewMode, currentMonthDate, weekDays, selectedDate]);

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#e9e2d5] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1e1b14] tracking-tight">
              Visit Calendar
            </h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Doctor + Nurse shared palliative visit timetable (Single Source of Truth)
            </p>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* View Mode Toggle (Month | Week | Day) */}
          <div className="flex bg-[#f5f1e8] p-1 rounded-xl border border-[#e8dfcf]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-[#645e45] text-white shadow-2xs' : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-[#645e45] text-white shadow-2xs' : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-[#645e45] text-white shadow-2xs' : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              Day
            </button>
          </div>

          {/* Month / Week / Day Navigator */}
          <div className="flex items-center space-x-1 bg-[#fdfcf9] p-1 rounded-xl border border-[#e9e2d5]">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-extrabold text-[#1e1b14] px-2.5 min-w-[120px] text-center select-none">
              {navigationLabel}
            </span>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3 py-2 rounded-xl bg-[#f3ede2] text-xs font-bold text-[#645e45] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Refresh */}
          <button
            onClick={fetchCalendarVisits}
            className="p-2 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors cursor-pointer"
            title="Refresh calendar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg.text && (
        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between space-x-2 animate-in fade-in ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg({ text: '', type: '' })} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* VIEW 1: MONTHLY GRID CALENDAR */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e9e2d5] shadow-xs space-y-3">
          {/* Weekday Header Columns */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b border-[#f0ece1]">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div
                key={w}
                className={`text-xs font-black tracking-wider uppercase ${
                  idx === 6 ? 'text-amber-800/70 font-semibold' : 'text-[#645e45]'
                }`}
              >
                <span>{w}</span>
                {idx === 6 && <span className="hidden sm:inline text-[10px] text-amber-700/60 font-medium block">(Off)</span>}
              </div>
            ))}
          </div>

          {/* 7-Column Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthGridDays.map((dayItem) => {
              const dayVisits = visitsByDate[dayItem.date] || [];
              const isSelected = dayItem.date === selectedDate;
              const hasVisits = dayVisits.length > 0;

              // Check urgency highlights
              const hasEmergency = dayVisits.some((v) => (v.urgency_level || '').toLowerCase() === 'emergency');
              const hasUrgent = dayVisits.some((v) => (v.urgency_level || '').toLowerCase() === 'urgent');
              const hasCompleted = dayVisits.every((v) => v.status === 'Completed') && hasVisits;

              return (
                <div
                  key={dayItem.date}
                  onClick={() => {
                    setSelectedDate(dayItem.date);
                  }}
                  className={`min-h-[84px] sm:min-h-[105px] p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dayItem.isSunday
                      ? 'bg-[#faf7f0]/60 border-[#eee7db] opacity-75'
                      : dayItem.isCurrentMonth
                      ? 'bg-white border-[#e9e2d5] hover:border-[#645e45]/50 hover:shadow-2xs'
                      : 'bg-[#faf8f5] border-[#f0ece1] text-[#a39e93]'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#645e45] bg-[#fbf9f4] border-[#645e45]'
                      : ''
                  }`}
                >
                  {/* Top Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        dayItem.isToday
                          ? 'bg-[#645e45] text-white shadow-2xs'
                          : isSelected
                          ? 'text-[#645e45] font-extrabold'
                          : dayItem.isCurrentMonth
                          ? 'text-[#1e1b14]'
                          : 'text-[#a39e93]'
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {/* Visit Count Badge */}
                    {hasVisits && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${
                          hasEmergency
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : hasUrgent
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : hasCompleted
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-[#f3ede2] text-[#645e45] border-[#e2d7c5]'
                        }`}
                      >
                        {dayVisits.length}
                      </span>
                    )}
                  </div>

                  {/* Visits preview pill / dots */}
                  <div className="space-y-1 mt-1">
                    {hasVisits ? (
                      <div className="space-y-1">
                        {dayVisits.slice(0, 2).map((v) => (
                          <div
                            key={v.occurrence_id}
                            className="text-[10px] font-bold truncate px-1.5 py-0.5 rounded-md bg-[#f7f4ec] text-[#4a473d] border border-[#e8dfcf] flex items-center space-x-1"
                            title={`${v.patient_name} (${v.status})`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                (v.urgency_level || '').toLowerCase() === 'emergency'
                                  ? 'bg-red-500'
                                  : (v.urgency_level || '').toLowerCase() === 'urgent'
                                  ? 'bg-amber-500'
                                  : v.status === 'Completed'
                                  ? 'bg-purple-500'
                                  : 'bg-[#645e45]'
                              }`}
                            />
                            <span className="truncate">{v.patient_name}</span>
                          </div>
                        ))}
                        {dayVisits.length > 2 && (
                          <p className="text-[9px] font-bold text-[#7b776c] text-center">
                            +{dayVisits.length - 2} more
                          </p>
                        )}
                      </div>
                    ) : dayItem.isSunday ? (
                      <span className="text-[10px] text-[#a39e93] italic block text-center">Non-working</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK TIMELINE GRID */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e9e2d5] shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((col) => {
              const colVisits = visitsByDate[col.date] || [];
              const isSelected = col.date === selectedDate;

              return (
                <div
                  key={col.date}
                  onClick={() => setSelectedDate(col.date)}
                  className={`rounded-2xl border p-3 flex flex-col space-y-3 cursor-pointer transition-all ${
                    col.isSunday
                      ? 'bg-[#faf7f0]/60 border-[#eee7db]'
                      : 'bg-[#fcfbf9] border-[#e9e2d5] hover:border-[#645e45]/50'
                  } ${
                    isSelected ? 'ring-2 ring-[#645e45] bg-white border-[#645e45]' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-[#f0ece1] pb-2">
                    <div>
                      <span className="text-xs font-black uppercase text-[#645e45]">{col.dayName}</span>
                      <p className={`text-sm font-black ${col.isToday ? 'text-[#645e45]' : 'text-[#1e1b14]'}`}>
                        {col.dayNumber}
                      </p>
                    </div>
                    {colVisits.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#f3ede2] text-[#645e45]">
                        {colVisits.length}
                      </span>
                    )}
                  </div>

                  {/* Visits List in Column */}
                  <div className="space-y-2 flex-1">
                    {colVisits.length === 0 ? (
                      <p className="text-[11px] text-[#a39e93] italic py-4 text-center">
                        {col.isSunday ? 'Non-working' : 'No visits'}
                      </p>
                    ) : (
                      colVisits.map((v) => (
                        <div
                          key={v.occurrence_id}
                          className="p-2 rounded-xl bg-white border border-[#e9e2d5] shadow-2xs space-y-1"
                        >
                          <span className="font-black text-xs text-[#1e1b14] block truncate">
                            {v.patient_name}
                          </span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#7b776c]">{v.location || 'Community'}</span>
                            <span className={`px-1.5 py-0.2 rounded-md font-bold ${
                              v.status === 'Completed' ? 'bg-purple-50 text-purple-800' : 'bg-blue-50 text-blue-800'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY AGENDA: SELECTED DAY'S VISITS (Always accessible & interactive) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#e9e2d5] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f0ece1] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f5f1e8] text-[#645e45] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1e1b14]">
                Visits for {parseYMD(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-[11px] text-[#7b776c]">
                Community palliative care visits scheduled on this day
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#645e45] bg-[#f3ede2] px-3 py-1 rounded-full border border-[#e2d7c5]">
            {selectedDayVisits.length} Visit{selectedDayVisits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Selected Day Visits Content */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : selectedDayVisits.length === 0 ? (
          <div className="py-10 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5] space-y-1.5">
            <Home className="w-9 h-9 text-[#7b776c]/40 mx-auto" />
            <h4 className="text-xs font-bold text-[#4a473d]">No visits scheduled for this date</h4>
            <p className="text-[11px] text-[#7b776c] max-w-sm mx-auto">
              No home visits are scheduled across the palliative team for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayVisits.map((v) => {
              const isCompleted = v.status === 'Completed';

              return (
                <div
                  key={v.occurrence_id}
                  className="p-4 sm:p-5 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Patient Info & Meta */}
                  <div className="space-y-1.5 min-w-0 pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-[#1e1b14]">{v.patient_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3ede2] text-[#645e45]">
                        {v.visit_type || 'Routine'} Visit
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : v.status === 'Rescheduled'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
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
                      <span>Doctor: <strong className="text-[#1e1b14]">{v.visiting_doctor_name || 'Not Assigned'}</strong></span>
                      {isCompleted && v.completed_by_nurse_name && (
                        <>
                          <span>•</span>
                          <span>Completed by: <strong className="text-[#1e1b14]">{v.completed_by_nurse_name}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                    {/* Assign Doctor */}
                    {!isCompleted && (
                      <button
                        onClick={() => openAssignDoctorModal(v)}
                        className="px-3 py-1.5 bg-[#fdfbf7] text-[#645e45] border border-[#e0d9cc] text-xs font-bold rounded-xl hover:bg-[#f4ede0] transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{v.visiting_doctor_id || v.visiting_doctor_name ? 'Change Doctor' : 'Assign Doctor'}</span>
                      </button>
                    )}

                    {/* Complete Visit (Any Authorized Nurse) */}
                    {!isCompleted && (
                      <button
                        onClick={() => onOpenCompleteModal(v)}
                        className="px-4 py-2 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 flex-shrink-0 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Visit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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

