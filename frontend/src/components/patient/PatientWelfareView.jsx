import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Building2,
  PhoneCall,
  FileCheck2,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  X,
  ArrowUpRight,
  Filter,
  Info,
} from 'lucide-react';
import apiClient from '../../api/apiClient';

const CATEGORY_OPTIONS = [
  'All',
  'Financial Support',
  'Medical Aid',
  'Disability & Mobility',
  'Pension & Subsidy',
  'Caregiver Support',
  'Other',
];

export default function PatientWelfareView({ onRefresh }) {
  const [schemes, setSchemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedScheme, setSelectedScheme] = useState(null);

  const fetchWelfareSchemes = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/patient/welfare/');
      // res.schemes only contains status === 'Published'
      setSchemes(res.schemes || []);
    } catch (err) {
      console.error('Error fetching welfare schemes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWelfareSchemes();
  }, []);

  // Filter schemes based on search query and category
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.government_department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.benefits?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.eligibility_criteria?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        (s.category && s.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [schemes, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#f8f3eb] text-[#7a6449] border border-[#e8dccb]">
              <ScrollText className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-extrabold text-[#1e1b14] tracking-tight">
              Government Welfare Schemes
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e2dec9]">
              {schemes.length} Available
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium leading-relaxed max-w-2xl">
            Discover verified state and central government palliative grants, financial subsidies, and healthcare aids. KarunaGrid provides scheme details and connects you directly to official government application portals.
          </p>
        </div>

        {/* Informational Disclaimer Tag */}
        <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#e9e2d5] text-[11px] text-[#7b776c] flex items-start gap-2 max-w-sm">
          <Info className="w-4 h-4 text-[#645e45] shrink-0 mt-0.5" />
          <span>Applications are handled exclusively on official government portals. KarunaGrid does not process or collect application forms.</span>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes, departments, benefits..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45] text-[#1e1b14] placeholder-[#9e988a]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
          <Filter className="w-3.5 h-3.5 text-[#7b776c] shrink-0 mr-1 hidden sm:block" />
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#645e45] text-white shadow-2xs'
                    : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0] border border-[#e9e2d5]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheme Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#e9e2d5] text-xs text-[#7b776c] font-medium">
          Loading government schemes...
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#e9e2d5] space-y-2">
          <p className="text-sm font-extrabold text-[#1e1b14]">No Welfare Schemes Found</p>
          <p className="text-xs text-[#7b776c]">
            {searchQuery || selectedCategory !== 'All'
              ? 'No schemes match your current search and filter criteria.'
              : 'There are currently no published government welfare schemes.'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-2 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#e8dec9] rounded-xl transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.scheme_id}
              className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs flex flex-col justify-between hover:border-[#cfc7b4] transition-all group"
            >
              <div className="space-y-3.5">
                {/* Top badges: Category & Department */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f8f3eb] text-[#7a6449] rounded-md border border-[#e8dccb]">
                    {scheme.category || 'General Support'}
                  </span>
                  {scheme.government_department && (
                    <span className="text-[11px] font-semibold text-[#7b776c] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#9e988a]" />
                      <span className="truncate max-w-[200px]">{scheme.government_department}</span>
                    </span>
                  )}
                </div>

                {/* Scheme Title */}
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-[#1e1b14] group-hover:text-[#4c472f] transition-colors">
                    {scheme.name}
                  </h2>
                  <p className="text-xs text-[#4a473d] leading-relaxed mt-1 line-clamp-2">
                    {scheme.description || 'Government assistance program for palliative and healthcare support.'}
                  </p>
                </div>

                {/* Key Benefit Highlights Box */}
                {scheme.benefits && (
                  <div className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0] flex items-start gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-[#7a6449] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-[#1e1b14] text-[11px] block">
                        Key Benefits:
                      </span>
                      <p className="text-[#4a473d] text-[11px] font-medium line-clamp-2 mt-0.5">
                        {scheme.benefits}
                      </p>
                    </div>
                  </div>
                )}

                {/* Summaries for Eligibility & Required Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-[#faf7f0] rounded-xl border border-[#f2ece1]">
                    <span className="font-bold text-[#645e45] block">Eligibility:</span>
                    <p className="text-[#7b776c] truncate mt-0.5">
                      {scheme.eligibility_criteria || 'General Palliative Criteria'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#faf7f0] rounded-xl border border-[#f2ece1]">
                    <span className="font-bold text-[#645e45] block">Documents:</span>
                    <p className="text-[#7b776c] truncate mt-0.5">
                      {scheme.required_documents || 'Discharge Summary, ID Proof'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-4 mt-4 border-t border-[#f2ece1] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedScheme(scheme)}
                  className="text-xs font-bold text-[#645e45] hover:text-[#3d3a2b] hover:underline cursor-pointer"
                >
                  View Details
                </button>

                {scheme.official_application_url ? (
                  <a
                    href={scheme.official_application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] transition-all shadow-xs cursor-pointer"
                  >
                    <span>Apply on Official Website</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedScheme(scheme)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] transition-all shadow-xs cursor-pointer"
                  >
                    <span>View Scheme Info</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEME DETAILS MODAL / DRAWER */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#f2ece1] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f8f3eb] text-[#7a6449] rounded-md border border-[#e8dccb]">
                    {selectedScheme.category || 'General Support'}
                  </span>
                  {selectedScheme.government_department && (
                    <span className="text-[11px] font-semibold text-[#7b776c] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#9e988a]" />
                      {selectedScheme.government_department}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-[#1e1b14]">
                  {selectedScheme.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScheme(null)}
                className="p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs scrollbar-thin">
              {/* About Scheme */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45]">
                  About the Scheme
                </h4>
                <p className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0]">
                  {selectedScheme.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Benefits */}
              {selectedScheme.benefits && (
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#7a6449]" />
                    <span>Benefits & Financial Aid</span>
                  </h4>
                  <div className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0] whitespace-pre-line">
                    {selectedScheme.benefits}
                  </div>
                </div>
              )}

              {/* Eligibility & Documents Two-column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Eligibility Criteria */}
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Eligibility Criteria</span>
                  </h4>
                  <div className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0] min-h-[80px] whitespace-pre-line">
                    {selectedScheme.eligibility_criteria || 'General palliative care criteria.'}
                  </div>
                </div>

                {/* Required Documents */}
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45] flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Required Documents</span>
                  </h4>
                  <div className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0] min-h-[80px] whitespace-pre-line">
                    {selectedScheme.required_documents || 'Discharge summary, ID proof, Ration card.'}
                  </div>
                </div>
              </div>

              {/* Application Instructions */}
              {selectedScheme.application_instructions && (
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>How to Apply</span>
                  </h4>
                  <div className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3.5 rounded-xl border border-[#f0eae0] whitespace-pre-line">
                    {selectedScheme.application_instructions}
                  </div>
                </div>
              )}

              {/* Contact & Helpline Info */}
              {selectedScheme.contact_info && (
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-[#1e1b14] uppercase tracking-wider text-[#645e45] flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-[#645e45]" />
                    <span>Contact & Helpline Information</span>
                  </h4>
                  <div className="text-[#4a473d] leading-relaxed bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0]">
                    {selectedScheme.contact_info}
                  </div>
                </div>
              )}

              {/* OFFICIAL REDIRECTION DISCLAIMER BOX */}
              <div className="p-4 rounded-xl bg-[#fffdfa] border border-[#e8dccb] flex items-start gap-3">
                <Info className="w-4 h-4 text-[#7a6449] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#5c4d37] leading-relaxed">
                  You will be redirected to the official government website to complete your application. KarunaGrid does not process or track welfare scheme applications.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#f2ece1] flex items-center justify-between gap-3 bg-[#faf7f0] rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedScheme(null)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] rounded-xl hover:bg-[#f4ede0] transition-colors cursor-pointer"
              >
                Close
              </button>

              {selectedScheme.official_application_url ? (
                <a
                  href={selectedScheme.official_application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>Apply on Official Website</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-[11px] font-semibold text-[#7b776c] italic">
                  Official application URL not yet provided by Admin
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
