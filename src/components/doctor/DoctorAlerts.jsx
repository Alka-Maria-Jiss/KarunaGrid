import React from 'react';
import { AlertCircle, UserCheck, Boxes, FileSpreadsheet, ArrowRight, Bell } from 'lucide-react';

export default function DoctorAlerts({
  alerts = [],
  onNavigate,
}) {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'registration':
        return UserCheck;
      case 'equipment':
        return Boxes;
      case 'lab_report':
        return FileSpreadsheet;
      default:
        return Bell;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Alerts & Clinical Reminders
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#ba1a1a]">
            {alerts.length} action items
          </span>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium space-y-1">
            <p className="font-bold text-[#1e1b14]">No urgent clinical alerts.</p>
            <p>Registrations, lab investigations, and equipment reviews will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-[#faf0ec] border border-[#ebd4cc] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-white text-[#ba1a1a] border border-[#ebd4cc] flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1e1b14] leading-snug">
                      {alert.message}
                    </p>
                  </div>

                  {alert.action_view && (
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate(alert.action_view)}
                      className="px-3 py-1.5 text-xs font-extrabold text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-xl shadow-2xs transition-all cursor-pointer flex-shrink-0"
                    >
                      Review
                    </button>
                  )}
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
          onClick={() => onNavigate && onNavigate('notifications')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>View All Notifications</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
