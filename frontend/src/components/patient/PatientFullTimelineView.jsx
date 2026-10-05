import React from 'react';
import { GitCommit, UserCheck, ShieldCheck, Video, Home, Pill, FileSpreadsheet, Boxes, ScrollText, CheckCircle2, Clock } from 'lucide-react';

const iconMap = {
  'Registration': UserCheck,
  'Clinical Verification': ShieldCheck,
  'Telemedicine': Video,
  'Home Visit': Home,
  'Prescription': Pill,
  'Diagnostics': FileSpreadsheet,
  'Medical Equipment': Boxes,
  'Welfare Aid': ScrollText,
};

export default function PatientFullTimelineView({
  timelineEvents = [],
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Complete Patient Care Journey & Timeline
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              {timelineEvents.length} Milestones
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Full chronological audit log of registrations, physician consultations, prescriptions, and home visits
          </p>
        </div>
      </div>

      {/* Timeline Stream */}
      {timelineEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <GitCommit className="w-10 h-10 text-[#645e45] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Timeline Events Recorded
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            Care activities, consultations, and medical milestones will appear here chronologically.
          </p>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e9e2d5] shadow-2xs">
          <div className="relative pl-6 sm:pl-8 border-l-2 border-[#e0d9cc] space-y-8">
            {timelineEvents.map((evt, idx) => {
              const Icon = iconMap[evt.category] || GitCommit;

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Dot / Icon */}
                  <div className="absolute -left-[35px] sm:-left-[43px] top-0 p-1.5 rounded-xl bg-white border-2 border-[#645e45] text-[#645e45] shadow-xs">
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content Box */}
                  <div className="bg-[#fdfbf7] p-4 rounded-2xl border border-[#f0eae0] space-y-1.5 hover:border-[#e0d9cc] transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs sm:text-sm text-[#1e1b14]">
                          {evt.event}
                        </h4>
                        <span className="px-2 py-0.2 text-[9px] font-extrabold rounded-md bg-[#f4ede0] text-[#645e45] uppercase">
                          {evt.category}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#7b776c]">
                        {evt.date}
                      </span>
                    </div>

                    <p className="text-xs text-[#4a473d] leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.status && (
                      <div className="pt-1">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Status: {evt.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
