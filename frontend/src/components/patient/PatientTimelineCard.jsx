import React from 'react';
import { GitCommit, ArrowRight, UserCheck, ShieldCheck, Video, Pill, Package, FileSpreadsheet, Home } from 'lucide-react';

const iconMap = {
  'user-check': UserCheck,
  'shield-check': ShieldCheck,
  'video': Video,
  'pill': Pill,
  'package': Package,
  'lab': FileSpreadsheet,
  'home': Home,
};

export default function PatientTimelineCard({
  timeline = [],
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
          <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
            Patient Timeline
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('timeline')}
          className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View Full Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal / Flow milestones (4-5 events) */}
      {timeline.length === 0 ? (
        <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium">
          No timeline events recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {timeline.map((evt, idx) => {
            const Icon = iconMap[evt.icon] || GitCommit;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1.5 hover:border-[#e2dec9] transition-all relative"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#7b776c] uppercase">
                    Step {idx + 1}
                  </span>
                </div>

                <h4 className="text-xs font-black text-[#1e1b14] leading-tight">
                  {evt.event}
                </h4>

                <p className="text-[11px] text-[#7b776c] font-medium leading-relaxed line-clamp-2">
                  {evt.description}
                </p>

                <p className="text-[10px] font-bold text-[#645e45] pt-1 border-t border-[#f2ece1]">
                  {evt.date}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
