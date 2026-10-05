import React from 'react';
import { FileText, CheckCircle2, XCircle, X, ShieldCheck, Phone, MapPin, Award } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CaregiverDetailModal({
  caregiver,
  onClose,
  onApprove,
  onRejectPrompt,
}) {
  const { showError } = useToast();
  if (!caregiver) return null;

  const handleOpenDocument = async (docUrl) => {
    if (!docUrl) return;
    try {
      const token = localStorage.getItem('access_token');
      let fullUrl = docUrl.startsWith('http')
        ? docUrl
        : `http://127.0.0.1:8000${docUrl.startsWith('/') ? '' : '/'}${docUrl}`;

      if (token && !fullUrl.includes('token=')) {
        fullUrl += `${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      }

      const res = await fetch(fullUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        showError('Could not securely access the document.');
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to open document:', err);
      showError('Could not open document. Please check server connection.');
    }
  };

  const isPending = caregiver.verification_status === 'Pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Caregiver Credential Verification
              </h3>
              <p className="text-xs text-[#7b776c]">
                Review caregiver background and identity verification documents
              </p>
            </div>
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
        <div className="space-y-3.5 text-xs text-[#1e1b14]">
          {/* Identity & Contact */}
          <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-sm text-[#1e1b14]">{caregiver.name}</h4>
                <p className="text-[#7b776c] font-semibold">{caregiver.email}</p>
              </div>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                  caregiver.verification_status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : caregiver.verification_status === 'Rejected'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {caregiver.verification_status || 'Pending'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#eee7da] text-[#4a473d]">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#7b776c]" />
                <span>{caregiver.phone || 'Phone not provided'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7b776c]" />
                <span className="truncate">
                  {caregiver.place}, {caregiver.panchayath} (Ward {caregiver.ward_no})
                </span>
              </div>
            </div>
          </div>

          {/* Qualifications & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
              <p className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider mb-1">
                Qualifications & Skills
              </p>
              <p className="font-semibold text-[#1e1b14]">
                {caregiver.qualifications || 'General Home Caregiver'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
              <p className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider mb-1">
                Specialization / Experience
              </p>
              <p className="font-semibold text-[#1e1b14]">
                {caregiver.specialization || 'Palliative & Geriatric Support'}
              </p>
            </div>
          </div>

          {caregiver.rejection_reason && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <p className="font-extrabold text-[11px] mb-0.5">Previous Rejection Reason:</p>
              <p className="font-medium text-xs">{caregiver.rejection_reason}</p>
            </div>
          )}

          {/* Secure Document Section */}
          <div className="p-3.5 rounded-xl border border-[#e9e2d5] bg-white space-y-2">
            <h5 className="font-extrabold text-xs text-[#1e1b14] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#645e45]" />
              <span>Government Identity Proof Document</span>
            </h5>
            <p className="text-[11px] text-[#7b776c]">
              Verify government-issued photo ID (Aadhaar / Voter ID / Nursing Certificate).
            </p>

            {caregiver.identity_proof_url ? (
              <button
                type="button"
                onClick={() => handleOpenDocument(caregiver.identity_proof_url)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Open Secure Identity Proof Document</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-center">
                No identity proof document has been uploaded yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] cursor-pointer"
          >
            Close
          </button>

          {isPending && onApprove && onRejectPrompt && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRejectPrompt(caregiver)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-[#ba1a1a] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={() => onApprove(caregiver)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Verification</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
