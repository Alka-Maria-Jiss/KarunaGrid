import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Filter, FileText, ArrowRight, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import DoctorRegistrationDetailModal from './DoctorRegistrationDetailModal';

export default function DoctorRegistrationReview({
  onRefreshStats,
}) {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPendingPatients = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/doctor/patients/pending/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching pending patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPatients();
  }, []);

  const handleApprove = async (patientId) => {
    setIsProcessing(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Patient registration approved successfully.', type: 'success' });
        setSelectedPatient(null);
        fetchPendingPatients();
        if (onRefreshStats) onRefreshStats();
      } else {
        setMessage({ text: data.detail || 'Failed to approve patient registration.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error occurred.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (patientId, reason) => {
    setIsProcessing(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Patient registration rejected.', type: 'success' });
        setSelectedPatient(null);
        fetchPendingPatients();
        if (onRefreshStats) onRefreshStats();
      } else {
        const errorMsg = data.errors?.rejection_reason?.[0] || data.detail || 'Failed to reject registration.';
        setMessage({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error occurred.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRegistrations = registrations.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.registration_id?.toLowerCase().includes(q) ||
      p.place?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Patient Registration Clinical Review
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Review submitted medical discharge summaries and approve or reject palliative patient registrations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPendingPatients}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pending patients by name, registration ID, place, or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] placeholder-[#7b776c] focus:outline-hidden focus:ring-2 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Registrations List / Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading pending patient registrations...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <UserCheck className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No pending patient registrations.</p>
            <p>All registered patients have been clinically reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Discharge Summary</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {filteredRegistrations.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-[#fdfbf7] transition-colors">
                    <td className="py-3.5 px-4 font-black">{p.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-bold text-[10px]">
                        {p.registration_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">
                      {p.place || 'N/A'}{p.panchayath ? `, ${p.panchayath}` : ''}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">{p.phone || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {p.discharge_summary_path ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <FileText className="w-3 h-3" />
                          <span>Uploaded</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#ba1a1a]">Missing</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#7b776c]">{p.submitted_date || p.created_at || 'Recently'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs transition-all cursor-pointer"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedPatient && (
        <DoctorRegistrationDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
