import React from 'react';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Home
} from 'lucide-react';

export default function NurseAllocatedVisits({
  visits = [],
  isLoading = false,
  onOpenCompleteModal = () => {},
  onViewAll = () => {}
}) {
  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f7f3] text-emerald-800 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">UPCOMING TEAM VISITS</h3>
              <p className="text-[11px] font-medium text-[#7b776c]">Upcoming palliative field visits for the team</p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="py-8 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5] my-2">
            <Inbox className="w-8 h-8 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No upcoming visits scheduled.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">Visits will appear here as schedules are generated.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visits.slice(0, 3).map((v) => (
              <div
                key={v.occurrence_id}
                className="p-3.5 rounded-xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-[#1e1b14] truncate">
                      {v.patient_name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full border ${getPriorityBadge(v.priority)}`}>
                      {v.priority || 'Routine'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-[#7b776c] mt-1">
                    <span className="flex items-center space-x-1 font-semibold text-[#4a473d]">
                      <Calendar className="w-3 h-3 text-[#645e45]" />
                      <span>{v.scheduled_date}</span>
                    </span>
                    <span>•</span>
                    <span className="capitalize">{v.visit_type} Visit</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenCompleteModal(v)}
                  className="px-3 py-1.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1 flex-shrink-0 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs text-[#7b776c]">
        <span>Upcoming team visits: {visits.length}</span>
        <button onClick={onViewAll} className="font-semibold hover:text-[#1e1b14]">
          View Full List →
        </button>
      </div>
    </div>
  );
}
