import React from 'react';
import {
  UserCheck,
  Eye,
  CheckCircle2,
  ArrowRight,
  Clock,
  FileText,
} from 'lucide-react';

export default function AdminActionQueue({
  pendingCaregivers = [],
  onReviewCaregiver,
  onNavigate,
}) {
  const caregiverCount = pendingCaregivers.length;

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f2ece1]">
        <div>
          <h3 className="font-extrabold text-base text-[#1e1b14]">
            Caregiver Verification Queue
          </h3>
          <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
            Caregiver identity proof documents awaiting administrative credential review
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-1.5">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pending Verifications</span>
            {caregiverCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-[#ba1a1a] text-white">
                {caregiverCount}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Queue Content */}
      <div className="mt-4">
        {pendingCaregivers.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-extrabold text-sm text-[#1e1b14]">
              All Caregiver Verifications Complete
            </h4>
            <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
              There are currently no pending caregiver identity proof documents requiring verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  <th className="py-2.5 px-3 font-extrabold">Caregiver Name</th>
                  <th className="py-2.5 px-3 font-extrabold">Contact & Place</th>
                  <th className="py-2.5 px-3 font-extrabold">Identity Proof</th>
                  <th className="py-2.5 px-3 font-extrabold">Status</th>
                  <th className="py-2.5 px-3 font-extrabold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {pendingCaregivers.map((cg) => (
                  <tr key={cg.caregiver_id} className="hover:bg-[#faf7f0] transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-[#1e1b14]">{cg.name}</p>
                      <p className="text-[11px] text-[#7b776c]">{cg.email}</p>
                    </td>
                    <td className="py-3 px-3 text-[#4a473d]">
                      <p className="font-medium">{cg.phone || 'N/A'}</p>
                      <p className="text-[11px] text-[#7b776c]">
                        {cg.place}, {cg.panchayath}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      {cg.identity_proof_url ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#645e45] bg-[#f4ede0] px-2 py-0.5 rounded-md border border-[#e0d9cc]">
                          <FileText className="w-3 h-3" />
                          <span>Uploaded</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-bold">Pending Upload</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>Pending Review</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onReviewCaregiver(cg)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#f2ece1] flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('caregiver_verification')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
          >
            <span>View All Caregivers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

