import React from 'react';
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  Plus,
  User,
  Heart,
  KeyRound,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function CaregiverSettings({
  user,
  complaintsList = [],
  onOpenComplaintModal,
  onNavigateProfile,
  hasActiveAssignment = false,
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#f4ede0] rounded-2xl text-[#645e45]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b14]">Caregiver Settings & Grievance Portal</h2>
            <p className="text-xs text-[#7b776c] font-medium">
              Manage your care availability, security credentials, and nursing grievance inquiries.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: SERVICE AVAILABILITY */}
      <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
          <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">Care Availability Status</h3>
            <p className="text-[11px] text-[#7b776c]">Current assignment state across the palliative network</p>
          </div>
        </div>

        <div className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  hasActiveAssignment ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="text-sm font-black text-[#1e1b14]">
                {hasActiveAssignment ? 'Currently Assigned to a Patient' : 'Active & Available for New Patient Assignments'}
              </span>
            </div>
            <p className="text-xs text-[#7b776c]">
              {hasActiveAssignment
                ? 'You are actively providing care for a patient. Once care concludes, mark care as completed to accept new patients.'
                : 'Palliative patients and supervising nurses can view your profile and request home palliative assistance.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROFILE & SECURITY SHORTCUT */}
      <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
          <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">Profile & Security Credentials</h3>
            <p className="text-[11px] text-[#7b776c]">Update phone number, locality address, specialization, or change password</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0]">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#1e1b14]">Personal Info & Password Management</p>
            <p className="text-xs text-[#7b776c]">
              Edit full profile details, update service area, and change account password.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-[#645e45] hover:bg-[#4c472f] shadow-xs transition-all cursor-pointer hover:shadow-md self-start sm:self-auto"
          >
            <User className="w-4 h-4" />
            <span>Open Caregiver Profile</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: GRIEVANCES & COMPLAINTS */}
      <div className="bg-white rounded-3xl border border-[#e9e2d5] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0eae0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1e1b14]">Caregiver Grievances & Inquiries</h3>
              <p className="text-[11px] text-[#7b776c]">Submit concerns directly to the community nursing supervision team</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenComplaintModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#645e45] hover:bg-[#524d38] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>File Complaint</span>
          </button>
        </div>

        {complaintsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7b776c] bg-[#fdfbf7] rounded-2xl border border-[#f0eae0]">
            No grievances submitted. Use the "File Complaint" button above if you ever encounter any safety, schedule, or administrative concerns.
          </div>
        ) : (
          <div className="space-y-3">
            {complaintsList.map((c) => {
              const isResolved = c.status === 'Resolved';
              return (
                <div
                  key={c.complaint_id}
                  className="p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-xs sm:text-sm text-[#1e1b14]">{c.subject}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#f4ede0] text-[#645e45]">
                        {c.category}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-[#4a473d]">{c.description}</p>

                  {isResolved && c.resolution_notes && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                      <strong className="font-black text-[11px] uppercase tracking-wider block">
                        Supervising Nurse Resolution Notes:
                      </strong>
                      <p>{c.resolution_notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
