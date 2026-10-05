import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  FileText,
  MessageSquare,
  AlertTriangle,
  Award,
  Star,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  Loader2,
  Check,
  HeartHandshake
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function NurseCaregiverManagement() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'assignments' | 'complaints'
  const [pendingCaregivers, setPendingCaregivers] = useState([]);
  const [approvedCaregivers, setApprovedCaregivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');

  // Modals state
  const [selectedCaregiverModal, setSelectedCaregiverModal] = useState(null);
  const [approveConfirmCaregiver, setApproveConfirmCaregiver] = useState(null);
  const [rejectCaregiverModal, setRejectCaregiverModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Resolve complaint modal
  const [resolveComplaintModal, setResolveComplaintModal] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedAssignCaregiverId, setSelectedAssignCaregiverId] = useState('');
  const [selectedAssignPatientId, setSelectedAssignPatientId] = useState('');

  const [isActionLoading, setIsActionLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // Load all tab data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, approvedRes, assignRes, complaintsRes] = await Promise.allSettled([
        apiClient.get('/nurse/caregivers/pending/'),
        apiClient.get('/nurse/caregivers/approved/'),
        apiClient.get('/care-coordination/nurse/caregiver-assignments/'),
        apiClient.get('/nurse/caregiver-complaints/'),
      ]);

      if (pendingRes.status === 'fulfilled') {
        setPendingCaregivers(Array.isArray(pendingRes.value) ? pendingRes.value : []);
      }
      if (approvedRes.status === 'fulfilled') {
        setApprovedCaregivers(Array.isArray(approvedRes.value) ? approvedRes.value : []);
      }
      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value?.assignments || []);
        setPatientsList(assignRes.value?.patients || []);
      }
      if (complaintsRes.status === 'fulfilled') {
        setComplaints(Array.isArray(complaintsRes.value) ? complaintsRes.value : []);
      }
    } catch (err) {
      console.error('Error loading caregiver management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Approve
  const handleApproveCaregiver = async () => {
    if (!approveConfirmCaregiver) return;
    setIsActionLoading(true);
    try {
      const res = await apiClient.post(`/nurse/caregivers/${approveConfirmCaregiver.caregiver_id}/approve/`);
      showSuccess(res.message || `Caregiver ${approveConfirmCaregiver.name} approved successfully. Approval email sent.`);
      setApproveConfirmCaregiver(null);
      setSelectedCaregiverModal(null);
      loadData();
    } catch (err) {
      showError(err.message || 'Failed to approve caregiver.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Reject
  const handleRejectCaregiver = async (e) => {
    e.preventDefault();
    if (!rejectCaregiverModal || !rejectionReason.trim()) {
      showError('Please provide a reason for rejection.');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await apiClient.post(`/nurse/caregivers/${rejectCaregiverModal.caregiver_id}/reject/`, {
        rejection_reason: rejectionReason.trim(),
      });
      showSuccess(res.message || `Caregiver ${rejectCaregiverModal.name} registration rejected.`);
      setRejectCaregiverModal(null);
      setRejectionReason('');
      setSelectedCaregiverModal(null);
      loadData();
    } catch (err) {
      showError(err.message || 'Failed to reject caregiver.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Resolve Complaint
  const handleResolveComplaint = async (e) => {
    e.preventDefault();
    if (!resolveComplaintModal || !resolutionNotes.trim()) {
      showError('Please enter resolution notes.');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await apiClient.post(`/nurse/caregiver-complaints/${resolveComplaintModal.complaint_id}/resolve/`, {
        resolution_notes: resolutionNotes.trim(),
      });
      showSuccess(res.message || 'Complaint resolved successfully.');
      setResolveComplaintModal(null);
      setResolutionNotes('');
      loadData();
    } catch (err) {
      showError(err.message || 'Failed to resolve complaint.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Direct Nurse Manual Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignCaregiverId || !selectedAssignPatientId) {
      showError('Please select both a caregiver and a patient.');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await apiClient.post('/care-coordination/nurse/caregiver-assignments/', {
        caregiver_id: selectedAssignCaregiverId,
        patient_id: selectedAssignPatientId,
      });
      showSuccess(res.message || 'Caregiver assigned to patient successfully.');
      setShowAssignModal(false);
      setSelectedAssignCaregiverId('');
      setSelectedAssignPatientId('');
      loadData();
    } catch (err) {
      showError(err.message || 'Failed to create caregiver assignment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // End an assignment
  const handleEndAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to end this caregiver assignment?')) return;
    try {
      const res = await apiClient.post(`/care-coordination/nurse/caregiver-assignments/${assignmentId}/end/`);
      showSuccess(res.message || 'Assignment ended.');
      loadData();
    } catch (err) {
      showError(err.message || 'Failed to end assignment.');
    }
  };

  // Filtered lists
  const filteredPending = pendingCaregivers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.place?.toLowerCase().includes(q);
  });

  const filteredApproved = approvedCaregivers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.place?.toLowerCase().includes(q) || c.specialization?.toLowerCase().includes(q);
  });

  const filteredComplaints = complaints.filter((c) => {
    if (complaintStatusFilter !== 'all' && c.status?.toLowerCase() !== complaintStatusFilter.toLowerCase()) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.subject?.toLowerCase().includes(q) || c.caregiver_name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const openComplaintsCount = complaints.filter((c) => c.status?.toLowerCase() === 'open').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4ede0] text-[#645e45] flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">
              Caregiver Management
            </h2>
            <p className="text-xs text-[#7b776c] font-medium mt-0.5">
              Review registrations, approve community caregivers, coordinate patient assignments, and resolve complaints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#fcfaf6] border border-[#e0d9cc] text-xs font-bold text-[#645e45] hover:bg-[#f4ede0] flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-extrabold hover:bg-[#524d38] flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Manual Assign</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-[#e9e2d5] flex flex-wrap gap-1.5 shadow-2xs">
        <button
          onClick={() => { setActiveTab('pending'); setSearchQuery(''); }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingCaregivers.length > 0 && (
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'pending' ? 'bg-white text-[#645e45]' : 'bg-amber-100 text-amber-900'
            }`}>
              {pendingCaregivers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('approved'); setSearchQuery(''); }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Approved Caregivers</span>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
            activeTab === 'approved' ? 'bg-white text-[#645e45]' : 'bg-[#f4ede0] text-[#645e45]'
          }`}>
            {approvedCaregivers.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('assignments'); setSearchQuery(''); }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Care Assignments</span>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
            activeTab === 'assignments' ? 'bg-white text-[#645e45]' : 'bg-[#f4ede0] text-[#645e45]'
          }`}>
            {assignments.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('complaints'); setSearchQuery(''); }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'complaints'
              ? 'bg-[#645e45] text-white shadow-xs'
              : 'text-[#7b776c] hover:bg-[#faf7f0] hover:text-[#1e1b14]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Caregiver Complaints</span>
          {openComplaintsCount > 0 && (
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'complaints' ? 'bg-rose-100 text-rose-900' : 'bg-rose-100 text-rose-900'
            }`}>
              {openComplaintsCount} Open
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'pending' ? 'Search pending caregiver applicants...' :
              activeTab === 'approved' ? 'Search approved caregivers by name or area...' :
              activeTab === 'complaints' ? 'Search complaints by subject, caregiver...' :
              'Search assignments...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
          />
        </div>

        {activeTab === 'complaints' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7b776c] font-semibold">Status:</span>
            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs font-bold text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Review">In Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: PENDING CAREGIVERS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {filteredPending.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#e9e2d5] space-y-2 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-60" />
              <h3 className="font-extrabold text-sm text-[#1e1b14]">No Pending Caregiver Registrations</h3>
              <p className="text-xs text-[#7b776c]">All caregiver applications have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPending.map((cg) => (
                <div
                  key={cg.caregiver_id}
                  className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-sm text-[#1e1b14] leading-tight">{cg.name}</h4>
                        <p className="text-[11px] text-[#7b776c] font-medium">{cg.email}</p>
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Pending
                      </span>
                    </div>

                    <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-1 text-xs">
                      <div className="flex items-center space-x-1.5 text-[#645e45]">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold truncate">{cg.place}, {cg.panchayath}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[#7b776c]">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cg.qualifications || 'Palliative Caregiver'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[#7b776c]">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{cg.phone}</span>
                      </div>
                    </div>

                    {cg.identity_proof_path && (
                      <a
                        href={`/api/auth/documents/view/?type=caregiver_identity_proof&id=${cg.caregiver_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#645e45] hover:underline bg-[#f8f3eb] px-2.5 py-1.5 rounded-lg border border-[#e8dccb]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Identity Proof Document</span>
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#f0ece1] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCaregiverModal(cg)}
                      className="px-3 py-1.5 rounded-lg bg-[#f8f3eb] hover:bg-[#f0e6d6] text-xs font-bold text-[#645e45] transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRejectCaregiverModal(cg)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setApproveConfirmCaregiver(cg)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVED CAREGIVERS */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {filteredApproved.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#e9e2d5] space-y-2 shadow-2xs">
              <Users className="w-10 h-10 text-[#7b776c]/40 mx-auto" />
              <h3 className="font-extrabold text-sm text-[#1e1b14]">No Approved Caregivers Found</h3>
              <p className="text-xs text-[#7b776c]">No caregivers match your current search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApproved.map((cg) => {
                const isAvailable = cg.is_available_now;
                return (
                  <div
                    key={cg.caregiver_id}
                    className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#1e1b14] leading-tight">{cg.name}</h4>
                          <p className="text-[11px] font-bold text-[#645e45]">{cg.specialization || 'Palliative Care Assistant'}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {isAvailable ? 'Available' : 'Assigned (Busy)'}
                        </span>
                      </div>

                      {/* Ratings and Experience */}
                      <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs">
                        <div className="flex items-center space-x-1 text-amber-600 font-extrabold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{cg.average_rating || '5.0'}</span>
                          <span className="text-[#7b776c] font-normal text-[10px]">({cg.total_reviews} reviews)</span>
                        </div>
                        <span className="text-[11px] font-semibold text-[#7b776c]">{cg.experience_years || '1+ years exp'}</span>
                      </div>

                      <div className="space-y-1 text-xs text-[#7b776c]">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#645e45] shrink-0" />
                          <span className="truncate">{cg.location}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#645e45] shrink-0" />
                          <span>{cg.phone || 'Phone not listed'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#645e45] shrink-0" />
                          <span className="truncate">{cg.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#f0ece1] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#7b776c]">
                        Active Patients: <strong className="text-[#1e1b14]">{cg.active_assignments_count || 0}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedCaregiverModal(cg)}
                        className="text-xs font-bold text-[#645e45] hover:underline"
                      >
                        View Profile →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-[#e9e2d5] flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#1e1b14]">Caregiver-Patient Assignments</h3>
            <span className="text-xs text-[#7b776c] font-semibold">{assignments.length} total recorded</span>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c]">
              No caregiver assignments recorded yet. Use the "Manual Assign" button above to link a caregiver with a patient.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf8f4] text-[#7b776c] uppercase font-bold text-[10px] tracking-wider border-b border-[#f0eae0]">
                  <tr>
                    <th className="py-3 px-4">Caregiver</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Assigned On</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f1e8]">
                  {assignments.map((a) => (
                    <tr key={a.assignment_id} className="hover:bg-[#fdfbf7]">
                      <td className="py-3 px-4">
                        <span className="font-black text-[#1e1b14] block">{a.caregiver_name}</span>
                        <span className="text-[11px] text-[#7b776c]">{a.caregiver_phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1e1b14] block">{a.patient_name}</span>
                        <span className="text-[11px] text-[#7b776c]">{a.patient_place}</span>
                      </td>
                      <td className="py-3 px-4 text-[#7b776c]">
                        {a.assigned_at?.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${
                          a.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : a.status === 'Completed'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {a.status === 'Active' && (
                          <button
                            onClick={() => handleEndAssignment(a.assignment_id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                          >
                            End Care
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#e9e2d5] space-y-2 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-60" />
              <h3 className="font-extrabold text-sm text-[#1e1b14]">No Caregiver Complaints Found</h3>
              <p className="text-xs text-[#7b776c]">All caregiver grievances have been resolved or none are open.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((comp) => {
                const isResolved = comp.status === 'Resolved';
                return (
                  <div
                    key={comp.complaint_id}
                    className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0ece1] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-[#1e1b14]">{comp.subject}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                            {comp.category}
                          </span>
                        </div>
                        <p className="text-xs text-[#7b776c] mt-0.5">
                          Submitted by <strong>{comp.caregiver_name}</strong> ({comp.caregiver_email}) on {comp.created_at?.slice(0, 10)}
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full self-start sm:self-auto border ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {comp.status}
                      </span>
                    </div>

                    <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#4a473d]">
                      <p>{comp.description}</p>
                    </div>

                    {comp.attachment_path && (
                      <a
                        href={`/media/${comp.attachment_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#645e45] hover:underline bg-[#f8f3eb] px-3 py-1.5 rounded-lg border border-[#e8dccb]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Complaint Attachment</span>
                      </a>
                    )}

                    {isResolved ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                        <strong className="block font-black text-[11px] uppercase tracking-wider text-emerald-950">
                          Resolved by {comp.resolved_by_nurse_name || 'Nurse'} on {comp.resolved_at?.slice(0, 10)}
                        </strong>
                        <p>{comp.resolution_notes}</p>
                      </div>
                    ) : (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setResolveComplaintModal(comp)}
                          className="px-4 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          Review & Resolve Complaint
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW CAREGIVER DETAILS */}
      {selectedCaregiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-5 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f4ede0] text-[#645e45] flex items-center justify-center font-bold">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1e1b14]">
                    Caregiver Profile: {selectedCaregiverModal.name}
                  </h3>
                  <p className="text-[11px] text-[#7b776c]">
                    Status: <strong>{selectedCaregiverModal.verification_status}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCaregiverModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0]">
                  <span className="text-[#7b776c] block text-[10px] uppercase font-bold">Phone Number</span>
                  <strong className="text-xs text-[#1e1b14]">{selectedCaregiverModal.phone || 'N/A'}</strong>
                </div>
                <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0]">
                  <span className="text-[#7b776c] block text-[10px] uppercase font-bold">Email Address</span>
                  <strong className="text-xs text-[#1e1b14] truncate block">{selectedCaregiverModal.email}</strong>
                </div>
              </div>

              <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-1">
                <span className="text-[#7b776c] block text-[10px] uppercase font-bold">Location & Address</span>
                <p className="text-xs text-[#1e1b14]">
                  {selectedCaregiverModal.house_name}, {selectedCaregiverModal.place}, {selectedCaregiverModal.panchayath} - Ward {selectedCaregiverModal.ward_no}, {selectedCaregiverModal.pincode}
                </p>
              </div>

              <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-1">
                <span className="text-[#7b776c] block text-[10px] uppercase font-bold">Qualifications & Certifications</span>
                <p className="text-xs text-[#1e1b14]">
                  <strong>Qualifications:</strong> {selectedCaregiverModal.qualifications || 'None listed'}<br />
                  <strong>Certifications:</strong> {selectedCaregiverModal.certifications || 'None listed'}<br />
                  <strong>Specialization:</strong> {selectedCaregiverModal.specialization || 'General Care'}
                </p>
              </div>

              {selectedCaregiverModal.identity_proof_path && (
                <div className="pt-2">
                  <a
                    href={`/api/auth/documents/view/?type=caregiver_identity_proof&id=${selectedCaregiverModal.caregiver_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#645e45] hover:underline bg-[#f8f3eb] px-3 py-2 rounded-xl border border-[#e8dccb] w-full justify-center"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Uploaded Identity Proof Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#fcfaf6] border-t border-[#e9e2d5] flex justify-end space-x-2">
              <button
                onClick={() => setSelectedCaregiverModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              {selectedCaregiverModal.verification_status === 'Pending' && (
                <>
                  <button
                    onClick={() => {
                      setRejectCaregiverModal(selectedCaregiverModal);
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-xl text-xs border border-rose-200"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => {
                      setApproveConfirmCaregiver(selectedCaregiverModal);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs"
                  >
                    Approve Application
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE CONFIRMATION */}
      {approveConfirmCaregiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-[#1e1b14]">
                Approve {approveConfirmCaregiver.name}?
              </h3>
              <p className="text-xs text-[#7b776c] leading-relaxed">
                Approving this caregiver will activate their account, grant portal access, send an official confirmation email, and make them visible for patient care requests.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                onClick={() => setApproveConfirmCaregiver(null)}
                disabled={isActionLoading}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveCaregiver}
                disabled={isActionLoading}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT WITH MANDATORY REASON */}
      {rejectCaregiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleRejectCaregiver} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-[#1e1b14]">
                Reject Caregiver Application
              </h3>
              <p className="text-xs text-[#7b776c]">
                Please provide a mandatory reason for rejecting {rejectCaregiverModal.name}'s registration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="E.g., Incomplete identity verification document or lack of required palliative certifications..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => {
                  setRejectCaregiverModal(null);
                  setRejectionReason('');
                }}
                disabled={isActionLoading}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading || !rejectionReason.trim()}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Reject Caregiver</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: RESOLVE COMPLAINT */}
      {resolveComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleResolveComplaint} className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <div>
                <h3 className="font-black text-sm text-[#1e1b14]">
                  Resolve Complaint: {resolveComplaintModal.subject}
                </h3>
                <p className="text-xs text-[#7b776c]">
                  Filed by {resolveComplaintModal.caregiver_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolveComplaintModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#4a473d]">
              <strong>Complaint Description:</strong>
              <p className="mt-1">{resolveComplaintModal.description}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1e1b14] block">
                Resolution Notes & Follow-up Action <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the resolution action taken or guidance provided to the caregiver..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-3 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setResolveComplaintModal(null)}
                disabled={isActionLoading}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading || !resolutionNotes.trim()}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Mark Resolved</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: MANUAL ASSIGNMENT */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleCreateAssignment} className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">
                Manual Caregiver Assignment
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Select Approved Caregiver <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={selectedAssignCaregiverId}
                  onChange={(e) => setSelectedAssignCaregiverId(e.target.value)}
                  className="w-full p-2.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
                >
                  <option value="">-- Choose Caregiver --</option>
                  {approvedCaregivers.map((cg) => (
                    <option key={cg.caregiver_id} value={cg.caregiver_id}>
                      {cg.name} ({cg.specialization || 'Caregiver'} - {cg.place})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1e1b14] block mb-1">
                  Select Registered Patient <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={selectedAssignPatientId}
                  onChange={(e) => setSelectedAssignPatientId(e.target.value)}
                  className="w-full p-2.5 bg-[#fcfaf6] border border-[#e0d9cc] rounded-xl text-xs text-[#1e1b14] focus:outline-none focus:border-[#645e45]"
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} ({p.place || 'Patient'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0ece1]">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={isActionLoading}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-5 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Assign Caregiver</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
