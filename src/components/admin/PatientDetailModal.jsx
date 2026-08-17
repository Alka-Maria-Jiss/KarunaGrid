import React from 'react';
import { Users, X, Phone, MapPin, Calendar, Heart, ShieldCheck, FileText } from 'lucide-react';

export default function PatientDetailModal({ patient, onClose }) {
  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Patient Record (Read-Only)
              </h3>
              <p className="text-xs text-[#7b776c]">
                Administrator administrative overview & registration status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 text-xs text-[#1e1b14]">
          {/* Identity & Status */}
          <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-sm text-[#1e1b14]">{patient.name}</h4>
                <p className="text-[#645e45] font-extrabold text-[11px]">
                  Reg ID: {patient.registration_id}
                </p>
                <p className="text-[#7b776c]">{patient.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    patient.registration_status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : patient.registration_status === 'Rejected'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  Registration: {patient.registration_status}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#f4ede0] text-[#645e45] rounded-md">
                  Status: {patient.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#eee7da] text-[#4a473d]">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#7b776c]" />
                <span>{patient.phone || 'Phone not provided'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#7b776c]" />
                <span>
                  DOB: {patient.dob || 'N/A'} ({patient.gender || 'Not specified'})
                </span>
              </div>
            </div>
          </div>

          {/* Address & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
              <p className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider mb-1">
                Residential Address
              </p>
              <p className="font-semibold text-[#1e1b14]">
                {patient.house_name ? `${patient.house_name}, ` : ''}
                {patient.place}, {patient.panchayath}
              </p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">
                Ward: {patient.ward_no} | Pincode: {patient.pincode}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0]">
              <p className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider mb-1">
                Emergency Contact
              </p>
              <p className="font-semibold text-[#1e1b14]">
                {patient.emergency_contact_name || 'Not provided'}
              </p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">
                Phone: {patient.emergency_contact_phone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Doctor Approval Notice */}
          <div className="p-3.5 rounded-xl border border-[#e0d9cc] bg-[#faf8f4] text-[#4a473d] space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#645e45]">
              <ShieldCheck className="w-4 h-4" />
              <span>Doctor Clinical Review Note</span>
            </div>
            <p className="text-[11px] text-[#7b776c]">
              Clinical approval of patient registrations and discharge summaries is strictly managed by registered Palliative Care Physicians in the Doctor Portal.
            </p>
            {patient.reviewed_by_doctor && (
              <p className="text-[11px] font-bold text-[#1e1b14] pt-1">
                Reviewed By: {patient.reviewed_by_doctor}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            Close Patient Record
          </button>
        </div>
      </div>
    </div>
  );
}
