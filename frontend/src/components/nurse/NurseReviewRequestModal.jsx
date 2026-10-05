import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Loader2,
  MapPin,
  Phone
} from 'lucide-react';

export default function NurseReviewRequestModal({
  request,
  onClose,
  onApproved = () => {},
  onRescheduled = () => {},
}) {
  const [activeAction, setActiveAction] = useState('approve'); // 'approve' | 'reschedule'
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!request) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/additional-requests/${request.occurrence_id}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        onApproved(data);
        onClose();
      } else {
        setErrorMsg(data.detail || 'Failed to approve request.');
      }
    } catch (err) {
      setErrorMsg('Network error while approving visit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleDate) {
      setErrorMsg('Please select a new date for rescheduling.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/additional-requests/${request.occurrence_id}/reschedule/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_date: rescheduleDate,
          notes: rescheduleNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onRescheduled(data);
        onClose();
      } else {
        setErrorMsg(data.detail || (data.errors?.new_date?.[0]) || 'Failed to reschedule request.');
      }
    } catch (err) {
      setErrorMsg('Network error while rescheduling visit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fff7ed] text-amber-800 flex items-center justify-center font-black">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b14]">Review Additional Visit Request</h2>
              <p className="text-xs text-[#7b776c]">One-time visit review by authorized Nurse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Details */}
          <div className="p-4 rounded-2xl bg-[#faf8f4] border border-[#e9e2d5] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-[#645e45]" />
                <span className="font-extrabold text-sm text-[#1e1b14]">{request.patient_name}</span>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {request.priority || 'Routine'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#4a473d] pt-1">
              <div>
                <span className="text-[#7b776c]">Requested Date: </span>
                <strong className="text-[#1e1b14]">{request.requested_date}</strong>
              </div>
              <div>
                <span className="text-[#7b776c]">Phone: </span>
                <span className="font-medium">{request.patient_phone || 'N/A'}</span>
              </div>
            </div>

            <div className="text-xs text-[#4a473d] pt-1 border-t border-[#ede7db]">
              <span className="text-[#7b776c] font-semibold">Clinical Reason: </span>
              <span>{request.reason}</span>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex rounded-xl bg-[#f3ede2] p-1">
            <button
              onClick={() => setActiveAction('approve')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                activeAction === 'approve'
                  ? 'bg-white text-[#645e45] shadow-xs'
                  : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              Approve Visit Date
            </button>
            <button
              onClick={() => setActiveAction('reschedule')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                activeAction === 'reschedule'
                  ? 'bg-white text-[#645e45] shadow-xs'
                  : 'text-[#7b776c] hover:text-[#1e1b14]'
              }`}
            >
              Reschedule Visit
            </button>
          </div>

          {/* Action Body */}
          {activeAction === 'approve' ? (
            <div className="space-y-4">
              <p className="text-xs text-[#4a473d] leading-relaxed">
                Approving this request confirms the scheduled date of <strong className="text-[#1e1b14]">{request.requested_date}</strong>. The visit will be placed into the available allocation queue for nursing care.
              </p>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm & Approve</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e1b14] mb-1">
                  New Visit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1e1b14] mb-1">
                  Nurse Clinical Notes / Reschedule Reason
                </label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Adjusted to coordinate with palliative nurse visit round..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-800 text-white text-xs font-bold rounded-xl hover:bg-amber-900 transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                  <span>Reschedule & Approve</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
