import React, { useState } from 'react';
import {
  ScrollText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Building2,
  PhoneCall,
  FileText,
  ShieldCheck,
  X,
  AlertCircle,
  Filter,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const SCHEME_CATEGORIES = [
  'All Categories',
  'Financial Aid',
  'Medical Subsidies',
  'Disability Support',
  'Palliative Grants',
  'Pension & Social Security',
  'Assistive Aid',
  'Senior Support',
  'Other Support',
];

export default function AdminWelfareSchemes({
  schemes = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'published', 'draft', 'unpublished'
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Financial Aid');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [requiredDocs, setRequiredDocs] = useState('');
  const [instructions, setInstructions] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');
  const [department, setDepartment] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [formError, setFormError] = useState('');

  const { showSuccess, showError } = useToast();

  const handleOpenCreate = () => {
    setEditingScheme(null);
    setName('');
    setCategory('Financial Aid');
    setDescription('');
    setBenefits('');
    setEligibility('');
    setRequiredDocs('');
    setInstructions('');
    setOfficialUrl('');
    setDepartment('');
    setContactInfo('');
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingScheme(s);
    setName(s.name || '');
    setCategory(s.category || 'Financial Aid');
    setDescription(s.description || '');
    setBenefits(s.benefits || '');
    setEligibility(s.eligibility_criteria || '');
    setRequiredDocs(s.required_documents || '');
    setInstructions(s.application_instructions || '');
    setOfficialUrl(s.official_application_url || '');
    setDepartment(s.government_department || '');
    setContactInfo(s.contact_info || '');
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (targetStatus) => {
    setFormError('');

    if (!name.trim()) {
      setFormError('Scheme name is required.');
      return;
    }

    if (targetStatus === 'Published' && !officialUrl.trim()) {
      setFormError('An official government application URL is mandatory before publishing a scheme.');
      return;
    }

    if (officialUrl.trim() && !officialUrl.startsWith('http://') && !officialUrl.startsWith('https://')) {
      setFormError('Official URL must start with http:// or https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        benefits: benefits.trim(),
        eligibility_criteria: eligibility.trim(),
        required_documents: requiredDocs.trim(),
        application_instructions: instructions.trim(),
        official_application_url: officialUrl.trim(),
        government_department: department.trim(),
        contact_info: contactInfo.trim(),
        status: targetStatus,
      };

      if (editingScheme) {
        await apiClient.put(`/admin/welfare-schemes/${editingScheme.scheme_id}/`, payload);
        showSuccess(`Welfare scheme "${name}" updated (${targetStatus}).`);
      } else {
        await apiClient.post('/admin/welfare-schemes/', payload);
        showSuccess(`Welfare scheme "${name}" created (${targetStatus}).`);
      }

      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.message || 'Failed to save welfare scheme.');
      showError(err.message || 'Failed to save welfare scheme.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (scheme, newStatus) => {
    if (newStatus === 'Published' && !scheme.official_application_url) {
      showError('Please edit the scheme and provide a valid official government URL before publishing.');
      handleOpenEdit(scheme);
      return;
    }

    try {
      await apiClient.put(`/admin/welfare-schemes/${scheme.scheme_id}/`, {
        ...scheme,
        status: newStatus,
      });
      showSuccess(`Scheme "${scheme.name}" is now ${newStatus}.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || `Failed to update status to ${newStatus}.`);
    }
  };

  const handleDeleteScheme = async (scheme) => {
    if (!window.confirm(`Are you sure you want to delete scheme "${scheme.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/admin/welfare-schemes/${scheme.scheme_id}/`);
      showSuccess(`Scheme "${scheme.name}" deleted successfully.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to delete scheme.');
    }
  };

  // Status counts
  const publishedCount = schemes.filter((s) => s.status === 'Published').length;
  const draftCount = schemes.filter((s) => s.status === 'Draft').length;
  const unpublishedCount = schemes.filter((s) => s.status === 'Unpublished').length;

  // Filtered list
  const filteredSchemes = schemes.filter((s) => {
    // Tab filter
    if (activeTab === 'published' && s.status !== 'Published') return false;
    if (activeTab === 'draft' && s.status !== 'Draft') return false;
    if (activeTab === 'unpublished' && s.status !== 'Unpublished') return false;

    // Category filter
    if (selectedCategory !== 'All Categories' && s.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchDept = s.government_department?.toLowerCase().includes(q);
      const matchBenefits = s.benefits?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchDept && !matchBenefits) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Government Welfare Schemes
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#345333] rounded-full border border-[#d2e2d0]">
              {publishedCount} Published for Patients
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Maintain external government welfare schemes, eligibility policies, and official application redirection portals.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Welfare Scheme</span>
        </button>
      </div>

      {/* 2. Navigation Tabs & Search / Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#645e45] text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>All Schemes ({schemes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('published')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'published'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Published ({publishedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'draft'
                ? 'bg-amber-800 text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Drafts ({draftCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unpublished')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'unpublished'
                ? 'bg-zinc-800 text-white shadow-2xs'
                : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Unpublished ({unpublishedCount})</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Category Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by scheme category"
              className="w-full sm:w-44 px-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#4a473d] focus:outline-none focus:ring-1 focus:ring-[#645e45]"
            >
              {SCHEME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheme, dept, aid..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
            />
          </div>
        </div>
      </div>

      {/* 3. Schemes Grid */}
      {filteredSchemes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-3">
          <ScrollText className="w-10 h-10 text-[#7b776c] mx-auto opacity-50" />
          <h3 className="font-extrabold text-sm text-[#1e1b14]">
            No Welfare Schemes Found
          </h3>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All Categories' || activeTab !== 'all'
              ? 'No schemes match your active filter or search criteria.'
              : 'There are currently no welfare schemes configured. Click "Add Welfare Scheme" to register a government scheme.'}
          </p>
          {(searchQuery || selectedCategory !== 'All Categories' || activeTab !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('All Categories');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchemes.map((scheme) => {
            const isPublished = scheme.status === 'Published';
            const isDraft = scheme.status === 'Draft';

            return (
              <div
                key={scheme.scheme_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Metadata & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isDraft
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                          }`}
                        >
                          {isPublished ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isDraft ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{scheme.status}</span>
                        </span>

                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#fdfbf7] text-[#645e45] rounded-md border border-[#e0d9cc]">
                          {scheme.category}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-[#1e1b14] leading-snug pt-1">
                        {scheme.name}
                      </h3>
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(scheme)}
                        className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors cursor-pointer"
                        title="Edit Scheme Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScheme(scheme)}
                        className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Scheme"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Authority / Dept */}
                  {scheme.government_department && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7b776c]">
                      <Building2 className="w-3.5 h-3.5 text-[#645e45]" />
                      <span>{scheme.government_department}</span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-[#4a473d] leading-relaxed line-clamp-2">
                    {scheme.description || 'No summary description provided.'}
                  </p>

                  {/* Details Card */}
                  <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 text-xs">
                    {scheme.benefits && (
                      <div>
                        <span className="text-[11px] font-extrabold text-[#345333] block">
                          Key Benefits:
                        </span>
                        <p className="text-[#4a473d] text-[11px] leading-relaxed line-clamp-2">
                          {scheme.benefits}
                        </p>
                      </div>
                    )}

                    {scheme.eligibility_criteria && (
                      <div>
                        <span className="text-[11px] font-extrabold text-[#645e45] block">
                          Eligibility:
                        </span>
                        <p className="text-[#4a473d] text-[11px] leading-relaxed line-clamp-2">
                          {scheme.eligibility_criteria}
                        </p>
                      </div>
                    )}

                    {scheme.required_documents && (
                      <div>
                        <span className="text-[11px] font-extrabold text-[#645e45] block">
                          Required Documents:
                        </span>
                        <p className="text-[#4a473d] text-[11px] leading-relaxed line-clamp-1">
                          {scheme.required_documents}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer & Action Bar */}
                <div className="pt-3 border-t border-[#f2ece1] space-y-2.5">
                  {/* URL and Helpline */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {scheme.official_application_url ? (
                      <a
                        href={scheme.official_application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#645e45] hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#645e45]" />
                        <span className="max-w-[200px] truncate">{scheme.official_application_url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Missing Official URL</span>
                      </span>
                    )}

                    {scheme.contact_info && (
                      <span className="text-[11px] text-[#7b776c] font-medium flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" />
                        <span>{scheme.contact_info}</span>
                      </span>
                    )}
                  </div>

                  {/* Status Toggle Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-[#7b776c]">
                      {isPublished && scheme.published_at
                        ? `Published: ${scheme.published_at}`
                        : `Created: ${scheme.created_at}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPublished ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(scheme, 'Unpublished')}
                          className="px-3 py-1 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(scheme, 'Published')}
                          className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Publish Now
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(scheme)}
                        className="px-3 py-1 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Create / Edit Scheme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f8f3eb] text-[#7a6449]">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    {editingScheme ? 'Edit Government Welfare Scheme' : 'Add Government Welfare Scheme'}
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Configure external government scheme information and official application redirection portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Scheme Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  >
                    {SCHEME_CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Department & Helpline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Government Department / Authority
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. State Health Agency, Govt of Kerala"
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Contact / Helpline Information
                  </label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="e.g. Toll-Free: 1056 / 0471-2321234"
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>
              </div>

              {/* Official Application URL */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Official Government Application URL <span className="text-amber-700 font-normal">(Required to Publish)</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={officialUrl}
                    onChange={(e) => setOfficialUrl(e.target.value)}
                    placeholder="https://sha.kerala.gov.in/..."
                    className="w-full pl-9 pr-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>
                <p className="text-[11px] text-[#7b776c] mt-1">
                  Patients clicking &ldquo;Apply on Official Website ↗&rdquo; will be redirected directly to this official portal.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Scheme Description & About
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of the welfare initiative and financial subsidy..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Scheme Benefits & Financial Aid Details
                </label>
                <textarea
                  rows={2}
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="e.g. Cash assistance up to Rs. 2,00,000 for dialysis, Rs. 1,600 monthly pension..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              {/* Eligibility & Required Documents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Eligibility Criteria
                  </label>
                  <textarea
                    rows={2}
                    value={eligibility}
                    onChange={(e) => setEligibility(e.target.value)}
                    placeholder="e.g. BPL ration card, permanent Kerala resident, bedridden palliative status..."
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#1e1b14] mb-1">
                    Required Documents
                  </label>
                  <textarea
                    rows={2}
                    value={requiredDocs}
                    onChange={(e) => setRequiredDocs(e.target.value)}
                    placeholder="e.g. Aadhaar Card, Ration Card, Medical Board Certificate, Bank Passbook..."
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                  />
                </div>
              </div>

              {/* Application Instructions */}
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Application Instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Step 1: Open portal. Step 2: Upload medical certificate. Step 3: Submit at Akshaya Centre..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#f2ece1] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] order-2 sm:order-1"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFormSubmit('Draft')}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFormSubmit('Published')}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingScheme?.status === 'Published' ? 'Update & Keep Published' : 'Publish Scheme'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

