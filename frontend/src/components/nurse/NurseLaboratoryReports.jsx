import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  FileText,
  User
} from 'lucide-react';

export default function NurseLaboratoryReports() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [nurseRemarks, setNurseRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/nurse/lab-reports/?status=${statusFilter}`, {
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
      console.error('Error fetching nurse lab reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsSubmitting(true);
    setFeedback({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/nurse/lab-reports/${selectedReport.report_id}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remarks: nurseRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message || 'Laboratory report reviewed successfully.', type: 'success' });
        setSelectedReport(null);
        setNurseRemarks('');
        fetchReports();
      } else {
        setFeedback({ text: data.detail || 'Review submission failed.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Network error.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDocument = (filePath) => {
    if (!filePath) return;
    const token = localStorage.getItem('access_token');
    const url = `http://127.0.0.1:8000/api/documents/view/?path=${encodeURIComponent(filePath)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e9e2d5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#645e45] text-white flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14] tracking-tight">Laboratory Reports</h2>
            <p className="text-xs font-semibold text-[#7b776c] mt-0.5">
              Review patient diagnostic results, blood panels, and add nursing observations
            </p>
          </div>
        </div>

        <button
          onClick={fetchReports}
          className="p-2.5 rounded-xl border border-[#e9e2d5] text-[#7b776c] hover:text-[#1e1b14] hover:bg-[#f3ede2] self-end md:self-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {feedback.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e2d5] shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#7b776c]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-[#e9e2d5] bg-[#fdfcf9] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
          >
            <option value="all">All Reports</option>
            <option value="Pending">Pending Review</option>
            <option value="Reviewed">Reviewed</option>
          </select>
        </div>

        <span className="text-xs font-bold text-[#7b776c]">
          {reports.length} Report{reports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#e9e2d5] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9e2d5] text-center shadow-xs">
          <FileSpreadsheet className="w-12 h-12 text-[#7b776c]/40 mx-auto mb-3" />
          <h3 className="text-sm font-black text-[#1e1b14]">No laboratory reports found</h3>
          <p className="text-xs text-[#7b776c] mt-1">Uploaded diagnostic tests will appear here for nurse clinical review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((lr) => (
            <div
              key={lr.report_id}
              className="bg-white rounded-2xl p-5 border border-[#e9e2d5] shadow-xs hover:border-[#645e45]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-[#1e1b14]">{lr.patient_name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    lr.review_status === 'Reviewed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {lr.review_status}
                  </span>
                </div>

                <div className="text-xs text-[#7b776c]">
                  <span>Date: <strong className="text-[#1e1b14]">{lr.report_date}</strong></span>
                  <span className="ml-3">Uploaded: {lr.uploaded_at}</span>
                </div>

                {lr.remarks && (
                  <p className="text-xs text-[#4a473d] bg-[#faf8f4] p-2.5 rounded-xl border border-[#f0ece1]">
                    <span className="font-semibold text-[#7b776c]">Remarks: </span>
                    {lr.remarks}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#f0ece1] flex items-center justify-between">
                {lr.file_path ? (
                  <button
                    onClick={() => handleOpenDocument(lr.file_path)}
                    className="text-xs font-bold text-[#645e45] hover:underline flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </button>
                ) : (
                  <span className="text-xs text-[#7b776c]">No document attached</span>
                )}

                <button
                  onClick={() => {
                    setSelectedReport(lr);
                    setNurseRemarks(lr.remarks || '');
                  }}
                  className="px-3.5 py-1.5 bg-[#f3ede2] text-[#645e45] hover:bg-[#645e45] hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  {lr.review_status === 'Reviewed' ? 'Update Remarks' : 'Review & Add Note'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
            <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1e1b14]">Review Lab Report</h2>
                  <p className="text-xs text-[#7b776c]">{selectedReport.patient_name} • {selectedReport.test_name || 'Clinical Lab Record'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e1b14] mb-1">
                  Nurse Clinical Remarks / Observations
                </label>
                <textarea
                  value={nurseRemarks}
                  onChange={(e) => setNurseRemarks(e.target.value)}
                  placeholder="e.g. Hemoglobin levels reviewed prior to palliative visit, alert coordinator if further decline..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#f0ece1]">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !nurseRemarks.trim()}
                  className="px-5 py-2.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
