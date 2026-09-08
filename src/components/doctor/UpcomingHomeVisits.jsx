import React from 'react';
import { Home, Calendar, Clock, ArrowRight, User } from 'lucide-react';

export default function UpcomingHomeVisits({
  visits = [],
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#426442]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Upcoming Home Visits
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('home_visits')}
            className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visits List */}
        {visits.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium space-y-1">
            <p className="font-bold text-[#1e1b14]">No upcoming home visits scheduled this week.</p>
            <p>Assigned recurring visits and community nurse schedules will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visits.map((v) => (
              <div
                key={v.occurrence_id}
                className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-3 hover:border-[#e2dec9] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0] flex-shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-[#1e1b14] truncate">
                        {v.patient_name}
                      </h4>
                      <span className="text-[10px] font-bold text-[#7b776c]">
                        ({v.patient_reg_id})
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7b776c] font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#645e45]" />
                      <span>{v.scheduled_date}</span>
                      <span>•</span>
                      <span>{v.visit_type} ({v.urgency_level})</span>
                    </p>
                    <p className="text-[10px] text-[#4a473d] font-semibold mt-0.5">
                      Nurse: {v.nurse_name}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex-shrink-0 ${
                    v.status === 'Scheduled' || v.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-[#f2ece1]">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('home_visits')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>View All Home Visit Schedules</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
