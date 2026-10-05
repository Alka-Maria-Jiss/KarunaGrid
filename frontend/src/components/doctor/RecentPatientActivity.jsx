import React from 'react';
import { Activity, Pill, FileSpreadsheet, Video, Home, ArrowRight, UserCheck } from 'lucide-react';

export default function RecentPatientActivity({
  activities = [],
  onNavigate,
}) {
  const getActivityIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'prescription':
        return Pill;
      case 'laboratory':
        return FileSpreadsheet;
      case 'telemedicine':
        return Video;
      case 'home visit':
        return Home;
      default:
        return Activity;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Recent Patient Care Activity
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('timeline')}
            className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Activity List */}
        {activities.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium space-y-1">
            <p className="font-bold text-[#1e1b14]">No recent clinical activity.</p>
            <p>New prescriptions, completed visits, and lab updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((act, index) => {
              const Icon = getActivityIcon(act.category);
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc] flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#1e1b14] truncate">
                        {act.patient_name}
                      </h4>
                      <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
                        {act.event}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-[#7b776c] flex-shrink-0">
                    {act.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-[#f2ece1]">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('patients')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>View All Registered Patients</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
