import React from 'react';
import { FileText, Stethoscope, AlertTriangle, Activity, Calendar, ShieldCheck, HeartPulse, User } from 'lucide-react';

export default function PatientMedicalHistoryView({
  history = {},
}) {
  const diagnoses = history.diagnoses || [];
  const allergies = history.allergies || [];
  const conditions = history.chronic_conditions || [];
  const consultationNotes = history.consultation_notes || [];
  const visitSummaries = history.visit_summaries || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              My Medical History & Clinical Summaries
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
              Verified Records
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Complete clinical profile, medical officer diagnoses, allergies, and home visit observations
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fdfbf7] border border-[#e0d9cc] text-xs font-bold text-[#645e45]">
          <ShieldCheck className="w-4 h-4" />
          <span>Managed by Doctor & Nurse Team</span>
        </div>
      </div>

      {/* DIAGNOSES & CONDITIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnoses */}
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
            <div className="p-1.5 rounded-lg bg-[#f4ede0] text-[#645e45]">
              <Stethoscope className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">
              Primary Diagnoses ({diagnoses.length})
            </h3>
          </div>

          {diagnoses.length === 0 ? (
            <p className="text-xs text-[#7b776c] font-medium py-2">
              No formal diagnoses recorded in system yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {diagnoses.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                  <p className="text-xs font-black text-[#1e1b14]">{d.text}</p>
                  <p className="text-[11px] text-[#7b776c] font-medium">
                    Diagnosed by {d.doctor} • {d.date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chronic Conditions & Allergies */}
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
            <div className="p-1.5 rounded-lg bg-[#faf0ec] text-[#9c4c37]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">
              Allergies & Chronic Conditions
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-extrabold text-[#7b776c] uppercase text-[10px] mb-2">
                Known Allergies
              </h4>
              {allergies.length === 0 ? (
                <p className="text-[#7b776c] font-medium">No allergies reported.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <span
                      key={a.id}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-bold"
                    >
                      {a.name} ({a.severity})
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#f2ece1]">
              <h4 className="font-extrabold text-[#7b776c] uppercase text-[10px] mb-2">
                Chronic Conditions
              </h4>
              {conditions.length === 0 ? (
                <p className="text-[#7b776c] font-medium">No additional chronic conditions logged.</p>
              ) : (
                <div className="space-y-1.5">
                  {conditions.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-[#fdfbf7] border border-[#f0eae0]">
                      <p className="font-bold text-[#1e1b14]">{c.name}</p>
                      {c.notes && <p className="text-[11px] text-[#7b776c]">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONSULTATION CLINICAL NOTES */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
          <div className="p-1.5 rounded-lg bg-[#f4f2e9] text-[#645e45]">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-[#1e1b14]">
            Physician Consultation Notes & Observations ({consultationNotes.length})
          </h3>
        </div>

        {consultationNotes.length === 0 ? (
          <p className="text-xs text-[#7b776c] font-medium py-4 text-center">
            No physician consultation notes logged yet.
          </p>
        ) : (
          <div className="space-y-3">
            {consultationNotes.map((cn) => (
              <div key={cn.id} className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#ece5d8]">
                  <p className="font-black text-[#1e1b14]">Dr. {cn.doctor}</p>
                  <span className="text-[11px] font-bold text-[#7b776c]">{cn.date}</span>
                </div>
                {cn.symptoms && (
                  <p><strong>Symptoms Discussed:</strong> <span className="text-[#4a473d]">{cn.symptoms}</span></p>
                )}
                {cn.observations && (
                  <p><strong>Clinical Observations:</strong> <span className="text-[#4a473d]">{cn.observations}</span></p>
                )}
                {cn.advice && (
                  <p className="p-2.5 rounded-lg bg-white border border-[#e9e2d5] text-[#645e45] font-semibold">
                    <strong>Medical Advice:</strong> {cn.advice}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HOME VISIT VITAL SUMMARIES */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
          <div className="p-1.5 rounded-lg bg-[#edf3ec] text-[#426442]">
            <HeartPulse className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-[#1e1b14]">
            Home Visit Vitals & Nurse Assessment History ({visitSummaries.length})
          </h3>
        </div>

        {visitSummaries.length === 0 ? (
          <p className="text-xs text-[#7b776c] font-medium py-4 text-center">
            No home visit vital measurements recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {visitSummaries.map((vs) => (
              <div key={vs.id} className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#ece5d8]">
                  <p className="font-black text-[#1e1b14]">Nurse Assessment: {vs.nurse}</p>
                  <span className="text-[11px] font-bold text-[#7b776c]">{vs.date}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-white border border-[#e9e2d5]">
                    <span className="text-[10px] text-[#7b776c] font-bold">BP:</span>
                    <p className="font-extrabold text-[#1e1b14]">{vs.blood_pressure || 'N/A'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#e9e2d5]">
                    <span className="text-[10px] text-[#7b776c] font-bold">Pulse:</span>
                    <p className="font-extrabold text-[#1e1b14]">{vs.pulse ? `${vs.pulse} bpm` : 'N/A'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#e9e2d5]">
                    <span className="text-[10px] text-[#7b776c] font-bold">SpO2:</span>
                    <p className="font-extrabold text-[#1e1b14]">{vs.oxygen_level ? `${vs.oxygen_level}%` : 'N/A'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#e9e2d5]">
                    <span className="text-[10px] text-[#7b776c] font-bold">Temp:</span>
                    <p className="font-extrabold text-[#1e1b14]">{vs.temperature ? `${vs.temperature} °F` : 'N/A'}</p>
                  </div>
                </div>

                {vs.treatment_notes && (
                  <p className="pt-1 text-[#4a473d]">
                    <strong>Treatment Notes:</strong> {vs.treatment_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
