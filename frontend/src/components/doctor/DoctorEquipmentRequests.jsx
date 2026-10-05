import React, { useState, useEffect } from 'react';
import { Boxes, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, User } from 'lucide-react';

export default function DoctorEquipmentRequests() {
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
      const res = await fetch('http://127.0.0.1:8000/api/resources/doctor/equipment-requests/', {
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
      console.error('Error fetching equipment requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/resources/doctor/equipment-requests/${requestId}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Equipment request clinically approved.', type: 'success' });
        fetchRequests();
      } else {
        setMessage({ text: data.detail || 'Failed to approve request.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error approving request.', type: 'error' });
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
      const res = await fetch(`http://127.0.0.1:8000/api/resources/doctor/equipment-requests/${selectedRequest.request_id}/review/`, {
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
        setMessage({ text: data.message || 'Equipment request rejected.', type: 'success' });
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRequests();
      } else {
        setMessage({ text: data.errors?.rejection_reason?.[0] || data.detail || 'Failed to reject.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error rejecting equipment request.', type: 'error' });
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
            <Boxes className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Assistive Medical Equipment Clinical Evaluation
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Review patient assistive device requests and approve clinical necessity. (Physical unit allocation is managed by Administrator).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
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

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading equipment requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Boxes className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No equipment requests pending clinical evaluation.</p>
            <p>Oxygen concentrators, hospital beds, and mobility aid requests will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Requested Equipment</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Request Date</th>
                  <th className="py-3.5 px-4">Clinical Approval</th>
                  <th className="py-3.5 px-4">Admin Delivery Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-[#fdfbf7] transition-colors">
                    <td className="py-3.5 px-4 font-black">{req.equipment_type_name}</td>
                    <td className="py-3.5 px-4 font-bold text-[#1e1b14]">{req.patient_name}</td>
                    <td className="py-3.5 px-4 font-medium text-[#7b776c]">{req.requested_at}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          req.doctor_approval_status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : req.doctor_approval_status === 'Rejected'
                            ? 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {req.doctor_approval_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4a473d]">{req.delivery_status}</td>
                    <td className="py-3.5 px-4 text-right">
                      {req.doctor_approval_status === 'Pending' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req.request_id)}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-[#426442] text-white hover:bg-[#324e32] transition-colors cursor-pointer shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc] hover:bg-[#ebd4cc] transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#7b776c] font-semibold">Evaluated</span>
                      )}
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
              <h3 className="text-sm font-black text-[#1e1b14]">Reject Equipment Request</h3>
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
                <label className="block font-bold text-[#ba1a1a] mb-1">Mandatory Clinical Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this medical device is clinically unnecessary or inappropriate..."
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
