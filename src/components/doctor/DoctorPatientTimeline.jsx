import React, { useState, useEffect } from 'react';
import { Clock, UserCheck, Video, Home, Pill, FileSpreadsheet, Boxes, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function DoctorPatientTimeline({
  initialPatientId = null,
  onBack,
}) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchTimeline = async (patientId) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/timeline/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching patient timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchTimeline(selectedPatientId);
    }
  }, [selectedPatientId]);

  const getEventIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'registration':
      case 'clinical verification':
        return UserCheck;
      case 'telemedicine':
        return Video;
      case 'home visit':
        return Home;
      case 'prescription':
        return Pill;
      case 'diagnostics':
        return FileSpreadsheet;
      case 'medical equipment':
        return Boxes;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <Clock className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Patient Care Journey & Timeline
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Chronological audit of patient clinical milestones, doctor evaluations, visits, and prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#7b776c]">Select Patient:</label>
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] text-xs font-bold text-[#1e1b14] focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} ({p.registration_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading care timeline...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Clock className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No timeline milestones recorded.</p>
            <p>Milestones will generate automatically with clinical care events.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e9e2d5]">
            {events.map((ev, idx) => {
              const Icon = getEventIcon(ev.category);
              return (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Timeline Dot Icon */}
                  <div className="absolute -left-6 sm:-left-8 p-1.5 rounded-full bg-[#645e45] text-white border-4 border-white shadow-2xs">
                    <Icon className="w-3 h-3" />
                  </div>

                  {/* Event Card */}
                  <div className="flex-1 p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1 hover:border-[#645e45] transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45]">
                          {ev.category}
                        </span>
                        <h4 className="font-black text-xs text-[#1e1b14]">
                          {ev.event}
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-[#7b776c]">
                        {ev.date}
                      </span>
                    </div>

                    <p className="text-xs text-[#4a473d] pt-1">
                      {ev.description}
                    </p>

                    {ev.status && (
                      <div className="pt-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${
                            ev.status === 'Completed' || ev.status === 'Approved' || ev.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          Status: {ev.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
