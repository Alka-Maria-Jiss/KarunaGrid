import React from 'react';
import { UserCheck, ArrowRight, Eye, Clock, FileText } from 'lucide-react';

export default function PendingRegistrations({
  registrations = [],
  onReview,
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Pending Patient Registrations
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('registration_review')}
            className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Registrations List */}
        {registrations.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium space-y-1">
            <p className="font-bold text-[#1e1b14]">No patient registrations waiting for review.</p>
            <p>New registrations and uploaded discharge summaries will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {registrations.map((p) => (
              <div
                key={p.patient_id}
                className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-3 hover:border-[#e2dec9] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc] flex-shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[#1e1b14] truncate">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
                      App ID: <span className="font-bold text-[#4a473d]">{p.registration_id}</span> • {p.submitted_date}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onReview ? onReview(p) : (onNavigate && onNavigate('registration_review'))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-2xs transition-all cursor-pointer flex-shrink-0"
                >
                  <span>Review</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-[#f2ece1]">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('registration_review')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>Open Full Registration Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
