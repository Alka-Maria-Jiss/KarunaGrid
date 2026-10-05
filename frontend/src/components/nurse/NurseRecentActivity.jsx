import React from 'react';
import {
  Activity,
  Calendar,
  User,
  Clock,
  History
} from 'lucide-react';

export default function NurseRecentActivity({
  activity = [],
  isLoading = false
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#f0ece1] text-[#645e45] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">RECENT PATIENT / VISIT ACTIVITY</h3>
            <p className="text-[11px] font-medium text-[#7b776c]">Live clinical activity log</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="py-6 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5] my-2">
            <History className="w-7 h-7 text-[#7b776c]/40 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#4a473d]">No recent activity recorded.</p>
            <p className="text-[11px] text-[#7b776c]">Completed visits and notes will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activity.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[#f0ece1] bg-[#fcfbf8] flex items-start space-x-3"
              >
                <div className="w-2 h-2 rounded-full bg-[#645e45] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#1e1b14] truncate">
                      {item.patient_name}
                    </span>
                    <span className="text-[10px] text-[#7b776c]">
                      {item.date}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4a473d] mt-0.5 leading-snug">
                    {item.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0ece1] text-xs text-[#7b776c] flex items-center justify-between">
        <span>Recent events</span>
        <span className="font-semibold text-[#645e45]">Palliative Care Grid</span>
      </div>
    </div>
  );
}
