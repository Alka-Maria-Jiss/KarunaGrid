import React from 'react';
import {
  History,
  UserCheck,
  Stethoscope,
  Activity,
  HeartHandshake,
  FileCheck2,
  Boxes,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

const iconMap = {
  caregiver_registration: { icon: HeartHandshake, bg: 'bg-[#faf0ec] text-[#9c4c37] border-[#ebd4cc]' },
  caregiver_approved: { icon: UserCheck, bg: 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]' },
  doctor_created: { icon: Stethoscope, bg: 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]' },
  nurse_created: { icon: Activity, bg: 'bg-[#f5f1ea] text-[#695e3d] border-[#e7ded0]' },
  welfare_application: { icon: FileCheck2, bg: 'bg-[#f8f3eb] text-[#7a6449] border-[#e8dccb]' },
  equipment_allocated: { icon: Boxes, bg: 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]' },
  user_status_changed: { icon: ShieldAlert, bg: 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]' },
};

export default function AdminActivityFeed({ activities = [], onNavigate }) {
  const displayActivities =
    activities && activities.length > 0
      ? activities.slice(0, 7)
      : [
          {
            id: 'act-1',
            type: 'caregiver_approved',
            title: 'Caregiver Verified & Approved',
            description: 'Ashna Augustine identity documents verified for home palliative support.',
            timestamp: 'Today, 10:30 AM',
            badge: 'Approved',
          },
          {
            id: 'act-2',
            type: 'doctor_created',
            title: 'Doctor Account Onboarded',
            description: 'Dr. Sarah Jenkins pre-approved for Palliative Oncology ward.',
            timestamp: 'Today, 09:15 AM',
            badge: 'Pre-Approved',
          },
          {
            id: 'act-3',
            type: 'welfare_application',
            title: 'Welfare Application Submitted',
            description: 'Rosamma Francis submitted application for Karunya Benevolent Fund.',
            timestamp: 'Yesterday, 04:45 PM',
            badge: 'Under Review',
          },
          {
            id: 'act-4',
            type: 'equipment_allocated',
            title: 'Equipment Unit Allocated',
            description: 'Oxygen Concentrator (KG-OXC-102) assigned to home care palliative patient.',
            timestamp: 'Yesterday, 02:20 PM',
            badge: 'Allocated',
          },
        ];

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[#1e1b14]">
              Recent System Activities
            </h3>
            <span className="p-1 rounded-lg bg-[#f4ede0] text-[#645e45]">
              <History className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#7b776c]">Live Audit Feed</span>
        </div>

        {/* Activity List */}
        <div className="divide-y divide-[#f2ece1] mt-1">
          {displayActivities.map((act) => {
            const config = iconMap[act.type] || {
              icon: History,
              bg: 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]',
            };
            const Icon = config.icon;

            return (
              <div
                key={act.id}
                className="py-3 flex items-start gap-3 hover:bg-[#fdfbf7] rounded-xl px-1.5 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${config.bg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-xs text-[#1e1b14] truncate">
                      {act.title}
                    </p>
                    <span className="text-[10px] font-bold text-[#8c877b] flex-shrink-0">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4a473d] line-clamp-2 mt-0.5 font-medium">
                    {act.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer link */}
      <div className="pt-3 mt-3 border-t border-[#f2ece1] flex justify-end">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('activity_logs')}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>View All Activities</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
