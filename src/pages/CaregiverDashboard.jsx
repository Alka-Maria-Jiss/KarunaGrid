import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AlertCircle, CheckCircle2, Clock, Heart, Phone, MapPin, FileText, Award } from 'lucide-react';

export default function CaregiverDashboard({ user, onLogout }) {
  const status = (user?.status || 'PENDING').toUpperCase();
  const rejectionReason = user?.rejection_reason;
  const details = user?.details || {};

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        
        {/* PROMINENT VERIFICATION STATUS BANNER */}
        {status === 'PENDING' && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-4 shadow-sm">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-amber-950">Verification Pending Administrator Review</h3>
              <p className="text-xs sm:text-sm text-amber-900 mt-1 font-medium leading-relaxed">
                Your caregiver application and identity proof document are currently being reviewed by a KarunaGrid administrator. You will receive an in-app notification once your account is verified.
              </p>
            </div>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-4 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-emerald-950">Account Verified — Ready for Caregiver Assignments</h3>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 font-medium leading-relaxed">
                Congratulations! Your caregiver profile is verified. You can now receive home visit assignments and care coordination requests.
              </p>
            </div>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-base text-rose-950">Verification Not Approved</h3>
              <p className="text-xs sm:text-sm text-rose-900 mt-1 font-medium leading-relaxed">
                Your caregiver verification application was reviewed and could not be approved at this time.
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
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-serene-text">{user?.name || 'Caregiver'}</h2>
                <p className="text-xs text-serene-muted font-semibold">{user?.email}</p>
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
            {/* Contact & Address */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Contact & Location</h4>
              <p className="text-sm font-semibold text-serene-text">Phone: <span className="font-normal">{details.phone || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">House: <span className="font-normal">{details.house_name || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Place: <span className="font-normal">{details.place || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Panchayath: <span className="font-normal">{details.panchayath || 'N/A'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Ward / Pincode: <span className="font-normal">Ward {details.ward_no || '-'}, {details.pincode || '-'}</span></p>
            </div>

            {/* Qualifications & Specializations */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Professional Profile</h4>
              <p className="text-sm font-semibold text-serene-text">Qualifications: <span className="font-normal">{details.qualifications || 'None listed'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Certifications: <span className="font-normal">{details.certifications || 'None listed'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Specialization: <span className="font-normal">{details.specialization || 'General Care'}</span></p>
              <p className="text-sm font-semibold text-serene-text">Availability: <span className="font-normal">{details.availability_notes || 'Flexible'}</span></p>
            </div>

            {/* Identity Proof Document */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">Verification Document</h4>
              {details.identity_proof_path && (
                <a
                  href={`/api/auth/documents/view/?type=caregiver_identity_proof&id=${details.caregiver_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-serene-primary hover:underline bg-serene-container/60 px-3 py-2.5 rounded-xl border border-serene-outline-subtle"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Uploaded Identity Proof Document</span>
                </a>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
