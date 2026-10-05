import React from 'react';
import {
  UserCheck,
  CheckCircle2,
  UploadCloud,
  UserPlus,
  FileText
} from 'lucide-react';

export default function NurseQuickActions({
  onActionClick = () => {}
}) {
  const actions = [
    {
      id: 'recurring_schedules',
      title: 'Recurring Schedules',
      desc: 'Create and manage care plans',
      icon: UserCheck,
      bgColor: 'bg-[#f7f5ee]',
      textColor: 'text-[#645e45]',
      targetTab: 'home_visits_schedules',
    },
    {
      id: 'home_visits',
      title: 'Daily Home Visits',
      desc: 'View & complete scheduled visits',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-800',
      targetTab: 'home_visits_all',
    },
    {
      id: 'upload_summary',
      title: 'Upload Visit Summary',
      desc: 'Attach documented clinical summary',
      icon: UploadCloud,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      targetTab: 'home_visits_all',
    },
    {
      id: 'assign_caregiver',
      title: 'Assign Caregiver',
      desc: 'Connect patient with verified caregiver',
      icon: UserPlus,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      targetTab: 'caregivers',
    },
    {
      id: 'view_records',
      title: 'View Patient Records',
      desc: 'Access authorized clinical histories',
      icon: FileText,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-800',
      targetTab: 'patients',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-sm text-[#1e1b14] tracking-tight">QUICK ACTIONS</h3>
          <p className="text-[11px] font-medium text-[#7b776c]">Essential daily clinical nursing tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => onActionClick(act.targetTab, act.id)}
              className="p-3.5 rounded-xl border border-[#f0ece1] bg-[#fdfcf9] hover:bg-white hover:border-[#645e45]/40 hover:shadow-xs text-left transition-all group flex flex-col justify-between"
            >
              <div className={`w-9 h-9 rounded-xl ${act.bgColor} ${act.textColor} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-[#1e1b14] group-hover:text-[#645e45] transition-colors leading-tight">
                  {act.title}
                </p>
                <p className="text-[10px] text-[#7b776c] mt-1 leading-snug">
                  {act.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
