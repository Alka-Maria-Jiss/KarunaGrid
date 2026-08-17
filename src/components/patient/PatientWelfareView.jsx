import React, { useState, useEffect } from 'react';
import { ScrollText, FileCheck2, ExternalLink, Plus, Search, Eye, CheckCircle2, Clock, X } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientWelfareView({
  initialTab = 'schemes',
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [submittedDocuments, setSubmittedDocuments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchWelfareData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/patient/welfare/');
      setSchemes(res.schemes || []);
      setApplications(res.my_applications || []);
    } catch (err) {
      console.error('Error fetching welfare data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWelfareData();
  }, []);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedScheme) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/patient/welfare/', {
        scheme_id: selectedScheme.scheme_id,
        submitted_documents: submittedDocuments.trim(),
      });
      showSuccess(res.message || 'Welfare application submitted successfully!');
      setShowApplyModal(false);
      setSubmittedDocuments('');
      fetchWelfareData();
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Government Welfare Schemes & Financial Aid
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f8f3eb] text-[#7a6449] rounded-full border border-[#e8dccb]">
              {schemes.length} Schemes Available
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            State and central government palliative grants, medical subsidies, and welfare applications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('schemes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'schemes'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Available Schemes ({schemes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>My Applications ({applications.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AVAILABLE SCHEMES */}
      {activeTab === 'schemes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schemes.map((scheme) => (
            <div
              key={scheme.scheme_id}
              className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-[#1e1b14]">
                    {scheme.name}
                  </h3>
                  {scheme.application_link && (
                    <a
                      href={scheme.application_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#645e45] hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-[#4a473d] leading-relaxed">
                  {scheme.description || 'Palliative patient financial subsidy and medical grant support.'}
                </p>

                <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-1.5 text-xs">
                  <div>
                    <span className="font-bold text-[#645e45] text-[11px] block">
                      Eligibility Criteria:
                    </span>
                    <p className="text-[#7b776c] text-[11px]">
                      {scheme.eligibility_criteria || 'General Palliative Criteria'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[#645e45] text-[11px] block">
                      Required Documents:
                    </span>
                    <p className="text-[#7b776c] text-[11px]">
                      {scheme.required_documents || 'Discharge Summary, Ration Card'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedScheme(scheme);
                    setShowApplyModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Apply for this Scheme
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
          {applications.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#7b776c] font-medium">
              You have not submitted any government welfare applications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                    <th className="py-3 px-4 font-extrabold">Scheme Name</th>
                    <th className="py-3 px-4 font-extrabold">Submitted Date</th>
                    <th className="py-3 px-4 font-extrabold">Documents Reference</th>
                    <th className="py-3 px-4 font-extrabold">Review Status</th>
                    <th className="py-3 px-4 font-extrabold">Admin Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1]">
                  {applications.map((app) => (
                    <tr key={app.application_id} className="hover:bg-[#faf7f0] transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                        {app.scheme_name}
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                        {app.submitted_at}
                      </td>
                      <td className="py-3.5 px-4 text-[#4a473d] max-w-xs truncate">
                        {app.submitted_documents || 'Attached in record'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            app.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : app.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                        {app.remarks || 'Under administrative review'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* APPLY MODAL */}
      {showApplyModal && selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleApplySubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f8f3eb] text-[#7a6449]">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Apply for Scheme
                  </h3>
                  <p className="text-xs text-[#7b776c]">{selectedScheme.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] space-y-1">
                <p><strong>Required Documents:</strong> {selectedScheme.required_documents || 'Discharge summary, ration card'}</p>
                <p><strong>Eligibility:</strong> {selectedScheme.eligibility_criteria || 'General'}</p>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Document References & Notes
                </label>
                <textarea
                  rows={3}
                  value={submittedDocuments}
                  onChange={(e) => setSubmittedDocuments(e.target.value)}
                  placeholder="e.g. Attached BPL Ration Card #12345, verified discharge summary on file..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
