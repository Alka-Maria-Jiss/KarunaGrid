import React, { useState } from 'react';
import { X, FileText, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Download } from 'lucide-react';

export default function DoctorRegistrationDetailModal({
  patient,
  onClose,
  onApprove,
  onReject,
  isProcessing = false,
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  if (!patient) return null;

  const handleApprove = () => {
    setError('');
    if (onApprove) onApprove(patient.patient_id);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setError('A rejection reason is mandatory when rejecting a patient registration.');
      return;
    }
    setError('');
    if (onReject) onReject(patient.patient_id, rejectionReason.trim());
  };

  const docUrl = patient.discharge_summary_path
    ? (patient.discharge_summary_path.startsWith('http') || patient.discharge_summary_path.startsWith('/media/')
        ? patient.discharge_summary_path
        : `/media/${patient.discharge_summary_path}`)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-[#1e1b14]">
              Review Patient Registration
            </h3>
            <p className="text-xs text-[#7b776c] font-medium">
              Registration ID: <span className="font-bold text-[#645e45]">{patient.registration_id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#1e1b14]">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#faf0ec] border border-[#ebd4cc] text-[#ba1a1a] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Full Name</p>
              <p className="font-black text-sm text-[#1e1b14] mt-0.5">{patient.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Gender / DOB</p>
              <p className="font-bold text-[#4a473d] mt-0.5">{patient.gender || 'Not specified'} • {patient.dob || 'DOB N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Phone Number</p>
              <p className="font-bold text-[#4a473d] mt-0.5">{patient.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">House & Place</p>
              <p className="font-bold text-[#4a473d] mt-0.5">{patient.house_name ? `${patient.house_name}, ` : ''}{patient.place || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Panchayath / Ward</p>
              <p className="font-bold text-[#4a473d] mt-0.5">{patient.panchayath || 'N/A'} (Ward {patient.ward_no || 'N/A'})</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#7b776c]">Pincode</p>
              <p className="font-bold text-[#4a473d] mt-0.5">{patient.pincode || 'N/A'}</p>
            </div>
          </div>

          {/* Discharge Summary Document Section */}
          <div className="p-4 rounded-2xl border border-[#e9e2d5] bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#645e45]" />
                <h4 className="font-black text-xs text-[#1e1b14]">
                  Discharge Summary / Referral Document
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#edf3ec] text-[#426442]">
                Mandatory Clinical Document
              </span>
            </div>

            {patient.discharge_summary_path ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
                <div className="min-w-0 pr-3">
                  <p className="font-bold text-[#1e1b14] truncate">
                    {patient.discharge_summary_path.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-[#7b776c]">Hospital referral / clinical discharge record</p>
                </div>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4c472f] transition-all shadow-2xs cursor-pointer flex-shrink-0"
                >
                  <span>View Document</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#faf0ec] border border-[#ebd4cc] text-[#ba1a1a] text-xs font-semibold">
                No discharge summary uploaded for this patient.
              </div>
            )}
          </div>

          {/* Rejection Reason Form (Conditional) */}
          {showRejectInput && (
            <div className="p-4 rounded-2xl bg-[#faf0ec] border border-[#ebd4cc] space-y-2 animate-in fade-in">
              <label className="block text-xs font-black text-[#ba1a1a]">
                Mandatory Clinical Rejection Reason *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify clinical or documentation deficiency why this registration cannot be approved..."
                className="w-full p-3 rounded-xl bg-white border border-[#ebd4cc] text-xs text-[#1e1b14] placeholder-[#ba1a1a]/50 focus:outline-hidden focus:ring-2 focus:ring-[#ba1a1a]"
              />
              <p className="text-[10px] text-[#ba1a1a] font-medium">
                This explanation will be shared with the patient and recorded in the system audit log.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!showRejectInput ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#ba1a1a] bg-[#faf0ec] hover:bg-[#ebd4cc] border border-[#ebd4cc] transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Registration</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#426442] hover:bg-[#324e32] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Processing...' : 'Approve Registration'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectionReason('');
                    setError('');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#ba1a1a] hover:bg-[#93000a] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
