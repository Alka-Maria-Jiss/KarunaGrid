import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Home
} from 'lucide-react';

export default function NurseTodaySchedule({
  schedule = [],
  isLoading = false,
  onOpenCompleteModal = () => {},
  onOpenSelfAllocateModal = () => {},
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

  const getStatusBadge = (status, isAllocatedToMe) => {
    if (isAllocatedToMe) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (status === 'Available') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (status === 'Completed') {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f7f5ee] text-[#645e45] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">TODAY'S SCHEDULE</h3>
              <p className="text-[11px] font-medium text-[#7b776c]">Palliative field care visits for today</p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1"
          >
            <span>Full Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div className="py-8 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5] my-2">
            <Home className="w-8 h-8 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No visits scheduled for today.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">Check available visits in the allocations queue.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {schedule.slice(0, 4).map((visit) => (
              <div
                key={visit.occurrence_id}
                className="p-3.5 rounded-xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f0ece1] text-[#645e45] flex flex-col items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-[#1e1b14] truncate">
                        {visit.patient_name}
                      </span>
                      <span className="text-[10px] text-[#7b776c] font-medium">
                        (#{visit.patient_reg_id})
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-[#7b776c] mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[#7b776c]" />
                        <span>{visit.time}</span>
                      </span>
                      <span className="flex items-center space-x-1 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                        <span className="truncate">{visit.location}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getPriorityBadge(visit.urgency_level)}`}>
                    {visit.urgency_level || 'Routine'}
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(visit.status, visit.is_allocated_to_me)}`}>
                    {visit.status}
                  </span>

                  {visit.is_allocated_to_me && visit.status !== 'Completed' ? (
                    <button
                      onClick={() => onOpenCompleteModal(visit)}
                      className="px-2.5 py-1 bg-[#645e45] text-white text-[11px] font-bold rounded-lg hover:bg-[#524d38] transition-colors"
                    >
                      Complete
                    </button>
                  ) : !visit.allocated_nurse && (
                    <button
                      onClick={() => onOpenSelfAllocateModal(visit)}
                      className="px-2.5 py-1 bg-[#f3ede2] text-[#645e45] text-[11px] font-bold rounded-lg hover:bg-[#645e45] hover:text-white transition-colors"
                    >
                      Allocate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs text-[#7b776c]">
        <span>Total for today: {schedule.length}</span>
        <button onClick={onViewAll} className="font-semibold hover:text-[#1e1b14]">
          View Full List →
        </button>
      </div>
    </div>
  );
}
