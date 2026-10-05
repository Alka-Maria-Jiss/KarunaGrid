import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Home,
  Stethoscope,
  Video,
  X,
  Loader2,
  AlertCircle,
  CalendarDays,
  ListFilter,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  FileText,
  User,
  HeartPulse,
  Thermometer,
  Wind
} from 'lucide-react';
import apiClient from '../../api/apiClient';

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

export default function DoctorVisitCalendar({
  onSelectPatient = () => {},
  onNavigate = () => {},
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
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'home_visit' | 'telemedicine'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Scheduled' | 'Completed'
  const [selectedSummaryModal, setSelectedSummaryModal] = useState(null);

  // Fetch Calendar Visits & Telemedicine for Doctor
  const fetchCalendarVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [visitsRes, telemedRes] = await Promise.allSettled([
        fetch('http://127.0.0.1:8000/api/care-coordination/home-visits/calendar/?scope=all', { headers }),
        fetch('http://127.0.0.1:8000/api/doctor/telemedicine/consultations/', { headers })
      ]);

      const combinedVisits = [];

      if (visitsRes.status === 'fulfilled' && visitsRes.value.ok) {
        const homeVisits = await visitsRes.value.json();
        if (Array.isArray(homeVisits)) {
          combinedVisits.push(...homeVisits);
        }
      }

      if (telemedRes.status === 'fulfilled' && telemedRes.value.ok) {
        const telemedData = await telemedRes.value.json();
        const telemedList = Array.isArray(telemedData) ? telemedData : (telemedData?.results || []);
        telemedList.forEach((c) => {
          const sDate = c.scheduled_date || c.requested_date;
          if (!sDate) return;
          combinedVisits.push({
            occurrence_id: `telemed-${c.consultation_id || c.id}`,
            patient: c.patient?.patient_id || c.patient_id,
            patient_name: c.patient?.name || c.patient_name || 'Patient',
            patient_reg_id: c.patient?.registration_id || c.patient_reg_id || '',
            patient_phone: c.patient?.phone || c.patient_phone || '',
            location: c.patient?.place || c.patient?.panchayath || 'Tele-consultation',
            scheduled_date: sDate,
            raw_date: sDate,
            visit_type: 'Telemedicine Consultation',
            status: c.status === 'Accepted' || c.status === 'In Progress' ? 'Scheduled' : c.status,
            meeting_link: c.meeting_link,
            visiting_doctor_name: c.doctor?.name ? `Dr. ${c.doctor.name}` : 'Doctor',
            allocated_nurse_name: 'Coordinator',
            time_slot: c.scheduled_start_time || c.requested_time || 'Telemedicine',
            notes: c.clinical_notes || c.symptoms_discussed || '',
            summary: c.clinical_notes ? { treatment_notes: c.clinical_notes } : null,
          });
        });
      }

      setVisits(combinedVisits);
    } catch (err) {
      console.error('Error fetching doctor calendar visits:', err);
    } finally {
      setIsLoading(false);
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

  // Selected Day's Visits with applied filters
  const selectedDayVisits = useMemo(() => {
    const list = visitsByDate[selectedDate] || [];
    return list.filter((v) => {
      if (statusFilter !== 'all' && v.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (typeFilter === 'telemedicine' && !v.visit_type?.toLowerCase().includes('telemedicine')) {
        return false;
      }
      if (typeFilter === 'home_visit' && v.visit_type?.toLowerCase().includes('telemedicine')) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.patient_name?.toLowerCase().includes(q);
        const matchLocation = v.location?.toLowerCase().includes(q);
        const matchDoc = v.visiting_doctor?.toLowerCase().includes(q);
        if (!matchName && !matchLocation && !matchDoc) {
          return false;
        }
      }
      return true;
    });
  }, [visitsByDate, selectedDate, statusFilter, typeFilter, searchQuery]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const currentY = currentMonthDate.getFullYear();
    const currentM = currentMonthDate.getMonth();
    let totalInMonth = 0;
    let completedInMonth = 0;
    let scheduledInMonth = 0;

    Object.entries(visitsByDate).forEach(([dateKey, items]) => {
      const d = parseYMD(dateKey);
      if (d.getFullYear() === currentY && d.getMonth() === currentM) {
        totalInMonth += items.length;
        completedInMonth += items.filter((v) => v.status === 'Completed').length;
        scheduledInMonth += items.filter((v) => v.status === 'Scheduled').length;
      }
    });

    return {
      total: totalInMonth,
      completed: completedInMonth,
      scheduled: scheduledInMonth,
      todayCount: (visitsByDate[todayStr] || []).length,
    };
  }, [visitsByDate, currentMonthDate, todayStr]);

  // Month Navigation
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Generate Calendar Grid
  const calendarGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = formatYMD(pDate);
      days.push({
        date: pDate,
        dateStr,
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSunday: pDate.getDay() === 0,
        visits: visitsByDate[dateStr] || [],
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cDate = new Date(year, month, d);
      const dateStr = formatYMD(cDate);
      days.push({
        date: cDate,
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSunday: cDate.getDay() === 0,
        visits: visitsByDate[dateStr] || [],
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nDate = new Date(year, month + 1, i);
      const dateStr = formatYMD(nDate);
      days.push({
        date: nDate,
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSunday: nDate.getDay() === 0,
        visits: visitsByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentMonthDate, todayStr, visitsByDate]);

  const monthYearTitle = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Completed') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (status === 'Rescheduled') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-black text-[#1e1b14] tracking-tight">
                Clinical Visit Calendar
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                {monthStats.total} Events in {currentMonthDate.toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Comprehensive schedule oversight for team home visits and telemedicine consultations
            </p>
          </div>
        </div>

        {/* Top Controls: View Mode & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-[#f7f5ee] p-1 rounded-2xl flex items-center border border-[#e9e2d5]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:text-[#1e1b14]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'day'
                  ? 'bg-[#645e45] text-white shadow-xs'
                  : 'text-[#4a473d] hover:text-[#1e1b14]'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={fetchCalendarVisits}
            className="p-2.5 rounded-2xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors flex items-center justify-center cursor-pointer"
            title="Refresh Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Month Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
          <div className="flex items-center justify-between text-[#7b776c] text-xs font-semibold">
            <span>Total Events</span>
            <Calendar className="w-4 h-4 text-[#645e45]" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14] mt-1">{monthStats.total}</p>
          <p className="text-[10px] text-[#7b776c] mt-0.5">{monthYearTitle}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
          <div className="flex items-center justify-between text-[#7b776c] text-xs font-semibold">
            <span>Scheduled / Upcoming</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1">{monthStats.scheduled}</p>
          <p className="text-[10px] text-[#7b776c] mt-0.5">Pending clinical visits</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
          <div className="flex items-center justify-between text-[#7b776c] text-xs font-semibold">
            <span>Completed Care Visits</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-800 mt-1">{monthStats.completed}</p>
          <p className="text-[10px] text-[#7b776c] mt-0.5">With vitals & notes</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-2xs">
          <div className="flex items-center justify-between text-[#7b776c] text-xs font-semibold">
            <span>Today's Activities</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14] mt-1">{monthStats.todayCount}</p>
          <p className="text-[10px] text-[#7b776c] mt-0.5">Scheduled for today</p>
        </div>
      </div>

      {/* 3. Main Grid: Interactive Calendar (Left) + Selected Day Events Detail (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT / CALENDAR (7 Cols on XL) */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-5 border border-[#e9e2d5] shadow-xs flex flex-col justify-between">
          <div>
            {/* Calendar Navigation Bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0ece1]">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-[#e9e2d5] hover:bg-[#f7f5ee] text-[#1e1b14] transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <h2 className="text-base font-black text-[#1e1b14] ml-2">
                  {monthYearTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="px-3.5 py-1.5 bg-[#f7f5ee] hover:bg-[#eae4d3] text-[#645e45] text-xs font-bold rounded-xl border border-[#e9e2d5] transition-colors"
              >
                Today
              </button>
            </div>

            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {WEEKDAY_NAMES.map((d, idx) => (
                <div
                  key={d}
                  className={`text-xs font-bold uppercase py-1 ${
                    idx === 6 ? 'text-amber-800/70 font-black' : 'text-[#7b776c]'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((day) => {
                const isSelected = day.dateStr === selectedDate;
                const hasVisits = day.visits.length > 0;
                const completedCount = day.visits.filter((v) => v.status === 'Completed').length;
                const scheduledCount = day.visits.length - completedCount;

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`
                      min-h-[70px] p-2 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer
                      ${!day.isCurrentMonth ? 'bg-stone-50/50 border-stone-100 text-stone-300' : 'bg-[#fcfbf8] border-[#f0ece1] text-[#1e1b14]'}
                      ${day.isSunday ? 'bg-[#fbf7f2]/80' : ''}
                      ${isSelected
                        ? 'border-2 border-[#645e45] bg-[#f5f2e9] shadow-sm font-extrabold'
                        : day.isToday
                        ? 'border-2 border-[#645e45]/60 bg-[#f7f5ee]'
                        : 'hover:border-[#645e45]/40 hover:bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isSelected ? 'font-black text-[#1e1b14]' : 'font-bold'}`}>
                        {day.dayNum}
                      </span>
                      {hasVisits && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-[#645e45] text-white">
                          {day.visits.length}
                        </span>
                      )}
                    </div>

                    {/* Event Dots Preview */}
                    {hasVisits && (
                      <div className="space-y-1 mt-1">
                        {day.visits.slice(0, 2).map((v, i) => {
                          const isTele = v.visit_type?.toLowerCase().includes('telemedicine');
                          return (
                            <div
                              key={i}
                              className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${
                                v.status === 'Completed'
                                  ? 'bg-purple-100 text-purple-900'
                                  : isTele
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              <span className="truncate">{v.patient_name}</span>
                            </div>
                          );
                        })}
                        {day.visits.length > 2 && (
                          <span className="text-[8px] font-bold text-[#7b776c] block pl-1">
                            +{day.visits.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Footer Legend */}
          <div className="mt-4 pt-3 border-t border-[#f0ece1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7b776c]">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Scheduled Home Visit</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Telemedicine</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Completed</span>
              </span>
            </div>
            <span className="text-[11px] text-[#7b776c]/80 font-medium">Sunday: Rest Day</span>
          </div>
        </div>

        {/* RIGHT / SELECTED DAY'S ACTIVITIES (5 Cols on XL) */}
        <div className="xl:col-span-5 bg-white rounded-3xl p-5 border border-[#e9e2d5] shadow-xs flex flex-col justify-between">
          <div>
            {/* Selected Date Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#f0ece1]">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#645e45]" />
                <h3 className="font-extrabold text-sm text-[#1e1b14]">
                  Events for {parseYMD(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                {selectedDayVisits.length} {selectedDayVisits.length === 1 ? 'Activity' : 'Activities'}
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-3.5 h-3.5 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter events..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#fcfaf6] border border-[#e9e2d5] rounded-xl text-xs text-[#1e1b14] focus:outline-hidden"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#fcfaf6] border border-[#e9e2d5] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#4a473d] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="home_visit">Home Visits</option>
                <option value="telemedicine">Telemedicine</option>
              </select>
            </div>

            {/* Events List */}
            {selectedDayVisits.length === 0 ? (
              <div className="py-12 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5] my-2">
                <Calendar className="w-10 h-10 text-[#7b776c]/30 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#4a473d]">No clinical activities on this date.</p>
                <p className="text-[11px] text-[#7b776c] mt-0.5">Select another date on the calendar to view schedule.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedDayVisits.map((v) => {
                  const isTele = v.visit_type?.toLowerCase().includes('telemedicine');
                  const Icon = isTele ? Video : Home;
                  const isCompleted = v.status === 'Completed';

                  return (
                    <div
                      key={v.occurrence_id || v.id}
                      className="p-4 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-xl flex-shrink-0 ${
                              isTele
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-[#1e1b14] truncate">
                              {v.patient_name}
                            </h4>
                            <p className="text-[11px] text-[#7b776c] flex items-center space-x-1.5 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{v.time || 'Visit Slot'}</span>
                              <span>•</span>
                              <span>{v.visit_type || (isTele ? 'Telemedicine' : 'Home Visit')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(v.status)}`}>
                            {v.status}
                          </span>
                        </div>
                      </div>

                      {/* Location & Details */}
                      {v.location && (
                        <div className="text-[11px] text-[#7b776c] flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                          <span className="truncate">{v.location}</span>
                        </div>
                      )}

                      {/* Completed Vitals Snapshot (If completed) */}
                      {isCompleted && v.summary && (
                        <div className="bg-[#f7f5ee] rounded-xl p-2.5 border border-[#e9e2d5] grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div>
                            <span className="text-[#7b776c] block font-medium">BP</span>
                            <strong className="text-[#1e1b14]">{v.summary.blood_pressure || '---'}</strong>
                          </div>
                          <div>
                            <span className="text-[#7b776c] block font-medium">Pulse</span>
                            <strong className="text-[#1e1b14]">{v.summary.pulse ? `${v.summary.pulse} bpm` : '---'}</strong>
                          </div>
                          <div>
                            <span className="text-[#7b776c] block font-medium">SpO2</span>
                            <strong className="text-[#1e1b14]">{v.summary.oxygen_level ? `${v.summary.oxygen_level}%` : '---'}</strong>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#f0ece1]">
                        <button
                          type="button"
                          onClick={() => onSelectPatient(v.patient_id)}
                          className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1"
                        >
                          <span>Open Medical Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <div className="flex items-center space-x-2">
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => setSelectedSummaryModal(v)}
                              className="px-2.5 py-1 bg-[#f7f5ee] hover:bg-[#eae4d3] text-[#645e45] text-[11px] font-bold rounded-lg border border-[#e9e2d5] transition-colors"
                            >
                              View Summary
                            </button>
                          )}

                          {isTele && v.meeting_link && (
                            <a
                              href={v.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition-colors"
                            >
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
          </div>

          <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs text-[#7b776c]">
            <span>Today: {monthStats.todayCount} visits scheduled</span>
            <button
              onClick={() => onNavigate('home_visits')}
              className="font-bold text-[#645e45] hover:underline"
            >
              Manage Home Visits →
            </button>
          </div>
        </div>
      </div>

      {/* 4. Completed Visit Summary Modal */}
      {selectedSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-5 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1e1b14]">
                    Visit Care Summary: {selectedSummaryModal.patient_name}
                  </h3>
                  <p className="text-[11px] text-[#7b776c]">
                    Recorded on {selectedSummaryModal.scheduled_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSummaryModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Vitals */}
              {selectedSummaryModal.summary && (
                <div className="bg-[#fcfaf6] p-4 rounded-2xl border border-[#e9e2d5] space-y-2">
                  <h4 className="font-extrabold text-[#1e1b14] uppercase text-[10px] tracking-wider">
                    Recorded Vitals
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white rounded-xl border border-[#f0ece1]">
                      <span className="text-[#7b776c] block text-[10px]">Blood Pressure</span>
                      <strong className="text-xs text-[#1e1b14]">
                        {selectedSummaryModal.summary.blood_pressure || '---'}
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-[#f0ece1]">
                      <span className="text-[#7b776c] block text-[10px]">Pulse</span>
                      <strong className="text-xs text-[#1e1b14]">
                        {selectedSummaryModal.summary.pulse ? `${selectedSummaryModal.summary.pulse} bpm` : '---'}
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-[#f0ece1]">
                      <span className="text-[#7b776c] block text-[10px]">Oxygen (SpO2)</span>
                      <strong className="text-xs text-[#1e1b14]">
                        {selectedSummaryModal.summary.oxygen_level ? `${selectedSummaryModal.summary.oxygen_level}%` : '---'}
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-[#f0ece1]">
                      <span className="text-[#7b776c] block text-[10px]">Temperature</span>
                      <strong className="text-xs text-[#1e1b14]">
                        {selectedSummaryModal.summary.temperature ? `${selectedSummaryModal.summary.temperature}°F` : '---'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Treatment Notes */}
              {selectedSummaryModal.summary?.treatment_notes && (
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#1e1b14] uppercase text-[10px] tracking-wider">
                    Treatment & Care Notes
                  </h4>
                  <p className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-[#4a473d]">
                    {selectedSummaryModal.summary.treatment_notes}
                  </p>
                </div>
              )}

              {/* Documented Nurse Info */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0ece1] text-[11px] text-[#7b776c]">
                <span>Documented by: <strong>{selectedSummaryModal.summary?.nurse_name || 'Nurse Team'}</strong></span>
                {selectedSummaryModal.summary?.recorded_at && (
                  <span>{selectedSummaryModal.summary.recorded_at}</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#fcfaf6] border-t border-[#e9e2d5] flex justify-end">
              <button
                onClick={() => setSelectedSummaryModal(null)}
                className="px-4 py-2 bg-[#645e45] text-white font-bold rounded-xl text-xs hover:bg-[#524d38]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
