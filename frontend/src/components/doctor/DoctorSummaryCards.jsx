import React from 'react';
import { Users, Video, Home, AlertCircle, Pill, ArrowRight } from 'lucide-react';

export default function DoctorSummaryCards({
  summary = {},
  onNavigate,
}) {
  const totalPatients = summary.total_patients ?? 0;
  const todayTelemedicine = summary.today_telemedicine ?? 0;
  const upcomingHomeVisits = summary.upcoming_home_visits ?? 0;
  const pendingActions = summary.pending_actions ?? 0;
  const activePrescriptions = summary.active_prescriptions ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* CARD 1: TOTAL PATIENTS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Total Patients
            </span>
            <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{totalPatients}</span>
              <span className="text-xs font-semibold text-[#7b776c]">active</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              Registered palliative patients
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('patients')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
          >
            <span>View Patients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 2: TODAY'S TELEMEDICINE */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Today's Telemedicine
            </span>
            <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45] border border-[#e2dec9]">
              <Video className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{todayTelemedicine}</span>
              <span className="text-xs font-semibold text-[#7b776c]">calls today</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              {todayTelemedicine > 0 ? 'Consultations scheduled' : 'No calls today'}
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('telemedicine')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
          >
            <span>View Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 3: UPCOMING HOME VISITS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Upcoming Home Visits
            </span>
            <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              <Home className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{upcomingHomeVisits}</span>
              <span className="text-xs font-semibold text-[#7b776c]">this week</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              Recurring care visits
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('home_visits')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
          >
            <span>View Home Visits</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 4: PENDING ACTIONS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Pending Actions
            </span>
            <div className="p-2 rounded-xl bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{pendingActions}</span>
              <span className="text-xs font-semibold text-[#7b776c]">requires review</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              Registrations & clinical approvals
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('registration_review')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#ba1a1a] hover:underline cursor-pointer"
          >
            <span>Review Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD 5: ACTIVE PRESCRIPTIONS */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#7b776c] uppercase">
              Active Prescriptions
            </span>
            <div className="p-2 rounded-xl bg-[#f5f1ea] text-[#695e3d] border border-[#e7ded0]">
              <Pill className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1e1b14]">{activePrescriptions}</span>
              <span className="text-xs font-semibold text-[#7b776c]">active regimens</span>
            </div>
            <p className="text-[11px] text-[#7b776c] mt-1 font-medium">
              Issued medicine regimens
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('prescriptions')}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
          >
            <span>View Prescriptions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
