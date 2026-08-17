import React, { useState } from 'react';
import { FileSpreadsheet, Search, Eye, Download, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function PatientLabReportsView({
  reports = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.remarks?.toLowerCase().includes(q) || r.review_status?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Diagnostic Laboratory Reports
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
              {reports.length} Reports
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Diagnostic test findings, laboratory investigations, and physician clinical reviews
          </p>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report remarks..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <FileSpreadsheet className="w-10 h-10 text-[#426442] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Laboratory Reports Available
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            Diagnostic laboratory reports uploaded by your clinical care team will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.report_id}
              className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#1e1b14]">
                        {report.remarks || 'Diagnostic Lab Investigation'}
                      </h4>
                      <p className="text-[11px] text-[#7b776c]">
                        Report Date: {report.report_date}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                      report.review_status === 'Reviewed'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {report.review_status}
                  </span>
                </div>

                <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#4a473d] space-y-1">
                  <p><strong>Uploaded On:</strong> {report.uploaded_at}</p>
                  <p><strong>Status:</strong> {report.review_status}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f2ece1] flex justify-end">
                {report.file_path ? (
                  <a
                    href={`/api/auth/documents/view/?type=lab_report&id=${report.report_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-[#7b776c] italic">
                    File not attached
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
