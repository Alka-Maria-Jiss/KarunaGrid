import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Eye,
  Plus,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export default function PatientLabReportsView({
  reports = [],
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form State
  const [investigationName, setInvestigationName] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.investigation_name?.toLowerCase().includes(q) ||
      r.remarks?.toLowerCase().includes(q) ||
      r.review_status?.toLowerCase().includes(q) ||
      r.report_date?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'All' ||
      r.review_status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenUpload = () => {
    setInvestigationName('');
    setReportDate(new Date().toISOString().split('T')[0]);
    setSelectedFile(null);
    setErrorMessage('');
    setSuccessMessage('');
    setShowUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)) {
      setErrorMessage('Please select a valid PDF, JPEG, PNG, or WEBP file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size must be under 15MB.');
      setSelectedFile(null);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!investigationName.trim()) {
      setErrorMessage('Please enter the investigation or test name.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Please select a laboratory report document.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('investigation_name', investigationName.trim());
      formData.append('report_date', reportDate);
      formData.append('file', selectedFile);

      const res = await fetch('http://127.0.0.1:8000/api/auth/patient/lab-reports/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Laboratory report uploaded successfully.');
        setTimeout(() => {
          setShowUploadModal(false);
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        const err =
          data.errors?.investigation_name?.[0] ||
          data.errors?.file?.[0] ||
          data.detail ||
          'Failed to upload laboratory report.';
        setErrorMessage(err);
      }
    } catch (err) {
      setErrorMessage('Network error occurred while uploading report.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
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
                Upload your laboratory investigations and view attending physician clinical reviews
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#645e45] text-white hover:bg-[#4d4835] transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Laboratory Report</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by test name, remarks, or date..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#e9e2d5] rounded-xl text-[#1e1b14] placeholder-[#7b776c] focus:outline-hidden focus:ring-2 focus:ring-[#645e45]"
          />
        </div>

        <div className="flex items-center gap-2">
          {['All', 'Pending', 'Reviewed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#645e45] text-white shadow-2xs'
                  : 'bg-white text-[#4a473d] border border-[#e9e2d5] hover:bg-[#fdfbf7]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <FileSpreadsheet className="w-12 h-12 text-[#645e45] mx-auto opacity-70" />
          <div className="space-y-1">
            <h4 className="font-black text-base text-[#1e1b14]">
              No Laboratory Reports Found
            </h4>
            <p className="text-xs text-[#7b776c] max-w-md mx-auto">
              Upload your laboratory test documents (e.g. CBC, Liver Function, Blood Sugar) so your palliative doctor can review them.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white transition-all cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Your First Report</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const isReviewed = report.review_status === 'Reviewed';
            return (
              <div
                key={report.report_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-[#645e45] transition-all"
              >
                <div className="space-y-3">
                  {/* Top Row: Icon, Title, Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0] flex-shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-sm text-[#1e1b14] leading-tight">
                          {report.investigation_name || 'Diagnostic Lab Investigation'}
                        </h4>
                        <p className="text-[11px] text-[#7b776c] font-medium">
                          Report Date: <strong className="text-[#1e1b14]">{report.report_date}</strong>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex-shrink-0 ${
                        isReviewed
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {isReviewed ? 'Reviewed' : 'Pending Review'}
                    </span>
                  </div>

                  {/* Upload details */}
                  <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#4a473d] space-y-1">
                    <p className="flex justify-between">
                      <span className="text-[#7b776c] font-bold">Uploaded On:</span>
                      <span className="font-semibold text-[#1e1b14]">{report.uploaded_at}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-[#7b776c] font-bold">Review Status:</span>
                      <span className="font-semibold text-[#1e1b14]">{report.review_status}</span>
                    </p>
                  </div>

                  {/* Doctor's Review Remarks (if reviewed) */}
                  {isReviewed ? (
                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-[11px]">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Doctor's Clinical Review</span>
                      </div>
                      {report.reviewed_by && (
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          Reviewed by: {report.reviewed_by}
                          {report.reviewed_at ? ` on ${report.reviewed_at}` : ''}
                        </p>
                      )}
                      {report.remarks ? (
                        <p className="text-xs text-[#1e1b14] font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-emerald-100">
                          "{report.remarks}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-800 italic">Report reviewed and verified.</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                      <span className="text-[11px] font-medium">
                        Awaiting clinical review by attending doctor.
                      </span>
                    </div>
                  )}
                </div>

                {/* View Document Action */}
                <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
                  <a
                    href={`http://127.0.0.1:8000/api/auth/documents/view/?type=lab_report&id=${report.report_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white rounded-xl transition-all shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD LABORATORY REPORT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#edf3ec] text-[#426442]">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-[#1e1b14]">Upload Laboratory Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold text-[#1e1b14]">
                  Investigation / Test Name *
                </label>
                <input
                  type="text"
                  required
                  value={investigationName}
                  onChange={(e) => setInvestigationName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC), Liver Function Test..."
                  className="w-full p-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] placeholder-[#7b776c] focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[#1e1b14]">
                  Report Date *
                </label>
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[#1e1b14]">
                  Laboratory Document File *
                </label>
                <div className="p-4 border-2 border-dashed border-[#e9e2d5] hover:border-[#645e45] rounded-2xl bg-[#fdfbf7] text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-[#645e45] mx-auto opacity-80" />
                  <p className="text-xs font-bold text-[#1e1b14]">
                    {selectedFile ? selectedFile.name : 'Choose file or drag & drop here'}
                  </p>
                  <p className="text-[10px] text-[#7b776c]">
                    Supported formats: PDF, JPEG, PNG, WEBP (Max 15MB)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !investigationName.trim() || !selectedFile}
                  className="px-5 py-2 rounded-xl font-black text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Uploading...' : 'Upload Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
