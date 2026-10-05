import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  FileSpreadsheet,
  Users,
  Stethoscope,
  Activity,
  HeartHandshake,
  Boxes,
  ScrollText,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function AdminReportsAnalytics({ stats = {}, users = [] }) {
  const [reportType, setReportType] = useState('patient_summary');
  const [dateRange, setDateRange] = useState('month');
  const { showSuccess } = useToast();

  const handleExportCSV = () => {
    // Generate CSV from actual users data
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'User ID,Role,Name,Email,Phone,Address,Status,Created At\n';

    users.forEach((u) => {
      const row = [
        u.user_id,
        u.role,
        `"${u.name}"`,
        u.email,
        u.phone || 'N/A',
        `"${u.address || 'N/A'}"`,
        u.status_label,
        `"${u.created_at}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KarunaGrid_${reportType}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Report exported successfully as CSV.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header Banner & Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Palliative Care Analytics & Reports
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
              Phase 1 Metrics
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Operational palliative demographics, staff engagement distributions, and official reporting exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-extrabold text-[#7b776c] uppercase">Report Category:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45] cursor-pointer"
          >
            <option value="patient_summary">Patients & Clinical Demographics</option>
            <option value="doctor_activity">Physician & Telemedicine Activity</option>
            <option value="nurse_visits">Nurse Home Care Occurrences</option>
            <option value="caregiver_verifications">Caregiver Credentials & Assignment</option>
            <option value="equipment_utilization">Equipment Stock & Allocation</option>
            <option value="welfare_subsidies">Government Welfare Subsidies</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#7b776c]" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45] cursor-pointer"
          >
            <option value="week">Current Week</option>
            <option value="month">Current Month</option>
            <option value="quarter">Last Quarter (3 Months)</option>
            <option value="year">Full Calendar Year</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Active Patients</span>
            <Users className="w-4 h-4 text-[#426442]" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14]">{stats.total_patients ?? 1}</p>
          <p className="text-[11px] text-[#7b776c]">100% with registered contact</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Medical Officers</span>
            <Stethoscope className="w-4 h-4 text-[#645e45]" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14]">{stats.total_doctors ?? 1}</p>
          <p className="text-[11px] text-[#7b776c]">Palliative certified staff</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Field Nurses</span>
            <Activity className="w-4 h-4 text-[#695e3d]" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14]">{stats.total_nurses ?? 2}</p>
          <p className="text-[11px] text-[#7b776c]">Active home palliative care</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Caregiver Network</span>
            <HeartHandshake className="w-4 h-4 text-[#7a6449]" />
          </div>
          <p className="text-2xl font-black text-[#1e1b14]">{stats.total_caregivers ?? 1}</p>
          <p className="text-[11px] text-[#7b776c]">Verified hospice supporters</p>
        </div>
      </div>

      {/* Detailed Analysis Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#1e1b14] border-b border-[#f2ece1] pb-3">
          Executive Palliative Health Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <h4 className="font-extrabold text-[#645e45] text-xs">Care Coordination Metrics</h4>
            <ul className="space-y-1.5 text-[#4a473d]">
              <li className="flex justify-between">
                <span>Total Registrations:</span>
                <strong className="text-[#1e1b14]">{users.length}</strong>
              </li>
              <li className="flex justify-between">
                <span>Active Ratio:</span>
                <strong className="text-[#1e1b14]">100% Active</strong>
              </li>
              <li className="flex justify-between">
                <span>Verification Turnaround:</span>
                <strong className="text-[#1e1b14]">&lt; 24 Hours</strong>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <h4 className="font-extrabold text-[#645e45] text-xs">Equipment Inventory Allocation</h4>
            <ul className="space-y-1.5 text-[#4a473d]">
              <li className="flex justify-between">
                <span>Oxygen Units:</span>
                <strong className="text-[#1e1b14]">3 Units</strong>
              </li>
              <li className="flex justify-between">
                <span>Hospital Beds:</span>
                <strong className="text-[#1e1b14]">2 Units</strong>
              </li>
              <li className="flex justify-between">
                <span>Mobility Wheelchairs:</span>
                <strong className="text-[#1e1b14]">2 Units</strong>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <h4 className="font-extrabold text-[#645e45] text-xs">State Welfare Participation</h4>
            <ul className="space-y-1.5 text-[#4a473d]">
              <li className="flex justify-between">
                <span>KBF Scheme Coverage:</span>
                <strong className="text-[#1e1b14]">Active</strong>
              </li>
              <li className="flex justify-between">
                <span>Vayomithram Senior Grant:</span>
                <strong className="text-[#1e1b14]">Active</strong>
              </li>
              <li className="flex justify-between">
                <span>Ashwasakiranam Caregiver:</span>
                <strong className="text-[#1e1b14]">Active</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
