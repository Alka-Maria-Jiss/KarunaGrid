import React, { useState, useEffect } from 'react';
import {
  FileText,
  HeartPulse,
  Pill,
  FileSpreadsheet,
  AlertTriangle,
  Activity,
  User,
  Search,
  ChevronLeft,
  Calendar,
  Eye,
  Lock
} from 'lucide-react';

export default function NursePatientMedicalRecords({
  initialPatientId = null,
  onBack = () => {},
}) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/nurse/patients/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data || []);
        if (!selectedPatientId && data.length > 0) {
          setSelectedPatientId(data[0].patient_id);
        }
      }
    } catch (err) {
      console.error('Error fetching patients for medical records:', err);
    }
  };

  const fetchProfile = async (patientId) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/nurse/patients/${patientId}/profile/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error('Error fetching patient medical profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchProfile(selectedPatientId);
    }
  }, [selectedPatientId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Patient Medical Records</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Read-only clinical history, diagnoses, allergies, recorded vitals & medications
            </p>
          </div>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#7b776c]">Patient:</span>
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} {p.place ? `— ${p.place}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-28 bg-white border border-[#e9e2d5] animate-pulse rounded-3xl" />
          <div className="h-64 bg-white border border-[#e9e2d5] animate-pulse rounded-3xl" />
        </div>
      ) : profileData ? (
        <div className="space-y-6">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#1e1b14]">{profileData.patient_info?.name}</h3>
                <p className="text-xs font-semibold text-[#7b776c]">
                  DOB: {profileData.patient_info?.dob || 'N/A'} ({profileData.patient_info?.gender || 'N/A'}) • {profileData.patient_info?.place || profileData.patient_info?.panchayath || 'Community Care'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
                  {profileData.patient_info?.registration_status}
                </span>
                <span className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full font-semibold flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Clinical View Only</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#4a473d]">
              <div>
                <span className="text-[#7b776c]">Contact: </span>
                <strong className="text-[#1e1b14]">{profileData.patient_info?.phone || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[#7b776c]">Location: </span>
                <span className="font-semibold">{profileData.patient_info?.house_name}, {profileData.patient_info?.place}</span>
              </div>
              <div>
                <span className="text-[#7b776c]">Emergency Contact: </span>
                <span className="font-semibold">{profileData.patient_info?.emergency_contact_name || 'N/A'} ({profileData.patient_info?.emergency_contact_phone || 'N/A'})</span>
              </div>
            </div>
          </div>

          {/* Diagnoses, Allergies, Chronic Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Diagnoses */}
            <div className="bg-white rounded-3xl p-5 border border-[#e9e2d5] shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-black text-[#1e1b14] mb-3">
                <Activity className="w-4 h-4 text-[#645e45]" />
                <span>DIAGNOSES</span>
              </div>
              {profileData.diagnoses?.length === 0 ? (
                <p className="text-xs text-[#7b776c] italic">No active diagnoses recorded.</p>
              ) : (
                <div className="space-y-2">
                  {profileData.diagnoses?.map((d) => (
                    <div key={d.id} className="p-3 bg-[#faf8f4] rounded-xl border border-[#f0ece1]">
                      <p className="text-xs font-extrabold text-[#1e1b14]">{d.text}</p>
                      <p className="text-[10px] text-[#7b776c] mt-0.5">Diagnosed by {d.doctor} on {d.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-white rounded-3xl p-5 border border-[#e9e2d5] shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-black text-[#1e1b14] mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span>ALLERGIES</span>
              </div>
              {profileData.allergies?.length === 0 ? (
                <p className="text-xs text-[#7b776c] italic">No known allergies documented.</p>
              ) : (
                <div className="space-y-2">
                  {profileData.allergies?.map((a) => (
                    <div key={a.id} className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-red-950">{a.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white rounded-3xl p-5 border border-[#e9e2d5] shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-black text-[#1e1b14] mb-3">
                <HeartPulse className="w-4 h-4 text-amber-700" />
                <span>CHRONIC CONDITIONS</span>
              </div>
              {profileData.chronic_conditions?.length === 0 ? (
                <p className="text-xs text-[#7b776c] italic">No chronic conditions listed.</p>
              ) : (
                <div className="space-y-2">
                  {profileData.chronic_conditions?.map((c) => (
                    <div key={c.id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-100">
                      <p className="text-xs font-extrabold text-amber-950">{c.name}</p>
                      {c.notes && <p className="text-[10px] text-amber-900 mt-0.5">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vitals History */}
          <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-xs font-black text-[#1e1b14]">
                <HeartPulse className="w-4 h-4 text-purple-700" />
                <span>HOME VISIT VITALS & NURSE ASSESSMENTS HISTORY</span>
              </div>
              <span className="text-xs text-[#7b776c]">
                {profileData.recent_vitals?.length || 0} Records
              </span>
            </div>

            {profileData.recent_vitals?.length === 0 ? (
              <p className="text-xs text-[#7b776c] italic py-4">No completed home visit vitals recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {profileData.recent_vitals?.map((v, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#1e1b14]">Visit Date: {v.date}</span>
                      <span className="text-[#7b776c]">Recorded by: <strong>Nurse {v.nurse}</strong></span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-white border border-[#e9e2d5]">
                        <span className="text-[10px] text-[#7b776c] block">Blood Pressure</span>
                        <strong className="text-xs text-[#1e1b14]">{v.blood_pressure || 'N/A'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-[#e9e2d5]">
                        <span className="text-[10px] text-[#7b776c] block">Pulse</span>
                        <strong className="text-xs text-[#1e1b14]">{v.pulse ? `${v.pulse} bpm` : 'N/A'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-[#e9e2d5]">
                        <span className="text-[10px] text-[#7b776c] block">Temperature</span>
                        <strong className="text-xs text-[#1e1b14]">{v.temperature ? `${v.temperature} °F` : 'N/A'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-[#e9e2d5]">
                        <span className="text-[10px] text-[#7b776c] block">SpO2</span>
                        <strong className="text-xs text-[#1e1b14]">{v.oxygen_level ? `${v.oxygen_level}%` : 'N/A'}</strong>
                      </div>
                    </div>

                    {v.treatment_notes && (
                      <p className="text-xs text-[#4a473d] bg-white p-2.5 rounded-xl border border-[#f0ece1]">
                        <span className="font-semibold text-[#7b776c]">Treatment Notes: </span>
                        {v.treatment_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Prescriptions (Read-Only) */}
          <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-xs font-black text-[#1e1b14]">
                <Pill className="w-4 h-4 text-emerald-700" />
                <span>PRESCRIBED MEDICATIONS (DOCTOR MANAGED)</span>
              </div>
              <span className="text-[11px] font-bold text-[#7b776c]">Read-Only for Nursing Reference</span>
            </div>

            {profileData.prescriptions?.length === 0 ? (
              <p className="text-xs text-[#7b776c] italic py-4">No prescriptions on record.</p>
            ) : (
              <div className="space-y-3">
                {profileData.prescriptions?.map((rx) => (
                  <div key={rx.prescription_id} className="p-4 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#1e1b14]">
                        Prescription v{rx.version_number} ({rx.status})
                      </span>
                      <span className="text-[#7b776c]">Issued by {rx.doctor_name} on {rx.created_at}</span>
                    </div>

                    <div className="divide-y divide-[#f0ece1] bg-white rounded-xl border border-[#e9e2d5] overflow-hidden">
                      {rx.items?.map((it, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1e1b14]">{it.medicine_name}</span>
                            <span className="text-[#7b776c] ml-2">({it.dosage})</span>
                          </div>
                          <div className="text-[#4a473d] text-right">
                            <span className="font-semibold">{it.frequency}</span>
                            <span className="text-[#7b776c] ml-2">for {it.duration_days} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
          <User className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
          <h3 className="text-sm font-black text-[#1e1b14]">Select a patient to view medical records</h3>
        </div>
      )}
    </div>
  );
}
