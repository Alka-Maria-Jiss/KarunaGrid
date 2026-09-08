import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  FileText,
  Clock,
  Pill,
  ArrowRight,
  RefreshCw,
  Phone,
  MapPin,
  FileSpreadsheet,
  Utensils,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function DoctorPatients({
  onSelectPatient,
  onSelectPatientForProfile,
  onSelectPatientForTimeline,
  onSelectPatientForPrescription,
  contextIntent = null, // e.g. 'prescriptions', 'lab_reports', 'nutrition', 'timeline', 'profile'
  contextTitle = null,
}) {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);

      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleOpenWorkspace = (patientId, tab = 'profile') => {
    if (onSelectPatient) {
      onSelectPatient(patientId, tab);
    } else if (tab === 'profile' && onSelectPatientForProfile) {
      onSelectPatientForProfile(patientId);
    } else if (tab === 'timeline' && onSelectPatientForTimeline) {
      onSelectPatientForTimeline(patientId);
    } else if (tab === 'prescriptions' && onSelectPatientForPrescription) {
      onSelectPatientForPrescription(patientId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Context Selection Banner (when accessed from a submodule without patient selected) */}
      {contextIntent && (
        <div className="p-4 rounded-2xl bg-[#f4ede0] border border-[#e9e2d5] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#645e45]" />
            <div>
              <p className="font-extrabold text-xs text-[#1e1b14]">
                {contextTitle || `Select a patient to access ${contextIntent.replace('_', ' ')}`}
              </p>
              <p className="text-[11px] text-[#7b776c]">
                Clicking a patient will open their unified Patient Clinical Workspace directly on the requested section.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Palliative Patient Directory
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Search, open clinical workspaces, inspect vitals, and issue medications for registered community patients.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPatients}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient Name, Patient ID, Phone, or Place..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] placeholder-[#7b776c] focus:outline-hidden focus:ring-2 focus:ring-[#645e45]"
          />
        </form>

        <div className="flex items-center gap-2">
          {['All', 'Approved', 'Pending'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#645e45] text-white shadow-2xs'
                  : 'bg-white text-[#4a473d] border border-[#e9e2d5] hover:bg-[#fdfbf7]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading patient records...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Users className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No patients found.</p>
            <p>Try adjusting your search criteria or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Patient ID</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {patients.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-[#fdfbf7] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-black text-[#1e1b14]">{p.name}</p>
                      <p className="text-[10px] text-[#7b776c] font-medium">Joined {p.created_at}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-bold text-[10px]">
                        {p.registration_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">
                      {p.gender || 'N/A'} • {p.dob || 'DOB N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                        <span>{p.place || 'N/A'}{p.panchayath ? `, ${p.panchayath}` : ''}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#7b776c] flex-shrink-0" />
                        <span>{p.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.registration_status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {p.registration_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Primary action: Open Patient Workspace */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspace(p.patient_id, contextIntent || 'profile')}
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#645e45] text-white hover:bg-[#4d4835] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          title="Open Patient Clinical Workspace"
                        >
                          <span>Open Workspace</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
