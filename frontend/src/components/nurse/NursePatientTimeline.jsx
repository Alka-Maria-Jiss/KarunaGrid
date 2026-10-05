import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Calendar,
  CheckCircle2,
  FileText,
  Activity,
  UserPlus,
  Pill,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export default function NursePatientTimeline({
  initialPatientId = null,
}) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [timelineEvents, setTimelineEvents] = useState([]);
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
      console.error('Error fetching patients for timeline:', err);
    }
  };

  const fetchTimeline = async (patientId) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/nurse/patients/${patientId}/timeline/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching timeline events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchTimeline(selectedPatientId);
    }
  }, [selectedPatientId]);

  const getEventIcon = (category) => {
    switch (category) {
      case 'Registration':
      case 'Clinical Verification':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'Home Visit':
        return <Activity className="w-4 h-4 text-[#645e45]" />;
      case 'Prescription':
        return <Pill className="w-4 h-4 text-blue-700" />;
      case 'Diagnostics':
        return <FileSpreadsheet className="w-4 h-4 text-purple-700" />;
      case 'Caregiver':
        return <UserPlus className="w-4 h-4 text-amber-700" />;
      default:
        return <Clock className="w-4 h-4 text-[#7b776c]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Patient Care Timeline</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Chronological palliative care history and multi-disciplinary interventions
            </p>
          </div>
        </div>

        {/* Patient Selector */}
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

      {/* Timeline Stream */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs">
        {isLoading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="py-12 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#e9e2d5]">
            <Clock className="w-10 h-10 text-[#7b776c]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#4a473d]">No timeline events found for this patient.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e9e2d5]">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-6 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-[#645e45] flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-[#645e45]" />
                </div>

                <div className="p-4 rounded-2xl border border-[#f0ece1] bg-[#fcfbf8] hover:bg-white hover:border-[#645e45]/30 hover:shadow-xs transition-all space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <div className="flex items-center space-x-2">
                      {getEventIcon(evt.category)}
                      <span className="font-extrabold text-[#1e1b14]">{evt.event}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#7b776c]">{evt.date}</span>
                  </div>

                  <p className="text-xs text-[#4a473d] pl-6 leading-relaxed">
                    {evt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
