import React, { useState, useEffect } from 'react';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Users,
  Stethoscope,
  Activity,
  HeartHandshake,
  Boxes,
  Video,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Percent,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminAnalyticsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Hover state for custom SVG tooltips
  const [hoveredPatientBar, setHoveredPatientBar] = useState(null);
  const [hoveredVisitBar, setHoveredVisitBar] = useState(null);
  const [hoveredTelemedBar, setHoveredTelemedBar] = useState(null);

  const { showError } = useToast();

  const fetchAnalytics = async (fDate = fromDate, tDate = toDate) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fDate) params.append('from_date', fDate);
      if (tDate) params.append('to_date', tDate);

      const res = await apiClient.get(`/admin/analytics/?${params.toString()}`);
      setAnalyticsData(res || {});
    } catch (err) {
      console.error('Failed to fetch admin analytics:', err);
      setError(err.message || 'Failed to load analytics data.');
      showError(err.message || 'Failed to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    fetchAnalytics(fromDate, toDate);
  };

  const handlePresetClick = (preset) => {
    setActiveDatePreset(preset);
    const today = new Date();
    let f = '';
    let t = today.toISOString().split('T')[0];

    if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      f = d.toISOString().split('T')[0];
    } else if (preset === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      f = d.toISOString().split('T')[0];
    } else if (preset === '180d') {
      const d = new Date();
      d.setDate(d.getDate() - 180);
      f = d.toISOString().split('T')[0];
    } else {
      f = '';
      t = '';
    }

    setFromDate(f);
    setToDate(t);
    fetchAnalytics(f, t);
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setActiveDatePreset('all');
    fetchAnalytics('', '');
  };

  const overview = analyticsData?.overview_kpis || {};
  const patientAnalytics = analyticsData?.patient_analytics || { registration_trend: [], status_distribution: {} };
  const visitAnalytics = analyticsData?.home_visit_analytics || { status_distribution: {}, monthly_trend: [] };
  const telemedAnalytics = analyticsData?.telemedicine_analytics || { status_distribution: {}, monthly_trend: [] };
  const staffAvailability = analyticsData?.staff_availability || { doctors: {}, nurses: {} };
  const equipmentAnalytics = analyticsData?.equipment_analytics || { utilization: {}, by_type: [] };
  const caregiverCoverage = analyticsData?.caregiver_coverage || {};

  // Calculations for charts
  const regTrend = patientAnalytics.registration_trend || [];
  const maxReg = Math.max(...regTrend.map((r) => r.registrations), 5);

  const visitTrend = visitAnalytics.monthly_trend || [];
  const maxVisits = Math.max(...visitTrend.map((v) => Math.max(v.scheduled, v.completed, v.total)), 5);

  const telemedTrend = telemedAnalytics.monthly_trend || [];
  const maxTelemed = Math.max(...telemedTrend.map((t) => t.consultations), 5);

  const patientStatusTotal =
    (patientAnalytics.status_distribution.approved || 0) +
    (patientAnalytics.status_distribution.pending || 0) +
    (patientAnalytics.status_distribution.rejected || 0) || 1;

  const visitStatusTotal =
    (visitAnalytics.status_distribution.completed || 0) +
    (visitAnalytics.status_distribution.scheduled || 0) +
    (visitAnalytics.status_distribution.rescheduled || 0) +
    (visitAnalytics.status_distribution.skipped || 0) || 1;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1b14] tracking-tight">
              Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-[#edf3ec] text-[#2d6a4f] rounded-full border border-[#d2e2d0]">
              Phase 1 Real-time Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7b776c] font-medium mt-1">
            Overview of KarunaGrid Phase 1 activity and service utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAnalytics(fromDate, toDate)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* 2. Date Filter Bar & Presets */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-3">
        <form onSubmit={handleApplyFilters} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#7b776c] uppercase mr-1">Timeframe:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 3 Months' },
              { id: '180d', label: 'Last 6 Months' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDatePreset === p.id
                    ? 'bg-[#645e45] text-white shadow-2xs'
                    : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0] border border-[#e0d9cc]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 text-xs">
              <label className="text-[11px] font-extrabold text-[#7b776c] uppercase">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <label className="text-[11px] font-extrabold text-[#7b776c] uppercase">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="text-xs font-bold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Filter className="w-3 h-3" />
              <span>Apply</span>
            </button>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] bg-[#fdfbf7] hover:bg-[#f4ede0] border border-[#e0d9cc] rounded-xl cursor-pointer"
                title="Clear date filter"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {isLoading && !analyticsData ? (
        <div className="bg-white p-16 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-[#645e45] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#7b776c]">Calculating KarunaGrid aggregated statistics...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <AlertCircle className="w-8 h-8 text-[#ba1a1a] mx-auto" />
          <p className="text-sm font-extrabold text-[#1e1b14]">Failed to load analytics</p>
          <p className="text-xs text-[#7b776c]">{error}</p>
          <button
            type="button"
            onClick={() => fetchAnalytics(fromDate, toDate)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] rounded-xl cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* 3. Overview KPI Cards (6 Top Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Total Patients */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Patients</span>
                <Users className="w-4 h-4 text-[#2d6a4f]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_patients ?? 0}</p>
              <p className="text-[10px] text-[#2d6a4f] font-semibold">Registered database</p>
            </div>

            {/* 2. Total Doctors */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Doctors</span>
                <Stethoscope className="w-4 h-4 text-[#645e45]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_doctors ?? 0}</p>
              <p className="text-[10px] text-[#7b776c]">Palliative certified</p>
            </div>

            {/* 3. Total Nurses */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Nurses</span>
                <Activity className="w-4 h-4 text-[#695e3d]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_nurses ?? 0}</p>
              <p className="text-[10px] text-[#7b776c]">Community care</p>
            </div>

            {/* 4. Total Caregivers */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Total Caregivers</span>
                <HeartHandshake className="w-4 h-4 text-[#9e7b4f]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_caregivers ?? 0}</p>
              <p className="text-[10px] text-[#7b776c]">Hospice assistants</p>
            </div>

            {/* 5. Home Visits */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Home Visits</span>
                <Activity className="w-4 h-4 text-[#3b82f6]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_home_visits ?? 0}</p>
              <p className="text-[10px] text-[#7b776c]">Care occurrences</p>
            </div>

            {/* 6. Telemedicine */}
            <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7b776c] uppercase">Telemedicine</span>
                <Video className="w-4 h-4 text-[#8b5cf6]" />
              </div>
              <p className="text-2xl font-black text-[#1e1b14]">{overview.total_telemedicine ?? 0}</p>
              <p className="text-[10px] text-[#7b776c]">Digital sessions</p>
            </div>
          </div>

          {/* 4. PATIENT REGISTRATION ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Monthly Patient Registration Trend */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-[#1e1b14]">Patient Registrations Trend</h2>
                  <p className="text-xs text-[#7b776c]">Monthly historical registrations from application intake</p>
                </div>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#fdfbf7] border border-[#e0d9cc] text-[#645e45] rounded-full">
                  Recent Months
                </span>
              </div>

              {/* Custom SVG Column Chart */}
              <div className="relative pt-4 pb-2">
                <div className="h-48 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-6">
                  {regTrend.map((item, idx) => {
                    const heightPercent = Math.max(8, Math.round((item.registrations / maxReg) * 100));
                    const isHovered = hoveredPatientBar === idx;
                    return (
                      <div
                        key={item.month}
                        className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                        onMouseEnter={() => setHoveredPatientBar(idx)}
                        onMouseLeave={() => setHoveredPatientBar(null)}
                      >
                        {/* Tooltip / Value */}
                        <div
                          className={`text-[11px] font-extrabold transition-all duration-150 ${
                            isHovered ? 'text-[#2d6a4f] scale-110' : 'text-[#7b776c]'
                          }`}
                        >
                          {item.registrations}
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[40px] bg-[#f4ede0] rounded-t-xl overflow-hidden h-36 flex items-end">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-xl transition-all duration-300 ${
                              isHovered ? 'bg-[#2d6a4f]' : 'bg-[#645e45]'
                            }`}
                          />
                        </div>

                        {/* Month Label */}
                        <span className="text-[10px] font-bold text-[#7b776c] text-center truncate max-w-full">
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Patient Registration Status Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e1b14]">Registration Status Distribution</h2>
                <p className="text-xs text-[#7b776c]">Intake verification status breakdown</p>
              </div>

              <div className="space-y-3 pt-2">
                {/* Approved */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#2d6a4f] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2d6a4f]" />
                      Approved
                    </span>
                    <span className="text-[#1e1b14]">
                      {patientAnalytics.status_distribution.approved || 0} (
                      {Math.round(((patientAnalytics.status_distribution.approved || 0) / patientStatusTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#f4ede0] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(((patientAnalytics.status_distribution.approved || 0) / patientStatusTotal) * 100)}%`,
                      }}
                      className="h-full bg-[#2d6a4f] rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Pending */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#b45309] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
                      Pending Verification
                    </span>
                    <span className="text-[#1e1b14]">
                      {patientAnalytics.status_distribution.pending || 0} (
                      {Math.round(((patientAnalytics.status_distribution.pending || 0) / patientStatusTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#f4ede0] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(((patientAnalytics.status_distribution.pending || 0) / patientStatusTotal) * 100)}%`,
                      }}
                      className="h-full bg-[#b45309] rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Rejected */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#ba1a1a] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                      Rejected
                    </span>
                    <span className="text-[#1e1b14]">
                      {patientAnalytics.status_distribution.rejected || 0} (
                      {Math.round(((patientAnalytics.status_distribution.rejected || 0) / patientStatusTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#f4ede0] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(((patientAnalytics.status_distribution.rejected || 0) / patientStatusTotal) * 100)}%`,
                      }}
                      className="h-full bg-[#ba1a1a] rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f2ece1] text-xs text-[#7b776c]">
                Total registration applications reviewed: <strong className="text-[#1e1b14]">{patientStatusTotal}</strong>
              </div>
            </div>
          </div>

          {/* 5. HOME VISIT & TELEMEDICINE ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Visits Overview & Monthly Trend */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-[#1e1b14]">Home Visits Status & Trend</h2>
                  <p className="text-xs text-[#7b776c]">Distribution of completed vs scheduled home visits</p>
                </div>
                <Activity className="w-4 h-4 text-[#645e45]" />
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#eef6ec] border border-[#d3ebd0]">
                  <span className="text-[10px] font-extrabold text-[#2d6a4f] uppercase block">Completed</span>
                  <span className="text-base font-black text-[#2d6a4f]">{visitAnalytics.status_distribution.completed || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fef7eb] border border-[#fde4ba]">
                  <span className="text-[10px] font-extrabold text-[#b45309] uppercase block">Scheduled</span>
                  <span className="text-base font-black text-[#b45309]">{visitAnalytics.status_distribution.scheduled || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f4ede0] border border-[#e0d9cc]">
                  <span className="text-[10px] font-extrabold text-[#645e45] uppercase block">Rescheduled</span>
                  <span className="text-base font-black text-[#645e45]">{visitAnalytics.status_distribution.rescheduled || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fdf2f2] border border-[#fcdada]">
                  <span className="text-[10px] font-extrabold text-[#ba1a1a] uppercase block">Skipped</span>
                  <span className="text-base font-black text-[#ba1a1a]">{visitAnalytics.status_distribution.skipped || 0}</span>
                </div>
              </div>

              {/* Monthly Trend Bars */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Monthly Occurrences Breakdown:</p>
                {visitTrend.map((v, idx) => (
                  <div key={v.month} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-bold text-[#7b776c] truncate">{v.month}</span>
                    <div className="flex-1 h-3 bg-[#f4ede0] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.round((v.completed / Math.max(v.total, 1)) * 100)}%` }}
                        className="h-full bg-[#2d6a4f]"
                        title={`Completed: ${v.completed}`}
                      />
                      <div
                        style={{ width: `${Math.round((v.scheduled / Math.max(v.total, 1)) * 100)}%` }}
                        className="h-full bg-[#b45309]"
                        title={`Scheduled: ${v.scheduled}`}
                      />
                    </div>
                    <span className="w-16 text-right font-extrabold text-[#1e1b14]">
                      {v.total} visits
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Telemedicine Consultations Analytics */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-[#1e1b14]">Telemedicine Consultations</h2>
                  <p className="text-xs text-[#7b776c]">Virtual medical encounters and workflow progression</p>
                </div>
                <Video className="w-4 h-4 text-[#8b5cf6]" />
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#eef6ec] border border-[#d3ebd0]">
                  <span className="text-[10px] font-extrabold text-[#2d6a4f] uppercase block">Completed</span>
                  <span className="text-base font-black text-[#2d6a4f]">{telemedAnalytics.status_distribution.completed || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#eff6ff] border border-[#dbeafe]">
                  <span className="text-[10px] font-extrabold text-[#3b82f6] uppercase block">In Progress</span>
                  <span className="text-base font-black text-[#3b82f6]">{telemedAnalytics.status_distribution.in_progress || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fef7eb] border border-[#fde4ba]">
                  <span className="text-[10px] font-extrabold text-[#b45309] uppercase block">Pending / Sched</span>
                  <span className="text-base font-black text-[#b45309]">
                    {(telemedAnalytics.status_distribution.pending || 0) + (telemedAnalytics.status_distribution.scheduled || 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fdf2f2] border border-[#fcdada]">
                  <span className="text-[10px] font-extrabold text-[#ba1a1a] uppercase block">Rejected / Cancel</span>
                  <span className="text-base font-black text-[#ba1a1a]">
                    {(telemedAnalytics.status_distribution.rejected || 0) + (telemedAnalytics.status_distribution.cancelled || 0)}
                  </span>
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Monthly Consultation Volume:</p>
                {telemedTrend.map((t) => (
                  <div key={t.month} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-bold text-[#7b776c] truncate">{t.month}</span>
                    <div className="flex-1 h-3 bg-[#f4ede0] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(8, Math.round((t.consultations / maxTelemed) * 100))}%` }}
                        className="h-full bg-[#8b5cf6] rounded-full"
                      />
                    </div>
                    <span className="w-16 text-right font-extrabold text-[#1e1b14]">
                      {t.consultations} consults
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. STAFF AVAILABILITY & CAREGIVER COVERAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Staff Availability Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e1b14]">Doctor & Nurse Live Availability</h2>
                <p className="text-xs text-[#7b776c]">Real-time duty and roster availability</p>
              </div>

              <div className="space-y-4 pt-1">
                {/* Doctors Availability */}
                <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-[#1e1b14]">
                      <Stethoscope className="w-4 h-4 text-[#645e45]" />
                      Doctors
                    </span>
                    <span className="text-[#2d6a4f]">
                      {staffAvailability.doctors.available || 0} / {staffAvailability.doctors.total || 0} Available
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#e9e2d5] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(
                          ((staffAvailability.doctors.available || 0) / Math.max(staffAvailability.doctors.total || 1, 1)) * 100
                        )}%`,
                      }}
                      className="h-full bg-[#2d6a4f] rounded-full"
                    />
                  </div>
                </div>

                {/* Nurses Availability */}
                <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-[#1e1b14]">
                      <Activity className="w-4 h-4 text-[#695e3d]" />
                      Nurses
                    </span>
                    <span className="text-[#2d6a4f]">
                      {staffAvailability.nurses.available || 0} / {staffAvailability.nurses.total || 0} Available
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#e9e2d5] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(
                          ((staffAvailability.nurses.available || 0) / Math.max(staffAvailability.nurses.total || 1, 1)) * 100
                        )}%`,
                      }}
                      className="h-full bg-[#2d6a4f] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Caregiver Coverage Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e1b14]">Caregiver Network Coverage</h2>
                <p className="text-xs text-[#7b776c]">Patient coverage managed by field nurses</p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-xl bg-[#edf3ec] border border-[#d2e2d0] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#2d6a4f] uppercase block">Coverage Ratio</span>
                    <span className="text-2xl font-black text-[#2d6a4f]">{caregiverCoverage.coverage_percentage ?? 0}%</span>
                  </div>
                  <Percent className="w-8 h-8 text-[#2d6a4f]/50" />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#f2ece1]">
                    <span className="text-[#7b776c]">Patients with Caregiver:</span>
                    <strong className="text-[#2d6a4f]">{caregiverCoverage.patients_with_caregiver ?? 0}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f2ece1]">
                    <span className="text-[#7b776c]">Patients without Caregiver:</span>
                    <strong className="text-[#b45309]">{caregiverCoverage.patients_without_caregiver ?? 0}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#7b776c]">Total Active Caregivers:</span>
                    <strong className="text-[#1e1b14]">{caregiverCoverage.total_active_caregivers ?? 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment Utilization Overview */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e1b14]">Equipment Utilization</h2>
                <p className="text-xs text-[#7b776c]">Inventory asset allocation breakdown</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#eef6ec] rounded-xl border border-[#d3ebd0] text-center">
                  <span className="text-[10px] font-extrabold text-[#2d6a4f] uppercase block">Available</span>
                  <strong className="text-lg text-[#2d6a4f]">{equipmentAnalytics.utilization.available ?? 0}</strong>
                </div>
                <div className="p-3 bg-[#eff6ff] rounded-xl border border-[#dbeafe] text-center">
                  <span className="text-[10px] font-extrabold text-[#3b82f6] uppercase block">Allocated</span>
                  <strong className="text-lg text-[#3b82f6]">{equipmentAnalytics.utilization.allocated ?? 0}</strong>
                </div>
                <div className="p-3 bg-[#fef7eb] rounded-xl border border-[#fde4ba] text-center">
                  <span className="text-[10px] font-extrabold text-[#b45309] uppercase block">Maintenance</span>
                  <strong className="text-lg text-[#b45309]">{equipmentAnalytics.utilization.maintenance ?? 0}</strong>
                </div>
                <div className="p-3 bg-[#fdf2f2] rounded-xl border border-[#fcdada] text-center">
                  <span className="text-[10px] font-extrabold text-[#ba1a1a] uppercase block">Retired</span>
                  <strong className="text-lg text-[#ba1a1a]">{equipmentAnalytics.utilization.retired ?? 0}</strong>
                </div>
              </div>

              {/* By Equipment Type */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-extrabold text-[#7b776c] uppercase">Inventory By Type:</p>
                {equipmentAnalytics.by_type.map((t) => (
                  <div key={t.type_name} className="flex justify-between text-xs py-1 border-b border-[#f2ece1] last:border-0">
                    <span className="font-semibold text-[#1e1b14]">{t.type_name}</span>
                    <span className="text-[#7b776c]">
                      <strong className="text-[#2d6a4f]">{t.available}</strong> avail / <strong className="text-[#1e1b14]">{t.total}</strong> total
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
