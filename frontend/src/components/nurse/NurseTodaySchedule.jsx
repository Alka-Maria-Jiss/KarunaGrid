import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Home,
  CalendarDays,
  Sparkles,
  RefreshCw,
  User
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

export default function NurseTodaySchedule({
  schedule = [],
  isLoading: propLoading = false,
  onOpenCompleteModal = () => {},
  onViewAll = () => {},
  onNavigateCalendar = () => {}
}) {
  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [calendarVisits, setCalendarVisits] = useState([]);
  const [isFetchingCalendar, setIsFetchingCalendar] = useState(false);

  // Fetch month/calendar occurrences from backend
  const fetchCalendarVisits = async () => {
    setIsFetchingCalendar(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/home-visits/calendar/?scope=all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarVisits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching calendar visits in NurseTodaySchedule:', err);
    } finally {
      setIsFetchingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendarVisits();
  }, []);

  // Map visits by scheduled date
  const visitsByDate = useMemo(() => {
    const map = {};

    // First index backend calendar occurrences
    calendarVisits.forEach((v) => {
      const dateKey = v.raw_date || v.scheduled_date;
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      // Avoid duplicate occurrences
      if (!map[dateKey].some((item) => item.occurrence_id === v.occurrence_id)) {
        map[dateKey].push(v);
      }
    });

    // Also merge any visits provided in schedule prop for today
    if (Array.isArray(schedule) && schedule.length > 0) {
      if (!map[todayStr]) map[todayStr] = [];
      schedule.forEach((v) => {
        if (!map[todayStr].some((item) => item.occurrence_id === v.occurrence_id)) {
          map[todayStr].push(v);
        }
      });
    }

    return map;
  }, [calendarVisits, schedule, todayStr]);

  // Visits on the currently selected date
  const selectedDateVisits = useMemo(() => {
    return visitsByDate[selectedDate] || [];
  }, [visitsByDate, selectedDate]);

  // Upcoming visits across this and upcoming months
  const upcomingVisitsList = useMemo(() => {
    const all = [];
    Object.keys(visitsByDate).sort().forEach((dateKey) => {
      if (dateKey >= todayStr) {
        visitsByDate[dateKey].forEach((v) => {
          all.push({ ...v, sortDate: dateKey });
        });
      }
    });
    return all.slice(0, 6);
  }, [visitsByDate, todayStr]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const currentY = currentMonthDate.getFullYear();
    const currentM = currentMonthDate.getMonth();
    let totalInMonth = 0;
    let completedInMonth = 0;

    Object.entries(visitsByDate).forEach(([dateKey, items]) => {
      const d = parseYMD(dateKey);
      if (d.getFullYear() === currentY && d.getMonth() === currentM) {
        totalInMonth += items.length;
        completedInMonth += items.filter((v) => v.status === 'Completed').length;
      }
    });

    return {
      total: totalInMonth,
      completed: completedInMonth,
      todayCount: (visitsByDate[todayStr] || []).length,
    };
  }, [visitsByDate, currentMonthDate, todayStr]);

  // Month navigation handlers
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonthDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonthDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleJumpToToday = (e) => {
    e.stopPropagation();
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonthDate(firstOfCurrentMonth);
    setSelectedDate(todayStr);
  };

  // Generate calendar days for currentMonthDate
  const calendarGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based indexing: Sunday=6, Monday=0..Saturday=5
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const days = [];

    // Previous month padding days
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

    // Current month days
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

    // Next month padding days to make full 35 or 42 grid
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

  const handleGoToCalendar = () => {
    if (onNavigateCalendar) {
      onNavigateCalendar('visit_calendar');
    } else if (onViewAll) {
      onViewAll();
    }
  };

  const formattedSelectedDateText = useMemo(() => {
    const d = parseYMD(selectedDate);
    const isToday = selectedDate === todayStr;
    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return {
      title: isToday ? `Today (${dateFormatted})` : dateFormatted,
      isToday
    };
  }, [selectedDate, todayStr]);

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between transition-all">
      <div>
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#f0ece1]">
          <div className="flex items-center space-x-2.5">
            <div
              onClick={handleGoToCalendar}
              className="w-9 h-9 rounded-xl bg-[#f7f5ee] text-[#645e45] flex items-center justify-center cursor-pointer hover:bg-[#eae4d3] transition-colors"
              title="Click to open Visit Calendar"
            >
              <CalendarDays className="w-5 h-5 text-[#645e45]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3
                  onClick={handleGoToCalendar}
                  className="font-extrabold text-sm text-[#1e1b14] tracking-tight cursor-pointer hover:text-[#645e45] transition-colors"
                >
                  MONTHLY CARE SCHEDULE
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                  {monthStats.total} Visits this month
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#7b776c]">
                Interactive palliative calendar • Click date to preview or open full calendar
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1 text-[11px] font-bold text-[#645e45] bg-[#f7f5ee] hover:bg-[#eae4d3] rounded-lg border border-[#e9e2d5] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleGoToCalendar}
              className="px-3 py-1 bg-[#645e45] text-white hover:bg-[#524d38] rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <span>Visit Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Interactive Mini-Calendar (Left) & Side Upcoming Events (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Mini Calendar of the Month */}
          <div className="lg:col-span-6 bg-[#fcfbf8] rounded-xl border border-[#f0ece1] p-3.5 flex flex-col justify-between">
            <div>
              {/* Calendar Month Header with Prev/Next Controls */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-[#f0ece1] text-[#645e45] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span
                    onClick={handleGoToCalendar}
                    className="font-extrabold text-xs text-[#1e1b14] hover:text-[#645e45] cursor-pointer"
                  >
                    {monthYearTitle}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-[#f0ece1] text-[#645e45] transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {WEEKDAY_NAMES.map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[10px] font-bold uppercase py-1 ${
                      idx === 6 ? 'text-amber-800/70' : 'text-[#7b776c]'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day) => {
                  const isSelected = day.dateStr === selectedDate;
                  const hasVisits = day.visits.length > 0;
                  const completedCount = day.visits.filter((v) => v.status === 'Completed').length;
                  const pendingCount = day.visits.length - completedCount;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day.dateStr)}
                      onDoubleClick={handleGoToCalendar}
                      className={`
                        relative h-9 rounded-lg flex flex-col items-center justify-center transition-all text-xs font-semibold
                        ${!day.isCurrentMonth ? 'text-stone-300 hover:text-stone-500' : 'text-[#1e1b14]'}
                        ${day.isSunday ? 'bg-[#fbf7f2]/70' : ''}
                        ${isSelected
                          ? 'bg-[#645e45] text-white font-extrabold shadow-xs'
                          : day.isToday
                          ? 'border-2 border-[#645e45] bg-[#f7f5ee] font-extrabold'
                          : 'hover:bg-[#f2ece1]'
                        }
                      `}
                      title={`${day.dateStr}${hasVisits ? ` (${day.visits.length} visits)` : ''}${day.isSunday ? ' (Sunday)' : ''}`}
                    >
                      <span className="text-[11px] leading-none">{day.dayNum}</span>

                      {/* Event Marker Indicators */}
                      {hasVisits && (
                        <div className="flex items-center space-x-0.5 mt-0.5">
                          {pendingCount > 0 && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-emerald-500'
                              }`}
                            />
                          )}
                          {completedCount > 0 && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-amber-200' : 'bg-purple-500'
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="mt-3 pt-2.5 border-t border-[#f0ece1] flex items-center justify-between text-[10px] text-[#7b776c]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Scheduled</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                  <span>Completed</span>
                </span>
              </div>
              <span className="text-[9px] text-[#7b776c]/80">Sun: Non-working</span>
            </div>
          </div>

          {/* RIGHT: Selected Date Events & Upcoming List */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Selected Date Header */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#f0ece1]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#645e45]" />
                  <span className="font-extrabold text-xs text-[#1e1b14]">
                    {formattedSelectedDateText.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                  {selectedDateVisits.length} {selectedDateVisits.length === 1 ? 'Visit' : 'Visits'}
                </span>
              </div>

              {/* Selected Day Visits */}
              {selectedDateVisits.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedDateVisits.map((visit) => (
                    <div
                      key={visit.occurrence_id || visit.id}
                      className="p-2.5 rounded-xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-2xs transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-xs text-[#1e1b14] truncate">
                            {visit.patient_name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${getPriorityBadge(visit.urgency_level)}`}>
                            {visit.urgency_level || 'Routine'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-[#7b776c] mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#7b776c]" />
                            <span>{visit.time || 'Morning'}</span>
                          </span>
                          {visit.location && (
                            <span className="flex items-center space-x-1 truncate max-w-[110px]">
                              <MapPin className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                              <span className="truncate">{visit.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${getStatusBadge(visit.status)}`}>
                          {visit.status}
                        </span>

                        {visit.status !== 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => onOpenCompleteModal(visit)}
                            className="px-2 py-0.5 bg-[#645e45] text-white text-[10px] font-bold rounded-md hover:bg-[#524d38] transition-colors"
                          >
                            Complete
                          </button>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5]">
                    <Home className="w-5 h-5 text-[#7b776c]/40 mx-auto mb-1" />
                    <p className="text-[11px] font-bold text-[#4a473d]">No visits on {selectedDate}.</p>
                    <p className="text-[10px] text-[#7b776c]">Select another date or check upcoming events below.</p>
                  </div>

                  {/* Show Upcoming Visits List if selected day is empty */}
                  {upcomingVisitsList.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b776c] mb-1.5 px-0.5">
                        Upcoming Palliative Visits:
                      </p>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {upcomingVisitsList.slice(0, 3).map((v) => (
                          <div
                            key={v.occurrence_id || v.id}
                            onClick={() => setSelectedDate(v.sortDate || v.scheduled_date)}
                            className="p-2 rounded-lg border border-[#f0ece1] bg-white hover:border-[#645e45]/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-[#1e1b14] truncate block text-[11px]">
                                {v.patient_name}
                              </span>
                              <span className="text-[10px] text-[#7b776c]">
                                {v.sortDate || v.scheduled_date} • {v.time || 'Visit'}
                              </span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${getStatusBadge(v.status)}`}>
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Side Bottom Action */}
            <div className="mt-3 pt-2.5 border-t border-[#f0ece1] flex items-center justify-between">
              <span className="text-[11px] text-[#7b776c]">
                Today: <strong className="text-[#1e1b14]">{monthStats.todayCount} visits</strong>
              </span>
              <button
                type="button"
                onClick={handleGoToCalendar}
                className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Open in Visit Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
