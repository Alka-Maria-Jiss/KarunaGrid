import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink, Eye, Check } from 'lucide-react';

export default function DoctorLaboratoryReports() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/lab-reports/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching lab reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/lab-reports/${selectedReport.report_id}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks: remarks.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Laboratory report reviewed successfully.', type: 'success' });
        setShowReviewModal(false);
        setRemarks('');
        fetchReports();
      } else {
        setMessage({ text: data.detail || 'Failed to submit review.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error reviewing report.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1e1b14]">
                Diagnostic Laboratory Reports Review
              </h2>
              <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                Examine patient-uploaded pathology, hematology, and imaging reports, and record clinical observations.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReports}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
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

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading laboratory reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[#426442] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No laboratory reports awaiting review.</p>
            <p>Uploaded diagnostic investigation records from patients will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Report Date</th>
                  <th className="py-3.5 px-4">Investigation / Test</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Doctor Clinical Remarks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {reports.map((lr) => (
                  <tr key={lr.report_id} className="hover:bg-[#fdfbf7] transition-colors">
                    <td className="py-3.5 px-4 font-black">{lr.report_date}</td>
                    <td className="py-3.5 px-4 font-extrabold text-[#1e1b14]">
                      {lr.investigation_name || lr.file_path}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1e1b14]">{lr.patient_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-bold text-[10px]">
                        {lr.patient_reg_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          lr.review_status === 'Reviewed'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {lr.review_status === 'Reviewed' ? 'Reviewed' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {lr.remarks ? (
                        <p className="text-[11px] text-[#1e1b14] italic truncate">
                          "{lr.remarks}"
                        </p>
                      ) : lr.review_status === 'Reviewed' ? (
                        <span className="text-[11px] text-[#426442] font-medium">Reviewed & verified</span>
                      ) : (
                        <span className="text-[10px] text-[#ba1a1a] font-semibold">Pending review</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`http://127.0.0.1:8000/api/auth/documents/view/?type=lab_report&id=${lr.report_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#fdfbf7] border border-[#e9e2d5] text-[#4a473d] hover:bg-[#f4ede0] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Document</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(lr);
                            setRemarks(lr.remarks || '');
                            setShowReviewModal(true);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-2xs ${
                            lr.review_status === 'Reviewed'
                              ? 'bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white'
                              : 'bg-[#645e45] text-white hover:bg-[#4c472f]'
                          }`}
                        >
                          {lr.review_status === 'Reviewed' ? 'View Review' : 'Review Report'}
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

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#1e1b14]">Review Diagnostic Laboratory Report</h3>
                <p className="text-xs text-[#7b776c]">
                  Patient: <strong className="text-[#1e1b14]">{selectedReport.patient_name}</strong> ({selectedReport.patient_reg_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-[#7b776c] uppercase">Investigation / Test</p>
                    <p className="font-black text-[#1e1b14] text-sm mt-0.5">
                      {selectedReport.investigation_name || 'Diagnostic Laboratory Report'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#7b776c] uppercase">Report Date</p>
                    <p className="font-extrabold text-[#645e45] mt-0.5">{selectedReport.report_date}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f0eae0] flex justify-between items-center">
                  <span className="text-[11px] text-[#7b776c]">Uploaded On: {selectedReport.uploaded_at}</span>
                  <a
                    href={`http://127.0.0.1:8000/api/auth/documents/view/?type=lab_report&id=${selectedReport.report_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#645e45] text-white font-extrabold text-xs hover:bg-[#4d4835] transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Original Document</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold text-[#1e1b14] mb-1">Doctor Clinical Remarks (Optional)</label>
                  <textarea
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter diagnostic evaluation, significant findings, and next clinical steps..."
                    className="w-full p-3 rounded-2xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] placeholder-[#7b776c] focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2ece1]">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 rounded-xl font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl font-black text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? 'Saving...' : 'Mark as Reviewed'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
