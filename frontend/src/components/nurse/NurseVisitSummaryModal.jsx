import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  Eye
} from 'lucide-react';

export default function NurseVisitSummaryModal({
  visit,
  onClose,
  onUploaded = () => {},
}) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!visit) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('Selected file exceeds 10MB limit.');
        setFile(null);
        return;
      }
      setErrorMsg('');
      setFile(selected);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a summary document to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('summary_file', file);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/nurse/visits/${visit.occurrence_id}/summary-upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Home visit summary document uploaded successfully.');
        onUploaded(data);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.detail || data.errors?.summary_file?.[0] || 'Upload failed.');
      }
    } catch (err) {
      setErrorMsg('Network error while uploading summary.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e9e2d5] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b14]">Upload Home Visit Summary</h2>
              <p className="text-xs text-[#7b776c]">Attach clinical summary document for {visit.patient_name}&apos;s visit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Patient Details */}
          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e9e2d5] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-[#645e45]" />
              <span className="font-extrabold text-[#1e1b14]">{visit.patient_name}</span>
            </div>
            <span className="font-bold text-[#645e45]">Visit Date: {visit.scheduled_date}</span>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-[#e9e2d5] rounded-2xl p-6 text-center hover:border-[#645e45]/50 transition-colors bg-[#fdfcf9]">
              <input
                type="file"
                id="summary-file-input"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />
              <label htmlFor="summary-file-input" className="cursor-pointer block">
                <UploadCloud className="w-10 h-10 text-[#7b776c]/60 mx-auto mb-2" />
                <p className="text-xs font-extrabold text-[#1e1b14]">
                  {file ? file.name : 'Click to select document or drag and drop'}
                </p>
                <p className="text-[10px] text-[#7b776c] mt-1">
                  Supported formats: PDF, Word, JPEG, PNG (Max: 10MB)
                </p>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="px-6 py-2.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Upload Document</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
