import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Users,
  Stethoscope,
  Activity,
  HeartHandshake,
  Boxes,
  ScrollText,
  Video,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  X,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const REPORT_CATEGORIES = [
  { id: 'patients', label: 'Patient Reports', icon: Users, desc: 'Patient demographics, application pipeline, and registration statuses' },
  { id: 'staff', label: 'Doctor & Nurse Reports', icon: Stethoscope, desc: 'Clinical personnel credentials, verification status, and real-time availability' },
  { id: 'home_visits', label: 'Home Visit Reports', icon: Activity, desc: 'Scheduled, completed, rescheduled, and urgent home care occurrences' },
  { id: 'telemedicine', label: 'Telemedicine Reports', icon: Video, desc: 'Virtual consultations, triage priority levels, and completion logs' },
  { id: 'caregivers', label: 'Caregiver Reports', icon: HeartHandshake, desc: 'Hospice caregiver credentials, assignment status, and patient coverage' },
  { id: 'equipment', label: 'Equipment Reports', icon: Boxes, desc: 'Palliative inventory, unit serial tracking, and patient allocations' },
  { id: 'welfare_schemes', label: 'Welfare Scheme Reports', icon: ScrollText, desc: 'Government palliative subsidies, relief schemes, and publication statuses' },
];

const STATUS_OPTIONS_BY_CATEGORY = {
  patients: [
    { value: 'all', label: 'All Statuses' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Rejected', label: 'Rejected' },
  ],
  staff: [
    { value: 'all', label: 'All Statuses & Roles' },
    { value: 'Doctor', label: 'Doctors Only' },
    { value: 'Nurse', label: 'Nurses Only' },
    { value: 'Available', label: 'Available Now' },
    { value: 'Unavailable', label: 'Unavailable' },
    { value: 'Approved', label: 'Approved Staff' },
    { value: 'Pending', label: 'Pending Verification' },
    { value: 'Rejected', label: 'Rejected Staff' },
  ],
  home_visits: [
    { value: 'all', label: 'All Visit Statuses' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Rescheduled', label: 'Rescheduled' },
    { value: 'Skipped', label: 'Skipped' },
    { value: 'Urgent', label: 'Urgent / Emergency' },
  ],
  telemedicine: [
    { value: 'all', label: 'All Consultation Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Rescheduled', label: 'Rescheduled' },
  ],
  caregivers: [
    { value: 'all', label: 'All Verification Statuses' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Pending', label: 'Pending Verification' },
    { value: 'Rejected', label: 'Rejected' },
  ],
  equipment: [
    { value: 'all', label: 'All Unit Statuses' },
    { value: 'Available', label: 'Available' },
    { value: 'Allocated', label: 'Allocated' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Retired', label: 'Retired' },
  ],
  welfare_schemes: [
    { value: 'all', label: 'All Publication Statuses' },
    { value: 'Published', label: 'Published' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Unpublished', label: 'Unpublished' },
  ],
};

export default function AdminReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('patients');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({ summary: {}, records: [], total_count: 0 });

  // Detailed Row Modal
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { showSuccess, showError } = useToast();

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('type', selectedCategory);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient.get(`/admin/reports/?${params.toString()}`);
      setReportData(res || { summary: {}, records: [], total_count: 0 });
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch admin reports:', err);
      setError(err.message || 'Failed to load report data. Please retry.');
      showError(err.message || 'Failed to load report data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedCategory]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    fetchReports();
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setSearchQuery('');
    setTimeout(() => {
      fetchReports();
    }, 10);
  };

  const handleCategoryChange = (newCat) => {
    setSelectedCategory(newCat);
    setStatusFilter('all');
    setSearchQuery('');
  };

  // Export Filtered Records to CSV
  const handleExportCSV = () => {
    const records = reportData.records || [];
    if (records.length === 0) {
      showError('No report records to export.');
      return;
    }

    // Determine CSV headers and keys based on category
    let headers = [];
    let extractRow = () => [];

    switch (selectedCategory) {
      case 'patients':
        headers = ['Patient ID', 'Name', 'Registration ID', 'Application ID', 'Registration Date', 'Status', 'Reviewed By', 'Phone', 'Location', 'Emergency Contact'];
        extractRow = (r) => [r.id, `"${r.patient_name}"`, r.registration_id, r.application_id, r.registration_date, r.status, `"${r.reviewed_by}"`, r.phone, `"${r.location}"`, `"${r.emergency_contact}"`];
        break;
      case 'staff':
        headers = ['ID', 'Name', 'Role', 'Email', 'Phone', 'Specialization', 'Service Area', 'Availability', 'Status', 'Experience', 'Joined Date'];
        extractRow = (r) => [r.id, `"${r.name}"`, r.role, r.email, r.phone, `"${r.specialization}"`, `"${r.service_area}"`, r.availability, r.status, r.experience, r.joined_date];
        break;
      case 'home_visits':
        headers = ['Visit ID', 'Scheduled Date', 'Patient Name', 'Patient Reg ID', 'Visiting Doctor', 'Allocated Nurse', 'Status', 'Visit Type', 'Urgency Level', 'Notes'];
        extractRow = (r) => [r.id, r.date, `"${r.patient_name}"`, r.patient_reg_id, `"${r.visiting_doctor}"`, `"${r.allocated_nurse}"`, r.status, r.visit_type, r.urgency_level, `"${r.notes}"`];
        break;
      case 'telemedicine':
        headers = ['Consultation ID', 'Patient Name', 'Patient Reg ID', 'Doctor Name', 'Priority', 'Scheduled Date', 'Scheduled Time', 'Status', 'Reason'];
        extractRow = (r) => [r.id, `"${r.patient_name}"`, r.patient_reg_id, `"${r.doctor_name}"`, r.priority, r.scheduled_date, r.scheduled_time, r.status, `"${r.reason}"`];
        break;
      case 'caregivers':
        headers = ['Caregiver ID', 'Name', 'Phone', 'Verification Status', 'Specialization', 'Location', 'Assigned Patient', 'Assigned By Nurse', 'Joined Date'];
        extractRow = (r) => [r.id, `"${r.caregiver_name}"`, r.phone, r.verification_status, `"${r.specialization}"`, `"${r.location}"`, `"${r.assigned_patient}"`, `"${r.assigned_by_nurse}"`, r.joined_date];
        break;
      case 'equipment':
        headers = ['Unit ID', 'Equipment Type', 'Serial Number', 'Status', 'Current Allocation', 'Last Updated'];
        extractRow = (r) => [r.id, `"${r.equipment_type}"`, r.serial_number, r.status, `"${r.current_allocation}"`, r.last_updated];
        break;
      case 'welfare_schemes':
        headers = ['Scheme ID', 'Scheme Name', 'Category', 'Department', 'Status', 'Published Date', 'Created By Admin'];
        extractRow = (r) => [r.id, `"${r.name}"`, `"${r.category}"`, `"${r.department}"`, r.status, r.published_at, `"${r.created_by}"`];
        break;
      default:
        headers = Object.keys(records[0] || {});
        extractRow = (r) => Object.values(r).map((v) => `"${v}"`);
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';

    records.forEach((r) => {
      csvContent += extractRow(r).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `KarunaGrid_${selectedCategory}_Report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${records.length} records to CSV successfully.`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Pagination calculations
  const allRecords = reportData.records || [];
  const totalPages = Math.ceil(allRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allRecords.slice(start, start + itemsPerPage);
  }, [allRecords, currentPage, itemsPerPage]);

  const summary = reportData.summary || {};

  // Status Badge Helper
  const renderStatusBadge = (statusStr) => {
    const s = String(statusStr || '').toLowerCase();
    if (['approved', 'completed', 'available', 'published', 'active'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eef6ec] text-[#2d6a4f] border border-[#d3ebd0]">
          <CheckCircle2 className="w-3 h-3" />
          <span>{statusStr}</span>
        </span>
      );
    }
    if (['pending', 'scheduled', 'in progress', 'accepted', 'draft', 'maintenance'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef7eb] text-[#b45309] border border-[#fde4ba]">
          <Clock className="w-3 h-3" />
          <span>{statusStr}</span>
        </span>
      );
    }
    if (['rejected', 'cancelled', 'skipped', 'retired', 'urgent', 'emergency', 'unavailable'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fdf2f2] text-[#ba1a1a] border border-[#fcdada]">
          <AlertCircle className="w-3 h-3" />
          <span>{statusStr}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
        {statusStr}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Actions */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1b14] tracking-tight">
              Reports
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              Phase 1 Operational
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7b776c] font-medium mt-1">
            View and generate detailed reports from KarunaGrid Phase 1 data.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isLoading || allRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Category Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {REPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#645e45] text-white shadow-xs'
                    : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] border border-[#f0eae0]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7b776c]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Category Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {selectedCategory === 'patients' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Patients</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_patients ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Database registered</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#426442] uppercase">Approved Patients</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.approved_patients ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Active under care</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Pending Reg.</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{summary.pending_registrations ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Awaiting doctor review</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#ba1a1a] uppercase">Rejected Reg.</p>
              <p className="text-xl font-black text-[#ba1a1a] mt-1">{summary.rejected_registrations ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Ineligible registrations</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Newly Registered</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.newly_registered_patients ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Past 30 days intake</p>
            </div>
          </>
        )}

        {selectedCategory === 'staff' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Doctors</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_doctors ?? 0}</p>
              <p className="text-[10px] text-[#2d6a4f] mt-0.5">{summary.available_doctors ?? 0} available now</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Nurses</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_nurses ?? 0}</p>
              <p className="text-[10px] text-[#2d6a4f] mt-0.5">{summary.available_nurses ?? 0} available now</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Approved Staff</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{(summary.approved_doctors ?? 0) + (summary.approved_nurses ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">{summary.approved_doctors ?? 0} docs / {summary.approved_nurses ?? 0} nurses</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Pending Staff</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{(summary.pending_doctors ?? 0) + (summary.pending_nurses ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Admin approval queue</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Unavailable Staff</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{(summary.unavailable_doctors ?? 0) + (summary.unavailable_nurses ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Off duty or on leave</p>
            </div>
          </>
        )}

        {selectedCategory === 'home_visits' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Visits</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_visits ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">All logged occurrences</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Completed Visits</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.completed_visits ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Care notes logged</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Scheduled</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{summary.scheduled_visits ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Upcoming care pipeline</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#ba1a1a] uppercase">Urgent Visits</p>
              <p className="text-xl font-black text-[#ba1a1a] mt-1">{summary.urgent_visits ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">High / emergency priority</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Rescheduled / Skipped</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{(summary.rescheduled_visits ?? 0) + (summary.skipped_visits ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">{summary.rescheduled_visits ?? 0} resched / {summary.skipped_visits ?? 0} skipped</p>
            </div>
          </>
        )}

        {selectedCategory === 'telemedicine' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Consultations</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_consultations ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">All digital appointments</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Completed</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.completed ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Treated and concluded</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Pending / Accepted</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{(summary.pending ?? 0) + (summary.accepted ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">{summary.pending ?? 0} pending review</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#3b82f6] uppercase">Scheduled / In Prog</p>
              <p className="text-xl font-black text-[#3b82f6] mt-1">{(summary.scheduled ?? 0) + (summary.in_progress ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Active telemedicine sessions</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#ba1a1a] uppercase">Rejected / Cancelled</p>
              <p className="text-xl font-black text-[#ba1a1a] mt-1">{(summary.rejected ?? 0) + (summary.cancelled ?? 0)}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">{summary.rejected ?? 0} rejected / {summary.cancelled ?? 0} cancelled</p>
            </div>
          </>
        )}

        {selectedCategory === 'caregivers' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Caregivers</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_caregivers ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Registered pool</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Active & Approved</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.active_caregivers ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Hospice certified</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">With Caregiver</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.patients_with_caregivers ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Patients assigned</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Without Caregiver</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{summary.patients_without_caregivers ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Unassigned patients</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Active Assignments</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.caregiver_assignments ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Managed by field nurses</p>
            </div>
          </>
        )}

        {selectedCategory === 'equipment' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Units</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_equipment_units ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Physical assets</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Available Units</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.available_units ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">In warehouse</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#3b82f6] uppercase">Allocated Units</p>
              <p className="text-xl font-black text-[#3b82f6] mt-1">{summary.allocated_units ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">With patients</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Pending Requests</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{summary.pending_requests ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Awaiting doctor approval</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Returned Units</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.returned_units ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Processed return requests</p>
            </div>
          </>
        )}

        {selectedCategory === 'welfare_schemes' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Schemes</p>
              <p className="text-xl font-black text-[#1e1b14] mt-1">{summary.total_schemes ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Government programs</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#2d6a4f] uppercase">Published</p>
              <p className="text-xl font-black text-[#2d6a4f] mt-1">{summary.published_schemes ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Visible to public</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#b45309] uppercase">Draft Schemes</p>
              <p className="text-xl font-black text-[#b45309] mt-1">{summary.draft_schemes ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">In preparation</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#ba1a1a] uppercase">Unpublished</p>
              <p className="text-xl font-black text-[#ba1a1a] mt-1">{summary.unpublished_schemes ?? 0}</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Archived schemes</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-extrabold text-[#645e45] uppercase">Informational Scope</p>
              <p className="text-sm font-extrabold text-[#1e1b14] mt-1">Phase 1</p>
              <p className="text-[10px] text-[#7b776c] mt-0.5">Read-only catalog</p>
            </div>
          </>
        )}
      </div>

      {/* 4. Reusable Filter Bar */}
      <form onSubmit={handleApplyFilters} className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#7b776c] uppercase mb-1">
              Date From
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#7b776c] uppercase mb-1">
              Date To
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              />
            </div>
          </div>

          {/* Report Category Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#7b776c] uppercase mb-1">
              Report Type
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#645e45] cursor-pointer"
            >
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#7b776c] uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#645e45] cursor-pointer"
            >
              {(STATUS_OPTIONS_BY_CATEGORY[selectedCategory] || [{ value: 'all', label: 'All Statuses' }]).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] bg-[#fdfbf7] hover:bg-[#f4ede0] border border-[#e0d9cc] rounded-xl transition-all cursor-pointer"
              title="Reset all filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Search & Summary Header */}
        <div className="pt-2 border-t border-[#f2ece1] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'report'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45]"
            />
          </div>

          <div className="text-xs text-[#7b776c] font-bold">
            Showing <span className="text-[#1e1b14]">{allRecords.length}</span> records matching criteria
          </div>
        </div>
      </form>

      {/* 5. Detailed Reports Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-[#645e45] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#7b776c]">Generating operational report data from KarunaGrid database...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3 px-4">
            <AlertCircle className="w-8 h-8 text-[#ba1a1a] mx-auto" />
            <p className="text-sm font-extrabold text-[#1e1b14]">Error Loading Report</p>
            <p className="text-xs text-[#7b776c] max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchReports}
              className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : allRecords.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f4ede0] text-[#645e45] flex items-center justify-center mx-auto mb-2">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-sm font-extrabold text-[#1e1b14]">No report data available for the selected filters.</p>
            <p className="text-xs text-[#7b776c]">
              Try adjusting the date range, status selector, or search term to view matching records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fdfbf7] text-[#7b776c] font-extrabold uppercase border-b border-[#e9e2d5] tracking-wider text-[11px]">
                {selectedCategory === 'patients' && (
                  <tr>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Registration ID</th>
                    <th className="px-5 py-3.5">Registration Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Reviewed By</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'staff' && (
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Email / Username</th>
                    <th className="px-5 py-3.5">Specialization</th>
                    <th className="px-5 py-3.5">Availability</th>
                    <th className="px-5 py-3.5">Approval Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'home_visits' && (
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Visiting Doctor</th>
                    <th className="px-5 py-3.5">Allocated Nurse</th>
                    <th className="px-5 py-3.5">Visit Status</th>
                    <th className="px-5 py-3.5">Priority / Type</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'telemedicine' && (
                  <tr>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Attending Doctor</th>
                    <th className="px-5 py-3.5">Priority</th>
                    <th className="px-5 py-3.5">Scheduled Date & Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'caregivers' && (
                  <tr>
                    <th className="px-5 py-3.5">Caregiver Name</th>
                    <th className="px-5 py-3.5">Contact Phone</th>
                    <th className="px-5 py-3.5">Specialization</th>
                    <th className="px-5 py-3.5">Verification Status</th>
                    <th className="px-5 py-3.5">Assigned Patient</th>
                    <th className="px-5 py-3.5">Assigned By Nurse</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'equipment' && (
                  <tr>
                    <th className="px-5 py-3.5">Equipment Type</th>
                    <th className="px-5 py-3.5">Serial / Identifier</th>
                    <th className="px-5 py-3.5">Unit Status</th>
                    <th className="px-5 py-3.5">Current Allocation</th>
                    <th className="px-5 py-3.5">Last Updated</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}

                {selectedCategory === 'welfare_schemes' && (
                  <tr>
                    <th className="px-5 py-3.5">Scheme Title</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Published Date</th>
                    <th className="px-5 py-3.5">Created By</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                {paginatedRecords.map((row, idx) => {
                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-[#fdfbf7] transition-colors group cursor-pointer"
                      onClick={() => setSelectedRowDetail(row)}
                    >
                      {/* Category: Patients */}
                      {selectedCategory === 'patients' && (
                        <>
                          <td className="px-5 py-3.5 font-bold">
                            <p className="text-xs font-extrabold text-[#1e1b14]">{row.patient_name}</p>
                            <p className="text-[10px] text-[#7b776c]">{row.location}</p>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#645e45]">
                            {row.registration_id}
                          </td>
                          <td className="px-5 py-3.5 text-[#7b776c] font-medium">
                            {row.registration_date}
                          </td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5 font-medium text-[#4a473d]">
                            {row.reviewed_by}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View full record details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Staff */}
                      {selectedCategory === 'staff' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-[#1e1b14]">{row.name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                              row.role === 'Doctor' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {row.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#7b776c] font-medium">{row.email}</td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.specialization}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.availability)}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View full staff details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Home Visits */}
                      {selectedCategory === 'home_visits' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-[#1e1b14]">{row.date}</td>
                          <td className="px-5 py-3.5 font-bold">
                            <p className="text-[#1e1b14]">{row.patient_name}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.visiting_doctor}</td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.allocated_nurse}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              row.urgency_level === 'Urgent' || row.urgency_level === 'Emergency'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-[#f4ede0] text-[#645e45]'
                            }`}>
                              {row.urgency_level} ({row.visit_type})
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View visit details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Telemedicine */}
                      {selectedCategory === 'telemedicine' && (
                        <>
                          <td className="px-5 py-3.5 font-bold">
                            <p className="text-[#1e1b14]">{row.patient_name}</p>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[#4a473d]">{row.doctor_name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              row.priority === 'Urgent' || row.priority === 'Emergency'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-[#f4ede0] text-[#645e45]'
                            }`}>
                              {row.priority}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#7b776c]">
                            {row.scheduled_date} at {row.scheduled_time}
                          </td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View consultation details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Caregivers */}
                      {selectedCategory === 'caregivers' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-[#1e1b14]">{row.caregiver_name}</td>
                          <td className="px-5 py-3.5 text-[#7b776c]">{row.phone}</td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.specialization}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.verification_status)}</td>
                          <td className="px-5 py-3.5 font-medium text-[#1e1b14]">{row.assigned_patient}</td>
                          <td className="px-5 py-3.5 text-[#7b776c]">{row.assigned_by_nurse}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View caregiver details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Equipment */}
                      {selectedCategory === 'equipment' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-[#1e1b14]">{row.equipment_type}</td>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#645e45]">{row.serial_number}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5 text-[#4a473d] font-medium">{row.current_allocation}</td>
                          <td className="px-5 py-3.5 text-[#7b776c]">{row.last_updated}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View equipment unit details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}

                      {/* Category: Welfare Schemes */}
                      {selectedCategory === 'welfare_schemes' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-[#1e1b14]">{row.name}</td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.category}</td>
                          <td className="px-5 py-3.5 text-[#7b776c]">{row.department}</td>
                          <td className="px-5 py-3.5">{renderStatusBadge(row.status)}</td>
                          <td className="px-5 py-3.5 text-[#7b776c]">{row.published_at}</td>
                          <td className="px-5 py-3.5 text-[#4a473d]">{row.created_by}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowDetail(row);
                              }}
                              className="p-1.5 rounded-lg text-[#645e45] hover:bg-[#f4ede0] transition-colors"
                              title="View welfare scheme details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {allRecords.length > 0 && (
          <div className="px-5 py-3.5 bg-[#fdfbf7] border-t border-[#e9e2d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[#7b776c]">
              Page <strong className="text-[#1e1b14]">{currentPage}</strong> of{' '}
              <strong className="text-[#1e1b14]">{totalPages}</strong> (Total {allRecords.length} records)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#e0d9cc] bg-white text-[#4a473d] hover:bg-[#f4ede0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              ).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#645e45] text-white'
                      : 'border border-[#e0d9cc] bg-white text-[#4a473d] hover:bg-[#f4ede0]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#e0d9cc] bg-white text-[#4a473d] hover:bg-[#f4ede0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e9e2d5] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0eae0]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#645e45]" />
                <h3 className="text-sm font-extrabold text-[#1e1b14]">
                  Detailed Record Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="p-1 text-[#7b776c] hover:text-[#1e1b14] rounded-lg hover:bg-[#f4ede0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(selectedRowDetail).map(([key, value]) => {
                if (key === 'id' || key === 'patient_reg_id' || key === 'user_id' || key === 'doctor_id' || key === 'nurse_id' || key === 'caregiver_id') return null;
                const formattedKey = key.replace(/_/g, ' ').toUpperCase();
                return (
                  <div key={key} className="p-3 bg-[#fdfbf7] rounded-xl border border-[#f0eae0]">
                    <span className="text-[10px] font-extrabold text-[#7b776c] block uppercase">{formattedKey}</span>
                    <span className="font-bold text-[#1e1b14] mt-0.5 block break-words">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#f0eae0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
