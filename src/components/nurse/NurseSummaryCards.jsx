import React from 'react';
import {
  Home,
  CalendarPlus,
  UserCheck,
  FileSpreadsheet,
  Bell,
  ArrowRight
} from 'lucide-react';

export default function NurseSummaryCards({
  metrics = {},
  isLoading = false,
  onNavigateTab = () => {}
}) {
  const cards = [
    {
      id: 'todays_visits',
      title: "TODAY'S VISITS",
      value: metrics.todays_visits ?? 0,
      subtext: 'Scheduled for today',
      icon: Home,
      targetTab: 'home_visits',
      bgColor: 'bg-[#f7f5ee]',
      iconColor: 'text-[#645e45]',
    },
    {
      id: 'pending_requests',
      title: 'PENDING VISIT REQUESTS',
      value: metrics.pending_requests ?? 0,
      subtext: 'Require nurse review',
      icon: CalendarPlus,
      targetTab: 'additional_requests',
      bgColor: 'bg-[#fff7ed]',
      iconColor: 'text-amber-700',
    },
    {
      id: 'my_allocated_visits',
      title: 'MY ALLOCATED VISITS',
      value: metrics.my_allocated_visits ?? 0,
      subtext: 'Allocated to your schedule',
      icon: UserCheck,
      targetTab: 'home_visits',
      bgColor: 'bg-[#f0f7f3]',
      iconColor: 'text-emerald-700',
    },
    {
      id: 'reports_to_review',
      title: 'REPORTS TO REVIEW',
      value: metrics.reports_to_review ?? 0,
      subtext: 'Laboratory reports pending',
      icon: FileSpreadsheet,
      targetTab: 'lab_reports',
      bgColor: 'bg-[#f5f3ff]',
      iconColor: 'text-indigo-700',
    },
    {
      id: 'unread_notifications',
      title: 'UNREAD NOTIFICATIONS',
      value: metrics.unread_notifications ?? 0,
      subtext: 'Clinical alerts & updates',
      icon: Bell,
      targetTab: 'notifications',
      bgColor: 'bg-[#fff1f2]',
      iconColor: 'text-rose-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onNavigateTab(card.targetTab)}
            className="group bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:shadow-md hover:border-[#645e45]/40 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold text-[#7b776c] tracking-wider uppercase">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-xl ${card.bgColor} ${card.iconColor} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="text-3xl font-black text-[#1e1b14] tracking-tight">
                {isLoading ? (
                  <div className="h-8 w-12 bg-stone-200 animate-pulse rounded-md my-1" />
                ) : (
                  card.value
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-[#7b776c] truncate">
                {card.subtext}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#7b776c] group-hover:text-[#645e45] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
