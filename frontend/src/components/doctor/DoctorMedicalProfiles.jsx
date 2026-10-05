import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, AlertCircle, Heart, Activity, Pill, FileSpreadsheet, Video, ArrowLeft, CheckCircle2, User, RefreshCw, X } from 'lucide-react';

export default function DoctorMedicalProfiles({
  initialPatientId = null,
  onBack,
}) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDiagnosisModal, setShowAddDiagnosisModal] = useState(false);
  const [newDiagnosisText, setNewDiagnosisText] = useState('');
  const [isSubmittingDiagnosis, setIsSubmittingDiagnosis] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Load patient list
  useEffect(() => {
    const fetchPatientList = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://127.0.0.1:8000/api/doctor/patients/?status=Approved', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPatients(Array.isArray(data) ? data : []);
          if (!selectedPatientId && data.length > 0) {
            setSelectedPatientId(data[0].patient_id);
          }
        }
      } catch (err) {
        console.error('Error fetching patient list:', err);
      }
    };
    fetchPatientList();
  }, []);

  // Fetch full clinical profile for selected patient
  const fetchProfile = async (patientId) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/profile/`, {
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
      console.error('Error fetching patient profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchProfile(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (!newDiagnosisText.trim()) return;

    setIsSubmittingDiagnosis(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${selectedPatientId}/profile/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diagnosis_text: newDiagnosisText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Diagnosis recorded successfully.', type: 'success' });
        setNewDiagnosisText('');
        setShowAddDiagnosisModal(false);
        fetchProfile(selectedPatientId);
      } else {
        setMessage({ text: data.detail || 'Failed to record diagnosis.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error occurred.', type: 'error' });
    } finally {
      setIsSubmittingDiagnosis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Patient Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <FileText className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Patient Clinical Medical Profile
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Review comprehensive diagnosis history, nurse recorded vitals, medications, and laboratory records.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#7b776c]">Select Patient:</label>
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] text-xs font-bold text-[#1e1b14] focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name}{p.place ? ` – ${p.place}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#ba1a1a] flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#7b776c] bg-white rounded-2xl border border-[#e9e2d5]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
          <p className="font-bold">Loading clinical profile...</p>
        </div>
      ) : !profileData ? (
        <div className="p-16 text-center text-xs text-[#7b776c] bg-white rounded-2xl border border-[#e9e2d5]">
          <p className="font-bold text-sm text-[#1e1b14]">No patient selected.</p>
          <p>Please choose a patient from the dropdown above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f2ece1] pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-[#1e1b14]">
                    {profileData.patient_info.name}
                  </h3>
                </div>
                <p className="text-xs text-[#7b776c] font-medium mt-1">
                  {profileData.patient_info.gender || 'Gender N/A'} • DOB: {profileData.patient_info.dob || 'N/A'} • Phone: {profileData.patient_info.phone || 'N/A'}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs font-bold text-[#4a473d]">
                  {profileData.patient_info.place || 'Place N/A'}, {profileData.patient_info.panchayath || ''}
                </p>
                <p className="text-[11px] text-[#7b776c]">
                  Emergency Contact: {profileData.patient_info.emergency_contact_name || 'N/A'} ({profileData.patient_info.emergency_contact_phone || 'N/A'})
                </p>
              </div>
            </div>

            {/* Diagnoses, Allergies, Conditions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* DIAGNOSES */}
              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-[#7b776c] tracking-wider">
                    Clinical Diagnoses
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddDiagnosisModal(true)}
                    className="p-1 rounded-md text-[#645e45] hover:bg-[#f4ede0] transition-colors cursor-pointer"
                    title="Add Diagnosis"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {profileData.diagnoses?.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No active diagnoses recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {profileData.diagnoses.map((d) => (
                      <div key={d.id} className="p-2.5 rounded-lg bg-white border border-[#e9e2d5] text-xs">
                        <p className="font-black text-[#1e1b14]">{d.text}</p>
                        <p className="text-[10px] text-[#7b776c] mt-0.5">Recorded by Dr. {d.doctor} on {d.date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ALLERGIES */}
              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-3">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c] tracking-wider block">
                  Known Allergies
                </span>
                {profileData.allergies?.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No known drug/food allergies.</p>
                ) : (
                  <div className="space-y-2">
                    {profileData.allergies.map((a) => (
                      <div key={a.id} className="p-2.5 rounded-lg bg-[#faf0ec] border border-[#ebd4cc] text-xs">
                        <p className="font-black text-[#ba1a1a]">{a.name}</p>
                        <p className="text-[10px] text-[#ba1a1a]/80 mt-0.5">Severity: {a.severity}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CHRONIC CONDITIONS */}
              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-3">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c] tracking-wider block">
                  Chronic Conditions
                </span>
                {profileData.chronic_conditions?.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No chronic conditions listed.</p>
                ) : (
                  <div className="space-y-2">
                    {profileData.chronic_conditions.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-white border border-[#e9e2d5] text-xs">
                        <p className="font-black text-[#1e1b14]">{c.name}</p>
                        {c.notes && <p className="text-[10px] text-[#7b776c] mt-0.5">{c.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Nurse Recorded Vitals */}
          <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#426442]" />
                <h4 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
                  Recent Nurse Recorded Vitals & Visit Summaries
                </h4>
              </div>
              <span className="text-[11px] text-[#7b776c] font-semibold">
                Read-only Clinical Reference
              </span>
            </div>

            {profileData.recent_vitals?.length === 0 ? (
              <p className="text-xs text-[#7b776c] italic py-4">No home visit vitals recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {profileData.recent_vitals.map((v, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
                      <span className="font-bold text-[#1e1b14]">{v.date}</span>
                      <span className="text-[10px] text-[#7b776c]">Nurse {v.nurse}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#7b776c]">BP: </span>
                        <span className="font-black text-[#1e1b14]">{v.blood_pressure || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#7b776c]">Pulse: </span>
                        <span className="font-black text-[#1e1b14]">{v.pulse ? `${v.pulse} bpm` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#7b776c]">Temp: </span>
                        <span className="font-black text-[#1e1b14]">{v.temperature ? `${v.temperature}°F` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#7b776c]">SpO2: </span>
                        <span className="font-black text-[#1e1b14]">{v.oxygen_level ? `${v.oxygen_level}%` : 'N/A'}</span>
                      </div>
                    </div>
                    {v.treatment_notes && (
                      <p className="text-[11px] text-[#4a473d] pt-1 border-t border-[#f0eae0] italic">
                        "{v.treatment_notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Prescriptions & Lab Reports 2-Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prescriptions */}
            <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#695e3d]" />
                  <h4 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
                    Prescriptions History
                  </h4>
                </div>
              </div>

              {profileData.prescriptions?.length === 0 ? (
                <p className="text-xs text-[#7b776c] italic py-4">No prescriptions issued for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {profileData.prescriptions.map((rx) => (
                    <div key={rx.prescription_id} className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#1e1b14]">
                          Prescription v{rx.version_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            rx.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {rx.items?.map((it, idx) => (
                          <p key={idx} className="text-[11px] text-[#4a473d] flex items-center justify-between">
                            <span className="font-bold">{it.medicine_name}</span>
                            <span className="text-[#7b776c]">{it.dosage} • {it.frequency}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lab Reports */}
            <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#426442]" />
                  <h4 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
                    Diagnostic Lab Reports
                  </h4>
                </div>
              </div>

              {profileData.lab_reports?.length === 0 ? (
                <p className="text-xs text-[#7b776c] italic py-4">No laboratory records available.</p>
              ) : (
                <div className="space-y-3">
                  {profileData.lab_reports.map((lr) => (
                    <div key={lr.report_id} className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#1e1b14]">{lr.investigation_name || 'Diagnostic Report'} ({lr.report_date})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            lr.review_status === 'Reviewed'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {lr.review_status}
                        </span>
                      </div>
                      {lr.remarks ? (
                        <p className="text-[11px] text-[#4a473d]">
                          <span className="font-bold">Doctor Remarks:</span> {lr.remarks}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#ba1a1a] italic">Pending doctor remarks.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Diagnosis Modal */}
      {showAddDiagnosisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1e1b14]">Record Clinical Diagnosis</h3>
              <button
                type="button"
                onClick={() => setShowAddDiagnosisModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDiagnosis} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1e1b14]">
                  Clinical Diagnosis / Primary Assessment *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDiagnosisText}
                  onChange={(e) => setNewDiagnosisText(e.target.value)}
                  placeholder="Enter medical diagnosis (e.g., Advanced Non-Small Cell Lung Cancer Stage IV with bone metastases)..."
                  className="w-full p-3 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] placeholder-[#7b776c] focus:outline-hidden focus:ring-2 focus:ring-[#645e45]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowAddDiagnosisModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDiagnosis || !newDiagnosisText.trim()}
                  className="px-5 py-2 rounded-xl font-black text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs transition-all cursor-pointer"
                >
                  {isSubmittingDiagnosis ? 'Saving...' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
