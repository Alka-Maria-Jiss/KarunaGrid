import React from 'react';
import { Pill, FileSpreadsheet, ArrowRight, Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function PatientRecentRecords({
  records = [],
  onNavigate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#645e45]" />
          <h2 className="text-sm font-extrabold text-[#1e1b14] uppercase tracking-wider">
            Recent Prescriptions & Reports
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('prescriptions')}
          className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List of 3-4 Recent Records */}
      {records.length === 0 ? (
        <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium">
          No recent prescription or laboratory records found.
        </div>
      ) : (
        <div className="divide-y divide-[#f2ece1]">
          {records.map((rec) => {
            const isRx = rec.type === 'Prescription';
            const Icon = isRx ? Pill : FileSpreadsheet;

            return (
              <div
                key={rec.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-[#fdfbf7] px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 ${
                      isRx
                        ? 'bg-[#f5f1ea] text-[#695e3d] border-[#e7ded0]'
                        : 'bg-[#edf3ec] text-[#426442] border-[#d2e2d0]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-[#1e1b14] truncate">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-[#7b776c] font-medium">
                      {rec.type} • {rec.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                      rec.status === 'Active' || rec.status === 'Reviewed'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {rec.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(isRx ? 'prescriptions' : 'lab_reports')}
                    className="p-1.5 rounded-lg text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
