import React from 'react';
import { Calendar, Video, Home, ArrowRight, Clock, User, ExternalLink } from 'lucide-react';

export default function DoctorSchedule({
  schedule = [],
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Today's Clinical Schedule
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('telemedicine')}
            className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Schedule List */}
        {schedule.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium space-y-1">
            <p className="font-bold text-[#1e1b14]">No clinical activities scheduled for today.</p>
            <p>Today's telemedicine consultations and home visits will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {schedule.map((item) => {
              const isTelemed = item.type?.toLowerCase().includes('telemedicine');
              const Icon = isTelemed ? Video : Home;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-3 hover:border-[#e2dec9] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isTelemed
                          ? 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]'
                          : 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-[#1e1b14] truncate">
                          {item.patient_name}
                        </h4>
                        <span className="text-[10px] font-bold text-[#7b776c]">
                          ({item.patient_reg_id})
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7b776c] font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#645e45]" />
                        <span>{item.time}</span>
                        <span>•</span>
                        <span>{item.type}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.meeting_link && (
                      <a
                        href={item.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                      >
                        Join Call
                      </a>
                    )}
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                        item.status === 'Scheduled' || item.status === 'Accepted' || item.status === 'Confirmed'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
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
          onClick={() => onNavigate && onNavigate('telemedicine')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>View Full Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
