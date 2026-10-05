import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Home,
  ArrowRight,
  ExternalLink,
  CalendarDays,
  CheckCircle2,
  AlertCircle
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

export default function DoctorSchedule({
  schedule = [],
  onNavigate = () => {},
}) {
  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Map schedule items by date
  const visitsByDate = useMemo(() => {
    const map = {};
    if (Array.isArray(schedule)) {
      schedule.forEach((item) => {
        const d = item.date || item.scheduled_date || todayStr;
        if (!map[d]) map[d] = [];
        map[d].push(item);
      });
    }
    return map;
  }, [schedule, todayStr]);

  const selectedDateVisits = useMemo(() => {
    return visitsByDate[selectedDate] || [];
  }, [visitsByDate, selectedDate]);

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
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Build calendar grid
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
        items: visitsByDate[dateStr] || [],
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
        items: visitsByDate[dateStr] || [],
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
        items: visitsByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentMonthDate, todayStr, visitsByDate]);

  const monthYearTitle = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#f2ece1]">
          <div className="flex items-center gap-2.5">
            <div
              onClick={() => onNavigate('visit_calendar')}
              className="w-9 h-9 rounded-xl bg-[#f7f5ee] text-[#645e45] flex items-center justify-center cursor-pointer hover:bg-[#eae4d3] transition-colors"
              title="Click to view Clinical Visit Calendar"
            >
              <CalendarDays className="w-5 h-5 text-[#645e45]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3
                  onClick={() => onNavigate('visit_calendar')}
                  className="font-extrabold text-sm text-[#1e1b14] uppercase tracking-wider cursor-pointer hover:text-[#645e45] transition-colors"
                >
                  Clinical Schedule
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                  {schedule.length} Events
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#7b776c]">
                Monthly schedule & telemedicine consultations
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
              type="button"
              onClick={() => onNavigate('visit_calendar')}
              className="px-3 py-1 bg-[#645e45] text-white hover:bg-[#524d38] rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>Visit Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Interactive Mini-Calendar (Left) & Side Events List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Mini Month Calendar */}
          <div className="lg:col-span-6 bg-[#fcfbf8] rounded-xl border border-[#f0ece1] p-3.5 flex flex-col justify-between">
            <div>
              {/* Controls */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-[#f0ece1] text-[#645e45] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span
                  onClick={() => onNavigate('visit_calendar')}
                  className="font-extrabold text-xs text-[#1e1b14] hover:text-[#645e45] cursor-pointer"
                >
                  {monthYearTitle}
                </span>
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

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day) => {
                  const isSelected = day.dateStr === selectedDate;
                  const hasEvents = day.items.length > 0;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day.dateStr)}
                      onDoubleClick={() => onNavigate('home_visits')}
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
                      title={`${day.dateStr}${hasEvents ? ` (${day.items.length} events)` : ''}`}
                    >
                      <span className="text-[11px] leading-none">{day.dayNum}</span>
                      {hasEvents && (
                        <div className="flex items-center space-x-0.5 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 pt-2.5 border-t border-[#f0ece1] flex items-center justify-between text-[10px] text-[#7b776c]">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Clinical Event</span>
              </span>
              <span className="text-[9px] text-[#7b776c]/80">Sun: Rest Day</span>
            </div>
          </div>

          {/* RIGHT: Side Upcoming & Selected Date Events */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#f0ece1]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#645e45]" />
                  <span className="font-extrabold text-xs text-[#1e1b14]">
                    {formattedSelectedDateText.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f7f5ee] text-[#645e45] border border-[#e9e2d5]">
                  {selectedDateVisits.length} Events
                </span>
              </div>

              {selectedDateVisits.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedDateVisits.map((item) => {
                    const isTelemed = item.type?.toLowerCase().includes('telemedicine');
                    const Icon = isTelemed ? Video : Home;

                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-2 hover:border-[#e2dec9] transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-lg border flex-shrink-0 ${
                              isTelemed
                                ? 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]'
                                : 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#1e1b14] truncate">
                              {item.patient_name}
                            </h4>
                            <p className="text-[10px] text-[#7b776c] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-[#645e45]" />
                              <span>{item.time}</span>
                              <span>•</span>
                              <span>{item.type}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.meeting_link && (
                            <a
                              href={item.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                            >
                              Join
                            </a>
                          )}
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {item.status || 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5]">
                    <Clock className="w-5 h-5 text-[#7b776c]/40 mx-auto mb-1" />
                    <p className="text-[11px] font-bold text-[#4a473d]">No clinical activities on {selectedDate}.</p>
                    <p className="text-[10px] text-[#7b776c]">Click any marked date or view schedule.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Link */}
            <div className="mt-3 pt-2.5 border-t border-[#f0ece1] flex items-center justify-between">
              <span className="text-[11px] text-[#7b776c]">
                Total: <strong className="text-[#1e1b14]">{schedule.length} scheduled</strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('visit_calendar')}
                className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Full Visit Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
