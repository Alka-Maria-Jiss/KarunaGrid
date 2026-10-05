import React, { useState } from 'react';
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  MapPin,
  Phone,
  Filter,
} from 'lucide-react';
import CaregiverDetailModal from './CaregiverDetailModal';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminCaregiverVerification({
  caregivers = [],
  pendingCaregivers = [],
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [rejectingCaregiver, setRejectingCaregiver] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  // Combine or filter data based on status
  let displayList = [];
  if (statusFilter === 'pending') {
    displayList = pendingCaregivers;
  } else if (statusFilter === 'all') {
    displayList = caregivers;
  } else {
    displayList = caregivers.filter(
      (c) => (c.details?.verification_status || '').toLowerCase() === statusFilter.toLowerCase()
    );
  }

  const filteredList = displayList.filter((cg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cg.name?.toLowerCase().includes(q) ||
      cg.email?.toLowerCase().includes(q) ||
      cg.phone?.toLowerCase().includes(q) ||
      cg.place?.toLowerCase().includes(q)
    );
  });

  const handleApprove = async (caregiver) => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/admin/caregivers/${caregiver.caregiver_id}/approve/`);
      showSuccess(res.message || `Caregiver ${caregiver.name} approved successfully.`);
      if (selectedCaregiver?.caregiver_id === caregiver.caregiver_id) {
        setSelectedCaregiver(null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to approve caregiver.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError('Please provide a specific rejection reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post(
        `/admin/caregivers/${rejectingCaregiver.caregiver_id}/reject/`,
        { rejection_reason: rejectionReason.trim() }
      );
      showSuccess(res.message || 'Caregiver verification rejected.');
      setRejectingCaregiver(null);
      setRejectionReason('');
      if (selectedCaregiver?.caregiver_id === rejectingCaregiver.caregiver_id) {
        setSelectedCaregiver(null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to reject caregiver verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Caregiver Identity & Credential Verification
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#faf0ec] text-[#9c4c37] rounded-full border border-[#ebd4cc]">
              {pendingCaregivers.length} Pending
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Review uploaded government identity documents and approve caregivers for patient assignment
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'pending', label: 'Pending Verification', count: pendingCaregivers.length },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Caregivers' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#645e45] text-white shadow-2xs'
                  : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                    statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#ba1a1a] text-white'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search caregiver name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Grid of Caregiver Cards */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Caregiver Verification Records
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            No caregiver applications found matching the current filter: {statusFilter.toUpperCase()}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((cg) => {
            const status = cg.verification_status || cg.details?.verification_status || 'Pending';
            const isPending = status === 'Pending';

            return (
              <div
                key={cg.caregiver_id || cg.user_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-[#1e1b14]">{cg.name}</h4>
                      <p className="text-xs text-[#7b776c] font-medium">{cg.email}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                        status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : status === 'Rejected'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-[#4a473d] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#7b776c]" />
                      <span>{cg.phone || 'Phone not provided'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7b776c]" />
                      <span className="truncate">
                        {cg.place || 'N/A'}, {cg.panchayath || ''}
                      </span>
                    </div>
                    {cg.qualifications && (
                      <p className="pt-1 text-[11px] text-[#7b776c] border-t border-[#eee7da]">
                        <strong>Qualification:</strong> {cg.qualifications}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-[#f2ece1] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCaregiver(cg)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Proof</span>
                  </button>

                  {isPending && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRejectingCaregiver(cg)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#ba1a1a] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(cg)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedCaregiver && (
        <CaregiverDetailModal
          caregiver={selectedCaregiver}
          onClose={() => setSelectedCaregiver(null)}
          onApprove={handleApprove}
          onRejectPrompt={(cg) => {
            setSelectedCaregiver(null);
            setRejectingCaregiver(cg);
          }}
        />
      )}

      {/* REJECTION REASON FORM MODAL */}
      {rejectingCaregiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#ba1a1a] flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Reject Caregiver Verification
              </h3>
              <button
                type="button"
                onClick={() => setRejectingCaregiver(null)}
                className="text-[#7b776c] hover:text-[#1e1b14] font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#4a473d]">
              Rejecting identity verification for <strong>{rejectingCaregiver.name}</strong>. Please enter the specific reason:
            </p>

            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Uploaded government identity proof document is illegible or blurry. Please upload a clear color copy."
              className="w-full p-3 text-xs border border-[#e0d9cc] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#ba1a1a]"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2ece1]">
              <button
                type="button"
                onClick={() => setRejectingCaregiver(null)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#ba1a1a] hover:bg-[#961515] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
