import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, User } from 'lucide-react';

export default function DoctorScheduleChanges() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/care-coordination/doctor/schedule-changes/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching schedule change requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (scheduleId) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/doctor/schedule-changes/${scheduleId}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Schedule change approved.', type: 'success' });
        fetchRequests();
      } else {
        setMessage({ text: data.detail || 'Failed to approve schedule change.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error approving schedule change.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/doctor/schedule-changes/${selectedRequest.schedule_id}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Schedule change rejected.', type: 'success' });
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRequests();
      } else {
        setMessage({ text: data.errors?.rejection_reason?.[0] || data.detail || 'Failed to reject.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error rejecting schedule change.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Permanent Schedule Change Requests
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Review and clinically approve or reject permanent recurring home visit frequency changes.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading schedule change requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <CalendarDays className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No schedule change requests pending.</p>
            <p>Permanent recurring schedule modifications will appear here for doctor evaluation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Current Frequency</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {requests.map((r) => (
                  <tr key={r.schedule_id} className="hover:bg-[#fdfbf7] transition-colors">
                    <td className="py-3.5 px-4 font-black">{r.patient_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-bold text-[10px]">
                        {r.patient_reg_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#645e45]">{r.current_frequency}</td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">{r.start_date}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-900 border-emerald-300">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(r.schedule_id)}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-[#426442] text-white hover:bg-[#324e32] transition-colors cursor-pointer shadow-2xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowRejectModal(true);
                          }}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc] hover:bg-[#ebd4cc] transition-colors cursor-pointer"
                        >
                          Reject
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

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1e1b14]">Reject Schedule Change Request</h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#ba1a1a] mb-1">Mandatory Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this recurring schedule change cannot be clinically approved..."
                  className="w-full p-3 rounded-xl bg-white border border-[#ebd4cc] text-xs text-[#1e1b14] placeholder-[#ba1a1a]/50 focus:ring-2 focus:ring-[#ba1a1a] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="px-5 py-2 rounded-xl font-black text-white bg-[#ba1a1a] hover:bg-[#93000a] shadow-2xs cursor-pointer"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
