import React from 'react';
import {
  CalendarPlus,
  Clock,
  ArrowRight,
  AlertTriangle,
  FileQuestion
} from 'lucide-react';

export default function NurseAdditionalVisitRequests({
  requests = [],
  isLoading = false,
  onReviewRequest = () => {},
  onViewAll = () => {}
}) {
  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-300 font-black';
      case 'urgent':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200 font-medium';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#fff7ed] text-amber-800 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">ADDITIONAL VISIT REQUESTS</h3>
              <p className="text-[11px] font-medium text-[#7b776c]">One-time visit requests requiring Nurse review</p>
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
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5] my-2">
            <FileQuestion className="w-8 h-8 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No additional visit requests require your attention.</p>
            <p className="text-[11px] text-[#7b776c] mt-0.5">All patient visit requests are up to date.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.slice(0, 4).map((req) => (
              <div
                key={req.occurrence_id}
                className="p-3.5 rounded-xl border border-[#f0ece1] bg-[#fffdfa] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs text-[#1e1b14] truncate">
                      {req.patient_name}
                    </span>
                    <span className="text-[10px] text-[#7b776c]">
                      (#{req.patient_reg_id})
                    </span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full border ${getPriorityBadge(req.priority)}`}>
                      {req.priority || 'Routine'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#4a473d] truncate mt-1">
                    <span className="font-semibold">Reason: </span>
                    {req.reason}
                  </p>

                  <div className="flex items-center space-x-3 text-[10px] text-[#7b776c] mt-0.5">
                    <span>Requested for: <strong className="text-[#1e1b14]">{req.requested_date}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onReviewRequest(req)}
                  className="px-3 py-1.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1 flex-shrink-0 shadow-xs"
                >
                  <span>Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs text-[#7b776c]">
        <span>Pending review: {requests.length}</span>
        <span className="text-[11px] text-[#645e45] font-semibold">Nurse Action Required</span>
      </div>
    </div>
  );
}
