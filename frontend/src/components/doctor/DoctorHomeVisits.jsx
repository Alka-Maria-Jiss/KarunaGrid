import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  Clock,
  Activity,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  HeartPulse,
  Thermometer,
  Wind,
  Stethoscope,
  UserCheck,
  MapPin,
  Eye,
  X
} from 'lucide-react';

export default function DoctorHomeVisits() {
  const [data, setData] = useState({ schedules: [], occurrences: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('occurrences'); // 'occurrences' | 'schedules'
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/doctor/home-visits/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching doctor home visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseVisitDate = (occ) => {
    if (!occ) return 0;
    if (occ.raw_date) return new Date(occ.raw_date).getTime();
    if (occ.scheduled_date) return new Date(occ.scheduled_date).getTime();
    return 0;
  };

  const sortedOccurrences = [...(data.occurrences || [])].sort((a, b) => parseVisitDate(a) - parseVisitDate(b));

  const upcomingVisits = sortedOccurrences.filter(
    (o) => o.status === 'Scheduled' || o.status === 'Rescheduled' || o.status === 'Pending'
  );
  const completedVisits = sortedOccurrences.filter(
    (o) => o.status === 'Completed'
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1e1b14]">
                Home Visit Clinical Oversight
              </h2>
              <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                Inspect Doctor + Nurse team visits, clinical vitals, symptom tracking, and care documentation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 rounded-xl text-[#645e45] bg-[#fdfbf7] border border-[#e9e2d5] hover:bg-[#f4ede0] cursor-pointer transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#e9e2d5] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('occurrences')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'occurrences'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'text-[#4a473d] hover:bg-[#f4ede0]'
          }`}
        >
          All Team Visits ({data.occurrences?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'schedules'
              ? 'bg-[#645e45] text-white shadow-2xs'
              : 'text-[#4a473d] hover:bg-[#f4ede0]'
          }`}
        >
          Active Recurring Schedules ({data.schedules?.length || 0})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading palliative home visits...</p>
          </div>
        ) : activeTab === 'occurrences' ? (
          (data.occurrences || []).length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
              <Activity className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No visit occurrences logged yet.</p>
              <p>Team home visits scheduled for your authorized patients will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Scheduled Date</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Visit Type / Priority</th>
                    <th className="py-3.5 px-4">Home Visit Team</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Clinical Documentation</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                  {sortedOccurrences.map((occ) => (
                    <tr key={occ.occurrence_id} className="hover:bg-[#fdfbf7] transition-colors">
                      <td className="py-3.5 px-4 font-black">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                          <span>{occ.scheduled_date}</span>
                        </div>
                        {(occ.frequency_display || occ.frequency) && (
                          <p className="text-[10px] text-[#426442] font-extrabold mt-0.5">
                            {occ.frequency_display || occ.frequency}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-black text-[#1e1b14]">{occ.patient_name}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#4a473d]">
                          {occ.visit_type} Visit
                        </span>
                        <span className={`block text-[10px] font-bold ${
                          occ.urgency_level === 'Emergency' ? 'text-red-700' :
                          occ.urgency_level === 'Urgent' ? 'text-amber-700' : 'text-[#7b776c]'
                        }`}>
                          {occ.urgency_level || 'Routine'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="flex items-center space-x-1 text-[#4a473d]">
                            <Stethoscope className="w-3 h-3 text-[#645e45]" />
                            <span>Doctor: <strong className="text-[#1e1b14]">{occ.visiting_doctor_name || occ.visiting_doctor || 'Not Assigned'}</strong></span>
                          </p>
                          {occ.status === 'Completed' && (
                            <p className="flex items-center space-x-1 text-[#4a473d]">
                              <UserCheck className="w-3 h-3 text-[#645e45]" />
                              <span>Done by: <strong className="text-[#1e1b14]">{occ.completed_by_nurse_name || occ.summary?.nurse_name || occ.allocated_nurse || 'Palliative Nurse'}</strong></span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            occ.status === 'Completed'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : 'bg-blue-50 text-blue-900 border-blue-300'
                          }`}
                        >
                          {occ.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {occ.summary ? (
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-bold text-[#1e1b14]">
                              BP: {occ.summary.blood_pressure || 'N/A'} • Pulse: {occ.summary.pulse ? `${occ.summary.pulse} bpm` : 'N/A'} • SpO2: {occ.summary.oxygen_level ? `${occ.summary.oxygen_level}%` : 'N/A'}
                            </p>
                            {occ.summary.treatment_notes && (
                              <p className="text-[#7b776c] italic line-clamp-1">
                                "{occ.summary.treatment_notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#7b776c] italic">Pending Nurse completion</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {occ.summary && (
                          <button
                            type="button"
                            onClick={() => setSelectedVisitDetail(occ)}
                            className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                            title="View Full Clinical Summary"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          (data.schedules || []).length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
              <Home className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No recurring home visit schedules.</p>
              <p>Active recurring schedules created by nurses for your authorized patients will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Recurring Frequency</th>
                    <th className="py-3.5 px-4">Start Date</th>
                    <th className="py-3.5 px-4">Nurse Manager</th>
                    <th className="py-3.5 px-4">Schedule Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                  {data.schedules.map((s) => (
                    <tr key={s.schedule_id} className="hover:bg-[#fdfbf7] transition-colors">
                      <td className="py-3.5 px-4 font-black">{s.patient_name}</td>
                      <td className="py-3.5 px-4 font-bold text-[#426442]">{s.frequency_display || s.frequency}</td>
                      <td className="py-3.5 px-4 font-medium text-[#4a473d]">{s.start_date}</td>
                      <td className="py-3.5 px-4 font-medium text-[#7b776c]">{s.nurse_name || 'Assigned Nurse'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            s.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* CLINICAL DETAIL MODAL */}
      {selectedVisitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Clinical Visit Report</h2>
                  <p className="text-xs text-[#7b776c]">
                    {selectedVisitDetail.patient_name} • {selectedVisitDetail.scheduled_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitDetail(null)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Team Info */}
              <div className="p-3 bg-[#faf8f4] rounded-2xl border border-[#f0ece1] space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Home Visit Team</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Visiting Doctor: <strong>{selectedVisitDetail.visiting_doctor_name || selectedVisitDetail.visiting_doctor || 'Not Assigned'}</strong></div>
                  {selectedVisitDetail.status === 'Completed' ? (
                    <div>Completed by: <strong>{selectedVisitDetail.completed_by_nurse_name || selectedVisitDetail.summary?.nurse_name || selectedVisitDetail.allocated_nurse || 'Palliative Nurse'}</strong></div>
                  ) : (
                    <div>Nursing: <strong>Shared Nurse Team</strong></div>
                  )}
                </div>
              </div>

              {/* Vitals */}
              {selectedVisitDetail.summary && (
                <div className="space-y-2">
                  <p className="font-extrabold text-[#1e1b14] flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    <span>Vital Signs</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                    <div>BP: <strong>{selectedVisitDetail.summary.blood_pressure || 'N/A'}</strong></div>
                    <div>Pulse: <strong>{selectedVisitDetail.summary.pulse ? `${selectedVisitDetail.summary.pulse} bpm` : 'N/A'}</strong></div>
                    <div>Temp: <strong>{selectedVisitDetail.summary.temperature ? `${selectedVisitDetail.summary.temperature} °F` : 'N/A'}</strong></div>
                    <div>SpO2: <strong>{selectedVisitDetail.summary.oxygen_level ? `${selectedVisitDetail.summary.oxygen_level}%` : 'N/A'}</strong></div>
                  </div>
                </div>
              )}

              {/* Symptoms */}
              {selectedVisitDetail.summary?.symptoms && selectedVisitDetail.summary.symptoms.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-extrabold text-[#1e1b14] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-700" />
                    <span>Reported Symptoms</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVisitDetail.summary.symptoms.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                        {s.symptom_name} ({s.severity})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Notes */}
              {selectedVisitDetail.summary?.treatment_notes && (
                <div className="space-y-1">
                  <p className="font-extrabold text-[#1e1b14]">Nurse Clinical Observations & Care Provided</p>
                  <p className="p-3 bg-[#fdfcf9] rounded-xl border border-[#e9e2d5] text-[#4a473d]">
                    {selectedVisitDetail.summary.treatment_notes}
                  </p>
                </div>
              )}

              {/* Next Recommendation */}
              {selectedVisitDetail.summary?.next_visit_recommendation && (
                <div className="text-xs text-[#7b776c]">
                  Next Visit Recommendation: <strong className="text-[#1e1b14]">{selectedVisitDetail.summary.next_visit_recommendation}</strong>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#fcfaf6] border-t border-[#e9e2d5] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVisitDetail(null)}
                className="px-4 py-2 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
