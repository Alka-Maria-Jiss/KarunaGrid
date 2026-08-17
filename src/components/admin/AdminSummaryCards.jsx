import React from 'react';
import { Users, Stethoscope, Activity, HeartHandshake, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminSummaryCards({ stats = {}, onNavigate }) {
  const cards = [
    {
      id: 'patients',
      label: 'Total Patients',
      value: stats.total_patients ?? 0,
      icon: Users,
      iconBg: 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]',
      cardBg: 'bg-white',
      viewTarget: 'patients',
      description: 'Registered in network',
    },
    {
      id: 'doctors',
      label: 'Total Doctors',
      value: stats.total_doctors ?? 0,
      icon: Stethoscope,
      iconBg: 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]',
      cardBg: 'bg-white',
      viewTarget: 'doctors',
      description: 'Palliative physicians',
    },
    {
      id: 'nurses',
      label: 'Total Nurses',
      value: stats.total_nurses ?? 0,
      icon: Activity,
      iconBg: 'bg-[#f5f1ea] text-[#695e3d] border-[#e7ded0]',
      cardBg: 'bg-white',
      viewTarget: 'nurses',
      description: 'Home palliative nurses',
    },
    {
      id: 'caregivers',
      label: 'Total Caregivers',
      value: stats.total_caregivers ?? 0,
      icon: HeartHandshake,
      iconBg: 'bg-[#f8f3eb] text-[#7a6449] border-[#e8dccb]',
      cardBg: 'bg-white',
      viewTarget: 'caregivers',
      description: 'Community & family',
    },
    {
      id: 'pending_actions',
      label: 'Pending Admin Actions',
      value: stats.pending_admin_actions ?? 0,
      icon: AlertCircle,
      iconBg: 'bg-[#faf0ec] text-[#9c4c37] border-[#ebd4cc]',
      cardBg: 'bg-white',
      viewTarget: 'caregiver_verification',
      description: 'Verifications & welfare',
      isHighlight: (stats.pending_admin_actions ?? 0) > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`rounded-2xl border border-[#e9e2d5] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group ${card.cardBg}`}
          >
            {/* Header: Label & Icon */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  {card.label}
                </span>
                <div
                  className={`p-2 rounded-xl border ${card.iconBg} transition-transform duration-150 group-hover:scale-105`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Large Bold Number */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#1e1b14] tracking-tight">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
                {card.description}
              </p>
            </div>

            {/* Bottom: View All Action Link */}
            <div className="pt-3 mt-3 border-t border-[#f2ece1]">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate(card.viewTarget)}
                className="w-full inline-flex items-center justify-between text-xs font-bold text-[#645e45] hover:text-[#4c472f] transition-colors cursor-pointer group/link"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/link:translate-x-1" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
