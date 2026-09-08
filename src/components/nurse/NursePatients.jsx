import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  FileText,
  Clock,
  Home,
  Phone,
  MapPin,
  RefreshCw,
  ArrowRight,
  Eye
} from 'lucide-react';

export default function NursePatients({
  onViewMedicalProfile = () => {},
  onViewTimeline = () => {},
  onViewHomeVisits = () => {},
}) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/nurse/patients/?search=${encodeURIComponent(searchQuery)}&status=${statusFilter}`, {
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
      console.error('Error fetching nurse patient list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">My Patients Directory</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Authorized palliative patients under community care coordination
            </p>
          </div>
        </div>

        <button
          onClick={fetchPatients}
          className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors self-end md:self-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7b776c]" />
          <input
            type="text"
            placeholder="Search by patient name, reg ID, phone, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 bg-[#fdfcf9]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#7b776c]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
          >
            <option value="all">All Patients</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white border border-[#e9e2d5] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
          <Users className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
          <h3 className="text-sm font-black text-[#1e1b14]">No patients found</h3>
          <p className="text-xs text-[#7b776c] mt-1">Try adjusting your search criteria or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <div
              key={p.patient_id}
              className="bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:border-[#645e45]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[#1e1b14] leading-tight">{p.name}</h3>
                    <p className="text-[11px] font-semibold text-[#7b776c]">#{p.registration_id}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    p.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                    {p.status || 'Active'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#4a473d] bg-[#faf8f4] p-3 rounded-xl border border-[#f0ece1]">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-[#7b776c]" />
                    <span>{p.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#7b776c] flex-shrink-0" />
                    <span className="truncate">{p.house_name ? `${p.house_name}, ${p.place}` : (p.panchayath || 'Residence')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewMedicalProfile(p.patient_id)}
                  className="flex-1 py-2 px-2 bg-[#f3ede2] text-[#645e45] hover:bg-[#645e45] hover:text-white rounded-xl text-[11px] font-bold transition-colors text-center"
                >
                  Medical Records
                </button>
                <button
                  onClick={() => onViewTimeline(p.patient_id)}
                  className="flex-1 py-2 px-2 bg-white border border-[#e9e2d5] text-[#4a473d] hover:bg-[#f3ede2] rounded-xl text-[11px] font-bold transition-colors text-center"
                >
                  Care Timeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
