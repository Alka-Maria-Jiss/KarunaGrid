import React from 'react';
import { Home, Video, Bell, Pill, HeartHandshake, ArrowRight, CheckCircle2, Calendar, Clock } from 'lucide-react';

export default function PatientSummaryCards({
  summary = {},
  onNavigate,
  onJoinTelemed,
}) {
  const nextVisit = summary.next_home_visit;
  const nextTelemed = summary.next_telemedicine;
  const unreadCount = summary.unread_notifications_count ?? 0;
  const activeRxCount = summary.active_prescriptions_count ?? 0;
  const caregiver = summary.assigned_caregiver;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* CARD 1: NEXT HOME VISIT */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Next Home Visit
            </span>
            <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              <Home className="w-4 h-4" />
            </div>
          </div>

          {nextVisit ? (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-black text-[#1e1b14]">{nextVisit.date}</p>
              <p className="text-xs text-[#7b776c] flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                <span>{nextVisit.time}</span>
              </p>
              <p className="text-[11px] text-[#4a473d] truncate font-semibold">
                {nextVisit.nurse_name}
              </p>
            </div>
          ) : (
            <div className="mt-1 py-1 text-xs text-[#7b776c] font-medium">
              No upcoming home visit
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('home_visits')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline transition-all cursor-pointer"
          >
            <span>{nextVisit ? 'View Details' : 'Request Visit'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 2: NEXT TELEMEDICINE */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Next Telemedicine
            </span>
            <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45] border border-[#e2dec9]">
              <Video className="w-4 h-4" />
            </div>
          </div>

          {nextTelemed ? (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-black text-[#1e1b14]">{nextTelemed.date}</p>
              <p className="text-xs text-[#7b776c] flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                <span>{nextTelemed.time}</span>
              </p>
              <p className="text-[11px] text-[#4a473d] truncate font-semibold">
                {nextTelemed.doctor_name}
              </p>
            </div>
          ) : (
            <div className="mt-1 py-1 text-xs text-[#7b776c] font-medium">
              No telemedicine scheduled
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          {nextTelemed && nextTelemed.can_join ? (
            <a
              href={nextTelemed.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-all"
            >
              <span>Join Consultation →</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('telemedicine')}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline transition-all cursor-pointer"
            >
              <span>{nextTelemed ? 'View Details' : 'Book Consultation'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* CARD 3: UNREAD NOTIFICATIONS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Notifications
            </span>
            <div className="p-2 rounded-xl bg-[#faf0ec] text-[#9c4c37] border border-[#ebd4cc]">
              <Bell className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{unreadCount}</span>
              <span className="text-xs font-semibold text-[#7b776c]">unread alerts</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              {unreadCount > 0 ? 'Care updates available' : 'All caught up'}
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('notifications')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline transition-all cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 4: ACTIVE PRESCRIPTIONS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Prescriptions
            </span>
            <div className="p-2 rounded-xl bg-[#f5f1ea] text-[#695e3d] border border-[#e7ded0]">
              <Pill className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{activeRxCount}</span>
              <span className="text-xs font-semibold text-[#7b776c]">active meds</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              {activeRxCount > 0 ? 'Current active regimen' : 'No active prescriptions'}
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('prescriptions')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline transition-all cursor-pointer"
          >
            <span>View Prescriptions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 5: MY CAREGIVER */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              My Caregiver
            </span>
            <div className="p-2 rounded-xl bg-[#f8f3eb] text-[#7a6449] border border-[#e8dccb]">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>

          {caregiver ? (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-black text-[#1e1b14] truncate">{caregiver.name}</p>
              <p className="text-xs text-[#7b776c] font-medium">{caregiver.phone}</p>
              <p className="text-[11px] text-[#4a473d] truncate font-semibold">
                {caregiver.qualifications || 'Assigned Caregiver'}
              </p>
            </div>
          ) : (
            <div className="mt-1 py-1 text-xs text-[#7b776c] font-medium">
              No caregiver assigned
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('caregiver')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline transition-all cursor-pointer"
          >
            <span>{caregiver ? 'View Profile' : 'Care Details'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
