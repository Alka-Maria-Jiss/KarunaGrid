import React from 'react';
import { Send, ArrowRight, Video, Home, Boxes, ScrollText, CheckCircle2, Clock } from 'lucide-react';

export default function PatientRequests({
  requests = [],
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
            <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
              My Requests
            </h2>
          </div>
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45]">
            {requests.length} Recent
          </span>
        </div>

        {/* List of Requests */}
        {requests.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium">
            You have no recent care requests submitted.
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((req) => {
              const isEquip = req.type?.toLowerCase().includes('equipment');
              const isWelf = req.type?.toLowerCase().includes('welfare');
              const isTele = req.type?.toLowerCase().includes('telemedicine');

              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] flex items-center justify-between gap-3 hover:border-[#e2dec9] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isEquip
                          ? 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]'
                          : isWelf
                          ? 'bg-[#f8f3eb] text-[#7a6449] border-[#e8dccb]'
                          : 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]'
                      }`}
                    >
                      {isEquip ? (
                        <Boxes className="w-4 h-4" />
                      ) : isWelf ? (
                        <ScrollText className="w-4 h-4" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#1e1b14] truncate">
                        {req.type}
                      </h4>
                      <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
                        Requested on {req.date}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex-shrink-0 ${
                      req.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : req.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-[#f2ece1]">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('equipment')}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>Submit New Request</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
