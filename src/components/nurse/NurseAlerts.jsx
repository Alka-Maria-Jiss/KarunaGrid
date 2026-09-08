import React from 'react';
import {
  BellRing,
  AlertCircle,
  CalendarPlus,
  Home,
  FileSpreadsheet,
  UploadCloud,
  ArrowRight,
  CheckCheck
} from 'lucide-react';

export default function NurseAlerts({
  alerts = [],
  isLoading = false,
  onNavigateTab = () => {}
}) {
  const getIcon = (type) => {
    switch (type) {
      case 'request':
        return <CalendarPlus className="w-4 h-4 text-amber-700" />;
      case 'visit':
        return <Home className="w-4 h-4 text-[#645e45]" />;
      case 'lab_report':
        return <FileSpreadsheet className="w-4 h-4 text-indigo-700" />;
      case 'summary':
        return <UploadCloud className="w-4 h-4 text-blue-700" />;
      default:
        return <AlertCircle className="w-4 h-4 text-rose-700" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#fff1f2] text-rose-800 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">ALERTS & REMINDERS</h3>
            <p className="text-[11px] font-medium text-[#7b776c]">Clinical priorities requiring attention</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 text-center bg-[#faf8f4] rounded-xl border border-dashed border-[#e9e2d5] my-2">
            <CheckCheck className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#4a473d]">All caught up!</p>
            <p className="text-[11px] text-[#7b776c]">No active alerts or reminders pending.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl border border-[#f0ece1] bg-[#fdfcf9] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center flex-shrink-0">
                    {getIcon(a.type)}
                  </div>
                  <p className="text-xs font-bold text-[#1e1b14] leading-tight line-clamp-2">
                    {a.message}
                  </p>
                </div>

                {a.action_view && (
                  <button
                    onClick={() => onNavigateTab(a.action_view)}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#645e45] bg-[#f3ede2] hover:bg-[#645e45] hover:text-white rounded-lg transition-all flex items-center space-x-1 flex-shrink-0"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0ece1] text-xs text-[#7b776c] flex items-center justify-between">
        <span>Active reminders: {alerts.length}</span>
        <span className="text-[11px] text-[#7b776c]">Updated in real-time</span>
      </div>
    </div>
  );
}
