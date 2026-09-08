import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Inbox
} from 'lucide-react';

export default function NurseVisitAllocations({
  onAllocated = () => {},
}) {
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allocatingId, setAllocatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const fetchAvailableVisits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/nurse/visit-allocations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAllocations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching available visit allocations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableVisits();
  }, []);

  const handleSelfAllocate = async (occ) => {
    setAllocatingId(occ.occurrence_id);
    setFeedback({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/visits/${occ.occurrence_id}/self-allocate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message || 'Visit successfully allocated to you.', type: 'success' });
        onAllocated(data);
        fetchAvailableVisits();
      } else {
        setFeedback({ text: data.detail || 'Allocation failed.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Network error during self-allocation.', type: 'error' });
    } finally {
      setAllocatingId(null);
    }
  };

  const filteredAllocations = allocations.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(q) ||
      a.patient_reg_id.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Visit Allocations Queue</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Available unassigned home care visits ready for nurse self-allocation
            </p>
          </div>
        </div>

        <button
          onClick={fetchAvailableVisits}
          className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] transition-colors self-end md:self-center"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {feedback.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7b776c]" />
          <input
            type="text"
            placeholder="Filter by patient name, reg ID, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 bg-[#fdfcf9]"
          />
        </div>
        <span className="text-xs font-bold text-[#7b776c] hidden sm:block">
          {filteredAllocations.length} available visit{filteredAllocations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Allocations Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#e9e2d5] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
          <Inbox className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
          <h3 className="text-sm font-black text-[#1e1b14]">No unallocated visits available</h3>
          <p className="text-xs text-[#7b776c] mt-1">All scheduled community visits are currently allocated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAllocations.map((a) => (
            <div
              key={a.occurrence_id}
              className="bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:border-[#645e45]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-[#1e1b14]">{a.patient_name}</span>
                    <span className="text-xs text-[#7b776c] font-semibold">(#{a.patient_reg_id})</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {a.visit_type}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[#4a473d]">
                  <div className="flex items-center space-x-1.5 font-bold text-[#1e1b14]">
                    <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Scheduled for: {a.scheduled_date}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[#7b776c]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{a.location}</span>
                  </div>
                </div>

                {a.notes && (
                  <p className="text-[11px] text-[#7b776c] bg-[#faf8f4] p-2 rounded-xl border border-[#f0ece1]">
                    <span className="font-semibold text-[#4a473d]">Care Note: </span>
                    {a.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800">
                  Priority: {a.urgency_level || 'Routine'}
                </span>

                <button
                  onClick={() => handleSelfAllocate(a)}
                  disabled={allocatingId === a.occurrence_id}
                  className="px-4 py-2 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  {allocatingId === a.occurrence_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Self Allocate to Me</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
