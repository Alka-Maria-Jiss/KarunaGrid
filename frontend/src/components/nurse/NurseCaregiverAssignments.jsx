import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  X,
  Phone,
  MapPin
} from 'lucide-react';

export default function NurseCaregiverAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/nurse/caregiver-assignments/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setCaregivers(data.caregivers || []);
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Error fetching caregiver assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAssignCaregiver = async (e) => {
    e.preventDefault();
    if (!selectedCaregiverId || !selectedPatientId) return;

    setIsSubmitting(true);
    setFeedback({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/nurse/caregiver-assignments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caregiver_id: selectedCaregiverId,
          patient_id: selectedPatientId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message || 'Caregiver assigned successfully.', type: 'success' });
        setShowAssignModal(false);
        fetchAssignments();
      } else {
        setFeedback({ text: data.errors?.detail?.[0] || data.detail || 'Assignment failed.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Network error during caregiver assignment.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to end this caregiver assignment?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/caregiver-assignments/${assignmentId}/end/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message || 'Assignment ended.', type: 'success' });
        fetchAssignments();
      }
    } catch (err) {
      setFeedback({ text: 'Network error.', type: 'error' });
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(q) ||
      a.caregiver_name.toLowerCase().includes(q) ||
      a.patient_reg_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Caregiver Assignments</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Assign and manage verified community caregivers for registered palliative patients
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2.5 bg-[#645e45] text-white text-xs font-black rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Caregiver</span>
          </button>
          <button
            onClick={fetchAssignments}
            className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7b776c]" />
          <input
            type="text"
            placeholder="Search patient, caregiver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 bg-[#fdfcf9]"
          />
        </div>
        <span className="text-xs font-bold text-[#7b776c] hidden sm:block">
          {filteredAssignments.length} Assignment{filteredAssignments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-[#e9e2d5] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
          <Users className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
          <h3 className="text-sm font-black text-[#1e1b14]">No caregiver assignments found</h3>
          <p className="text-xs text-[#7b776c] mt-1">Click "Assign Caregiver" to link a patient with verified support.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#e9e2d5] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f4] border-b border-[#e9e2d5] text-[#7b776c] font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-5">Assigned Caregiver</th>
                  <th className="py-3.5 px-5">Assigned By</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece1]">
                {filteredAssignments.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-[#fcfbf8] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-[#1e1b14]">{a.patient_name}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-[#1e1b14]">{a.caregiver_name}</div>
                      <div className="text-[10px] text-[#7b776c] flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{a.caregiver_phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-semibold text-[#4a473d]">
                      Nurse {a.assigned_by_nurse}
                    </td>
                    <td className="py-4 px-5 text-[#7b776c]">
                      {a.assigned_at}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        a.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {a.status === 'Active' && (
                        <button
                          onClick={() => handleEndAssignment(a.assignment_id)}
                          className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
                        >
                          End Assignment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Assign Caregiver</h2>
                  <p className="text-xs text-[#7b776c]">Connect verified caregiver to patient</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCaregiver} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e1b14] mb-1">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-white focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} {p.place ? `— ${p.place}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1e1b14] mb-1">
                  Select Verified Caregiver <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCaregiverId}
                  onChange={(e) => setSelectedCaregiverId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] bg-white focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-medium"
                >
                  <option value="">-- Choose Verified Caregiver --</option>
                  {caregivers.map((c) => (
                    <option key={c.caregiver_id} value={c.caregiver_id}>
                      {c.name} ({c.specialization || 'Caregiver'}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#f0ece1]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCaregiverId || !selectedPatientId}
                  className="px-5 py-2.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
