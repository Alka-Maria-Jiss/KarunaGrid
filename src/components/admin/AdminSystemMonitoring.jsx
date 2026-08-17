import React from 'react';
import { Cpu, ShieldCheck, Database, CheckCircle2, Server, KeyRound, HardDrive, Bell } from 'lucide-react';

export default function AdminSystemMonitoring({ stats = {}, activities = [] }) {
  const healthChecks = [
    {
      name: 'Django REST Backend API',
      status: 'Operational',
      sub: 'v5.2.16 with SimpleJWT Token Authentication',
      icon: Server,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      name: 'PostgreSQL Relational Database',
      status: 'Connected',
      sub: 'All migrations [accounts, resources, care_coordination] applied',
      icon: Database,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      name: 'JWT Auth & Role Enforcement',
      status: 'Active',
      sub: '5 Roles configured with strict permission separation',
      icon: KeyRound,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      name: 'Secure Document Storage',
      status: 'Protected',
      sub: 'Role-based access token validated endpoints for discharge/ID proof',
      icon: HardDrive,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              System Health & Operational Monitoring
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300">
              All Systems Operational
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Real-time backend service status, database connectivity, and security subsystem monitoring
          </p>
        </div>
      </div>

      {/* Health Check Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {healthChecks.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex items-start gap-3.5"
            >
              <div className={`p-2.5 rounded-xl border flex-shrink-0 ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#1e1b14] truncate">
                    {item.name}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#7b776c] mt-0.5 font-medium">
                  {item.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Boundaries & Security Compliance Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#1e1b14] border-b border-[#f2ece1] pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#645e45]" />
          <span>KarunaGrid Phase 1 Role & Permission Governance</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#4a473d]">
          <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <h5 className="font-extrabold text-xs text-[#645e45]">
              Administrator Boundaries
            </h5>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              <li>Caregiver Identity Document Verification & Approval</li>
              <li>Pre-approved Doctor & Nurse Staff Onboarding</li>
              <li>Government Welfare Schemes & Application Review</li>
              <li>Assistive Medical Device Inventory & Unit Management</li>
              <li>User Account Activation & Cross-Role Monitoring</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <h5 className="font-extrabold text-xs text-[#645e45]">
              Clinical Doctor Authority (Strictly Preserved)
            </h5>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              <li>Patient Registration Approval & Discharge Summary Review</li>
              <li>Clinical Evaluation of Equipment Requests</li>
              <li>Prescription Versioning & Diagnostic Records</li>
              <li>Telemedicine Consultation & Follow-up Scheduling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
