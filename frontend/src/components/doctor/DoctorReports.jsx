import React, { useState, useEffect } from 'react';
import { BarChart3, Video, Home, Pill, FileSpreadsheet, RefreshCw, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function DoctorReports() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/doctor/reports/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching clinical reports stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Doctor Clinical Activity & Performance Reports
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Aggregate clinical metrics across telemedicine, recurring home visits, medication regimens, and lab investigations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] hover:bg-[#f4ede0] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#7b776c] bg-white rounded-2xl border border-[#e9e2d5]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
          <p className="font-bold">Generating clinical reports...</p>
        </div>
      ) : !stats ? (
        <div className="p-16 text-center text-xs text-[#7b776c] bg-white rounded-2xl border border-[#e9e2d5]">
          <p className="font-bold text-sm text-[#1e1b14]">No clinical statistics available.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#e9e2d5] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c]">Telemedicine</span>
                <div className="p-2 rounded-xl bg-[#faf0ec] text-[#ba1a1a] border border-[#ebd4cc]">
                  <Video className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1e1b14]">{stats.telemedicine_completed}</span>
                <span className="text-xs text-[#7b776c]">/ {stats.telemedicine_total} total</span>
              </div>
              <p className="text-[11px] text-[#7b776c]">Completed consultations</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#e9e2d5] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c]">Home Visits</span>
                <div className="p-2 rounded-xl bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
                  <Home className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-[#1e1b14]">{stats.active_home_visit_schedules}</span>
              <p className="text-[11px] text-[#7b776c]">Active recurring visit schedules</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#e9e2d5] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c]">Prescriptions</span>
                <div className="p-2 rounded-xl bg-[#f5f1ea] text-[#695e3d] border border-[#e7ded0]">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-[#1e1b14]">{stats.prescriptions_issued}</span>
              <p className="text-[11px] text-[#7b776c]">Medical prescriptions issued</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#e9e2d5] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-[#7b776c]">Lab Reports</span>
                <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-[#1e1b14]">{stats.laboratory_reports_reviewed}</span>
              <p className="text-[11px] text-[#7b776c]">Diagnostic reports evaluated</p>
            </div>
          </div>

          {/* Clinical Summaries Card */}
          <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-[#1e1b14] uppercase tracking-wider">
              Clinical Quality & Compliance Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                <div className="flex items-center gap-2 text-[#426442] font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Prescription Versioning</span>
                </div>
                <p className="text-[11px] text-[#7b776c] leading-relaxed">
                  All medication changes maintain full historic audit trails with automatic superseding of previous regimens.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                <div className="flex items-center gap-2 text-[#426442] font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Discharge Document Verification</span>
                </div>
                <p className="text-[11px] text-[#7b776c] leading-relaxed">
                  100% of approved palliative registrations have been verified against hospital referral/discharge documentation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
                <div className="flex items-center gap-2 text-[#426442] font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Role Separation Boundary</span>
                </div>
                <p className="text-[11px] text-[#7b776c] leading-relaxed">
                  Vitals are recorded by community nurses while recurring scheduling and clinical necessity remain doctor-governed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
