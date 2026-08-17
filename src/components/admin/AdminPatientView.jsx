import React, { useState } from 'react';
import { Users, Search, Eye, Filter, ShieldCheck, MapPin, Phone, Calendar } from 'lucide-react';
import PatientDetailModal from './PatientDetailModal';

export default function AdminPatientView({ patients = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      !searchQuery ||
      patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.registration_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone?.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ||
      (patient.registration_status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Patient Directory (Read-Only)
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
              {patients.length} Registered Patients
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Administrative registry of palliative care patients and registration status tracking
          </p>
        </div>

        {/* Doctor clinical authority notice badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#faf8f4] border border-[#e0d9cc] text-[#645e45] text-xs font-bold">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>Clinical Approval Handled by Doctors</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Patients' },
            { id: 'approved', label: 'Approved by Doctor' },
            { id: 'pending', label: 'Pending Doctor Review' },
            { id: 'rejected', label: 'Rejected by Doctor' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#645e45] text-white shadow-2xs'
                  : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Reg ID, or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No patient records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  <th className="py-3 px-4 font-extrabold">Patient Name</th>
                  <th className="py-3 px-4 font-extrabold">Registration ID</th>
                  <th className="py-3 px-4 font-extrabold">Contact & Location</th>
                  <th className="py-3 px-4 font-extrabold">Emergency Contact</th>
                  <th className="py-3 px-4 font-extrabold">Doctor Review Status</th>
                  <th className="py-3 px-4 font-extrabold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {filteredPatients.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-[#faf7f0] transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#edf3ec] text-[#426442] flex items-center justify-center font-extrabold text-xs border border-[#d2e2d0]">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p>{p.name}</p>
                          <p className="text-[11px] text-[#7b776c] font-medium">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#645e45]">
                      {p.registration_id}
                    </td>
                    <td className="py-3.5 px-4 text-[#4a473d]">
                      <p className="font-medium">{p.phone || 'N/A'}</p>
                      <p className="text-[11px] text-[#7b776c]">
                        {p.place}, {p.panchayath}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                      <p className="font-semibold text-[#1e1b14]">
                        {p.emergency_contact_name || 'N/A'}
                      </p>
                      <p className="text-[11px]">{p.emergency_contact_phone || ''}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                          p.registration_status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : p.registration_status === 'Rejected'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        <span>{p.registration_status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* READ ONLY PATIENT DETAIL MODAL */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}
