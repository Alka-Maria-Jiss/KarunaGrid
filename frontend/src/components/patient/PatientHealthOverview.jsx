import React from 'react';
import { Activity, Stethoscope, ArrowRight, HeartPulse, Thermometer, Wind } from 'lucide-react';

export default function PatientHealthOverview({
  healthData = {},
  onNavigate,
}) {
  const latestUpdate = healthData.latest_update;
  const healthSummary = healthData.health_summary;

  const hasVitals = healthSummary && (
    healthSummary.blood_pressure ||
    healthSummary.pulse ||
    healthSummary.oxygen_level ||
    healthSummary.temperature
  );

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-5">
      {/* Section Heading */}
      <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
          <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
            My Health Overview
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('medical_history')}
          className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Full History</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN: LATEST MEDICAL UPDATE */}
        <div className="space-y-3 bg-[#fdfbf7] p-5 rounded-2xl border border-[#f0eae0] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#645e45]" />
              <h3 className="text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider">
                Latest Medical Update
              </h3>
            </div>

            {latestUpdate ? (
              <div className="space-y-2 text-xs">
                <p className="text-[#1e1b14] font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#e9e2d5]">
                  "{latestUpdate.summary}"
                </p>
                <div className="text-[11px] text-[#7b776c] space-y-0.5 pt-1 font-semibold">
                  <p>
                    Updated by:{' '}
                    <strong className="text-[#4a473d]">{latestUpdate.doctor_name}</strong>
                  </p>
                  <p>Date: {latestUpdate.date}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-[#e9e2d5] text-xs text-[#7b776c] font-medium">
                No recent medical updates or clinical notes recorded.
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('medical_history')}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
            >
              <span>View Medical History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: HEALTH SUMMARY (VITALS) */}
        <div className="space-y-3 bg-[#fdfbf7] p-5 rounded-2xl border border-[#f0eae0] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#426442]" />
              <h3 className="text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider">
                Health Summary (Recent Vitals)
              </h3>
            </div>

            {hasVitals ? (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {healthSummary.blood_pressure && (
                  <div className="bg-white p-3 rounded-xl border border-[#e9e2d5] space-y-0.5">
                    <span className="text-[10px] font-extrabold text-[#7b776c] uppercase">
                      Blood Pressure
                    </span>
                    <p className="text-sm font-black text-[#1e1b14]">
                      {healthSummary.blood_pressure}
                    </p>
                  </div>
                )}

                {healthSummary.pulse && (
                  <div className="bg-white p-3 rounded-xl border border-[#e9e2d5] space-y-0.5">
                    <span className="text-[10px] font-extrabold text-[#7b776c] uppercase">
                      Pulse Rate
                    </span>
                    <p className="text-sm font-black text-[#1e1b14]">
                      {healthSummary.pulse}
                    </p>
                  </div>
                )}

                {healthSummary.oxygen_level && (
                  <div className="bg-white p-3 rounded-xl border border-[#e9e2d5] space-y-0.5">
                    <span className="text-[10px] font-extrabold text-[#7b776c] uppercase">
                      SpO2 (Oxygen)
                    </span>
                    <p className="text-sm font-black text-[#1e1b14]">
                      {healthSummary.oxygen_level}
                    </p>
                  </div>
                )}

                {healthSummary.temperature && (
                  <div className="bg-white p-3 rounded-xl border border-[#e9e2d5] space-y-0.5">
                    <span className="text-[10px] font-extrabold text-[#7b776c] uppercase">
                      Temperature
                    </span>
                    <p className="text-sm font-black text-[#1e1b14]">
                      {healthSummary.temperature}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-[#e9e2d5] text-xs text-[#7b776c] font-medium">
                No recent health measurements available. Measurements are recorded during home palliative nurse visits.
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('profile')}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
            >
              <span>View Medical Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
