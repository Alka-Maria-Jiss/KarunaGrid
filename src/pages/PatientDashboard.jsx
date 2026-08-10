import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AlertCircle, CheckCircle2, Clock, User, Phone, MapPin, FileText, Heart } from 'lucide-react';

export default function PatientDashboard({ user, onLogout }) {
  const status = (user?.status || 'PENDING').toUpperCase();
  const rejectionReason = user?.rejection_reason;
  const details = user?.details || {};

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        
        {/* PROMINENT REGISTRATION STATUS BANNER */}
        {status === 'PENDING' && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-4 shadow-sm">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-amber-950">Registration Pending Doctor Approval</h3>
              <p className="text-xs sm:text-sm text-amber-900 mt-1 font-medium leading-relaxed">
                Your medical registration and discharge summary document are currently being reviewed by an assigned KarunaGrid doctor. You will receive an in-app notification as soon as your account is approved.
              </p>
            </div>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-4 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-emerald-950">Registration Approved — Full Care Network Access</h3>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 font-medium leading-relaxed">
                Welcome to KarunaGrid! Your patient account is active and verified. You have full access to palliative care services, doctor consultations, and nurse visit requests.
              </p>
            </div>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-rose-950">Registration Not Approved</h3>
              <p className="text-xs sm:text-sm text-rose-900 mt-1 font-medium leading-relaxed">
                Your patient registration request was reviewed and could not be approved at this time.
              </p>
              {rejectionReason && (
                <div className="mt-3 p-3 bg-white/80 rounded-xl border border-rose-200 text-xs font-semibold text-rose-950">
                  <strong>Rejection Reason:</strong> {rejectionReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE OVERVIEW CARD */}
        <div className="bg-white rounded-2xl border border-serene-outline-subtle p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-serene-container rounded-xl text-serene-primary">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-serene-text">{user?.name || 'Patient'}</h2>
                <p className="text-xs text-serene-muted font-semibold">Registration ID: {details.registration_id || 'KG-P-PENDING'}</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${
              status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
              status === 'REJECTED' ? 'bg-rose-100 text-rose-900 border-rose-300' :
              'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact & Personal */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Personal Info</h4>
              <p className="text-sm font-semibold text-serene-text">Email: <span className="font-normal">{user?.email}</span></p>
              <p className="text-sm font-semibold text-serene-text">Phone: <span className="font-normal">{details.phone || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">DOB: <span className="font-normal">{details.dob || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Gender: <span className="font-normal capitalize">{details.gender || 'Not specified'}</span></p>
            </div>

            {/* Address Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Address Details</h4>
              <p className="text-sm font-semibold text-serene-text">House: <span className="font-normal">{details.house_name || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Place: <span className="font-normal">{details.place || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Panchayath: <span className="font-normal">{details.panchayath || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Ward / Pincode: <span className="font-normal">Ward {details.ward_no || '-'}, {details.pincode || '-'}</span></p>
            </div>

            {/* Emergency Contact & Document */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Emergency & Document</h4>
              <div>
                <p className="text-xs font-bold text-serene-muted">Emergency Contact:</p>
                <p className="text-sm font-semibold text-serene-text">{details.emergency_contact_name || 'None provided'}</p>
                {details.emergency_contact_phone && (
                  <p className="text-xs text-serene-muted font-medium">{details.emergency_contact_phone}</p>
                )}
              </div>

              {details.discharge_summary_path && (
                <a
                  href={`/api/auth/documents/view/?type=patient_discharge_summary&id=${details.patient_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-serene-primary hover:underline bg-serene-container/60 px-3 py-2 rounded-xl border border-serene-outline-subtle"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Uploaded Discharge Summary</span>
                </a>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
