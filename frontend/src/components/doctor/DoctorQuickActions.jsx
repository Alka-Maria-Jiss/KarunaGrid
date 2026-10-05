import React from 'react';
import { Pill, FileSpreadsheet, Home, Video, Users, ArrowRight } from 'lucide-react';

export default function DoctorQuickActions({
  onNavigate,
}) {
  const actions = [
    {
      id: 'prescriptions',
      title: 'Create Prescription',
      desc: 'Issue or update medication regimen',
      icon: Pill,
      bg: 'bg-[#f5f1ea]',
      color: 'text-[#695e3d]',
      border: 'border-[#e7ded0]',
    },
    {
      id: 'lab_reports',
      title: 'Review Laboratory Report',
      desc: 'Evaluate diagnostic lab findings',
      icon: FileSpreadsheet,
      bg: 'bg-[#edf3ec]',
      color: 'text-[#426442]',
      border: 'border-[#d2e2d0]',
    },
    {
      id: 'home_visits',
      title: 'Home Visits Overview',
      desc: 'Inspect team visits and clinical vitals',
      icon: Home,
      bg: 'bg-[#f4f2e9]',
      color: 'text-[#645e45]',
      border: 'border-[#e2dec9]',
    },
    {
      id: 'telemedicine',
      title: 'Manage Telemedicine',
      desc: 'Conduct video consultations & notes',
      icon: Video,
      bg: 'bg-[#faf0ec]',
      color: 'text-[#ba1a1a]',
      border: 'border-[#ebd4cc]',
    },
    {
      id: 'patients',
      title: 'View Patient Records',
      desc: 'Clinical profiles & care history',
      icon: Users,
      bg: 'bg-[#fdfbf7]',
      color: 'text-[#4a473d]',
      border: 'border-[#e9e2d5]',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
          <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
            Clinical Quick Actions
          </h2>
        </div>
        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45]">
          Phase 1 Care
        </span>
      </div>

      {/* Grid of Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onNavigate && onNavigate(act.id)}
              className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] hover:border-[#645e45] hover:bg-[#fffdf9] transition-all text-left group flex items-start justify-between gap-3 cursor-pointer shadow-2xs"
            >
              <div className="space-y-1.5 min-w-0">
                <div className={`p-2 rounded-xl border w-fit ${act.bg} ${act.color} ${act.border}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-xs text-[#1e1b14] group-hover:text-[#645e45] transition-colors leading-tight">
                  {act.title}
                </h4>
                <p className="text-[11px] text-[#7b776c] font-medium leading-relaxed line-clamp-2">
                  {act.desc}
                </p>
              </div>

              <div className="p-1 rounded-lg text-[#7b776c] group-hover:text-[#645e45] group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
