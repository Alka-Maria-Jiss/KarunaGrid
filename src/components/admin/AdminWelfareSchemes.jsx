import React, { useState } from 'react';
import {
  ScrollText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  Eye,
  CheckCircle2,
  X,
  FileCheck2,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminWelfareSchemes({
  schemes = [],
  applications = [],
  onRefresh,
  initialTab = 'schemes',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [reviewingApp, setReviewingApp] = useState(null);
  const [newAppStatus, setNewAppStatus] = useState('Approved');
  const [appRemarks, setAppRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Scheme Create/Edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [requiredDocs, setRequiredDocs] = useState('');
  const [appLink, setAppLink] = useState('');

  const { showSuccess, showError } = useToast();

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setEligibility('');
    setRequiredDocs('');
    setAppLink('');
    setEditingScheme(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingScheme(s);
    setName(s.name);
    setDescription(s.description || '');
    setEligibility(s.eligibility_criteria || '');
    setRequiredDocs(s.required_documents || '');
    setAppLink(s.application_link || '');
    setShowCreateModal(true);
  };

  const handleSchemeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        eligibility_criteria: eligibility.trim(),
        required_documents: requiredDocs.trim(),
        application_link: appLink.trim(),
      };

      if (editingScheme) {
        await apiClient.put(`/admin/welfare-schemes/${editingScheme.scheme_id}/`, payload);
        showSuccess('Welfare scheme updated successfully!');
      } else {
        await apiClient.post('/admin/welfare-schemes/', payload);
        showSuccess('Welfare scheme created successfully!');
      }

      setShowCreateModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to save welfare scheme.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScheme = async (scheme_id, scheme_name) => {
    if (!window.confirm(`Are you sure you want to delete scheme "${scheme_name}"?`)) return;
    try {
      await apiClient.delete(`/admin/welfare-schemes/${scheme_id}/`);
      showSuccess(`Scheme "${scheme_name}" deleted.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to delete scheme.');
    }
  };

  const handleReviewAppSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/admin/welfare-applications/${reviewingApp.application_id}/review/`, {
        status: newAppStatus,
        remarks: appRemarks.trim(),
      });
      showSuccess(`Application #${reviewingApp.application_id} updated to ${newAppStatus}.`);
      setReviewingApp(null);
      setAppRemarks('');
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update application status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSchemes = schemes.filter(
    (s) =>
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApps = applications.filter(
    (a) =>
      !searchQuery ||
      a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.scheme_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Government Welfare Schemes & Applications
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f8f3eb] text-[#7a6449] rounded-full border border-[#e8dccb]">
              {schemes.length} Active Schemes
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Administer state palliative aid schemes, eligibility policies, and submitted beneficiary applications
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Welfare Scheme</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <span>Welfare Schemes ({schemes.length})</span>
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
            <span>Submitted Applications ({applications.length})</span>
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes or applicants..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* TAB 1: SCHEMES LIST */}
      {activeTab === 'schemes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.scheme_id}
              className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-[#1e1b14]">
                    {scheme.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(scheme)}
                      className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors cursor-pointer"
                      title="Edit Scheme"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheme(scheme.scheme_id, scheme.name)}
                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Scheme"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#4a473d] leading-relaxed">
                  {scheme.description || 'No detailed description provided.'}
                </p>

                <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1 text-xs">
                  <p className="text-[11px] font-extrabold text-[#645e45]">
                    Eligibility Criteria:
                  </p>
                  <p className="text-[#4a473d] text-[11px]">
                    {scheme.eligibility_criteria || 'General Palliative Criteria'}
                  </p>

                  <p className="text-[11px] font-extrabold text-[#645e45] pt-1">
                    Required Documents:
                  </p>
                  <p className="text-[#4a473d] text-[11px]">
                    {scheme.required_documents || 'Discharge Summary, Ration Card'}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#f2ece1] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#7b776c]">
                  Created: {scheme.created_at}
                </span>
                {scheme.application_link && (
                  <a
                    href={scheme.application_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#645e45] hover:underline"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: APPLICATIONS LIST */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
          {filteredApps.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
              No submitted welfare applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                    <th className="py-3 px-4 font-extrabold">App ID</th>
                    <th className="py-3 px-4 font-extrabold">Patient Details</th>
                    <th className="py-3 px-4 font-extrabold">Welfare Scheme</th>
                    <th className="py-3 px-4 font-extrabold">Submitted Documents</th>
                    <th className="py-3 px-4 font-extrabold">Status</th>
                    <th className="py-3 px-4 font-extrabold text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1]">
                  {filteredApps.map((app) => (
                    <tr key={app.application_id} className="hover:bg-[#faf7f0] transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#7b776c]">
                        #{app.application_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-[#1e1b14]">{app.patient_name}</p>
                        <p className="text-[11px] text-[#7b776c]">{app.patient_registration_id}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#4a473d]">
                        {app.scheme_name}
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
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
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingApp(app);
                            setNewAppStatus(app.status || 'Approved');
                            setAppRemarks(app.remarks || '');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
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
        </div>
      )}

      {/* CREATE / EDIT SCHEME MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSchemeSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                {editingScheme ? 'Edit Welfare Scheme' : 'Create New Welfare Scheme'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Scheme Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karunya Benevolent Fund"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Scheme Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Financial and medical subsidy details..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Eligibility Criteria
                </label>
                <textarea
                  rows={2}
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. BPL ration card, palliative clinical recommendation..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Required Documents
                </label>
                <input
                  type="text"
                  value={requiredDocs}
                  onChange={(e) => setRequiredDocs(e.target.value)}
                  placeholder="e.g. Income Certificate, Ration Card, Medical Board Certificate"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Official Government Application Link
                </label>
                <input
                  type="url"
                  value={appLink}
                  onChange={(e) => setAppLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Saving...' : editingScheme ? 'Update Scheme' : 'Publish Scheme'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW APPLICATION MODAL */}
      {reviewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleReviewAppSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Review Welfare Application
              </h3>
              <button
                type="button"
                onClick={() => setReviewingApp(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                <p><strong>Patient:</strong> {reviewingApp.patient_name} ({reviewingApp.patient_registration_id})</p>
                <p><strong>Scheme:</strong> {reviewingApp.scheme_name}</p>
                <p><strong>Submitted On:</strong> {reviewingApp.submitted_at}</p>
                <p><strong>Attached Documents:</strong> {reviewingApp.submitted_documents || 'None'}</p>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Update Application Status
                </label>
                <select
                  value={newAppStatus}
                  onChange={(e) => setNewAppStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  <option value="Submitted">Submitted (Pending)</option>
                  <option value="UnderReview">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Administrator Remarks & Directives
                </label>
                <textarea
                  rows={3}
                  value={appRemarks}
                  onChange={(e) => setAppRemarks(e.target.value)}
                  placeholder="Enter notes, sanctioned amount, or rejection feedback..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingApp(null)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Application Decision'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
