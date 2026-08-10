import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Stethoscope, UserCheck, FileText, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, Phone, MapPin } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';

export default function DoctorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('approvals');
  const [pendingPatients, setPendingPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Rejection modal state
  const [rejectingPatient, setRejectingPatient] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchPendingPatients = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/doctor/patients/pending/');
      setPendingPatients(data || []);
    } catch (err) {
      console.error("Failed to load pending patients:", err);
      showError(err.message || "Failed to load pending patient registrations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPatients();
  }, []);

  const handleApprove = async (patient) => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/doctor/patients/${patient.patient_id}/approve/`);
      showSuccess(res.message || `Patient ${patient.name} approved successfully.`);
      setPendingPatients((prev) => prev.filter((p) => p.patient_id !== patient.patient_id));
      if (selectedPatient?.patient_id === patient.patient_id) setSelectedPatient(null);
    } catch (err) {
      console.error("Failed to approve patient:", err);
      showError(err.message || "Failed to approve patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError("Please enter a rejection reason.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/doctor/patients/${rejectingPatient.patient_id}/reject/`, {
        rejection_reason: rejectionReason.trim(),
      });
      showSuccess(res.message || `Patient ${rejectingPatient.name} registration rejected.`);
      setPendingPatients((prev) => prev.filter((p) => p.patient_id !== rejectingPatient.patient_id));
      setRejectingPatient(null);
      setRejectionReason('');
      if (selectedPatient?.patient_id === rejectingPatient.patient_id) setSelectedPatient(null);
    } catch (err) {
      console.error("Failed to reject patient:", err);
      showError(err.message || "Failed to reject patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        
        {/* TOP TAB CONTROL */}
        <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'approvals'
                  ? 'bg-serene-primary text-white shadow-sm'
                  : 'bg-serene-container text-serene-muted hover:text-serene-text'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Pending Patient Approvals ({pendingPatients.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-serene-primary text-white shadow-sm'
                  : 'bg-serene-container text-serene-muted hover:text-serene-text'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Overview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchPendingPatients}
            className="p-2 rounded-xl text-serene-muted hover:text-serene-text hover:bg-serene-container transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {activeTab === 'approvals' ? (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-serene-text">
              Patient Registration Requests Requiring Review
            </h3>

            {isLoading && pendingPatients.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-serene-outline-subtle text-xs text-serene-muted font-bold">
                Loading pending registrations...
              </div>
            ) : pendingPatients.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-serene-outline-subtle space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-extrabold text-base text-serene-text">All Patient Reviews Caught Up</h4>
                <p className="text-xs text-serene-muted max-w-sm mx-auto">
                  There are currently no pending patient registrations requiring doctor review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPatients.map((patient) => (
                  <div
                    key={patient.patient_id}
                    className="bg-white rounded-2xl border border-serene-outline-subtle p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-base text-serene-text">{patient.name}</h4>
                          <p className="text-xs text-serene-muted font-semibold">Reg ID: {patient.registration_id}</p>
                        </div>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                          Pending Review
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-serene-text">
                        <p><span className="font-semibold text-serene-muted">Email:</span> {patient.email}</p>
                        <p><span className="font-semibold text-serene-muted">Phone:</span> {patient.phone}</p>
                        <p><span className="font-semibold text-serene-muted">DOB:</span> {patient.dob} | <span className="font-semibold text-serene-muted">Gender:</span> {patient.gender}</p>
                        <p><span className="font-semibold text-serene-muted">Location:</span> {patient.place}, {patient.panchayath} (Ward {patient.ward_no})</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-serene-outline-subtle/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(patient)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-serene-primary bg-serene-container hover:bg-serene-primary hover:text-white rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRejectingPatient(patient)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(patient)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* DOCTOR OVERVIEW TAB */
          <div className="bg-white rounded-2xl border border-serene-outline-subtle p-6 space-y-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-serene-text">Doctor Profile & Network Overview</h3>
            <p className="text-xs text-serene-muted">Welcome, Dr. {user?.name}. Your verified medical profile is active on KarunaGrid.</p>
          </div>
        )}

        {/* DETAIL & DISCHARGE SUMMARY VIEW MODAL */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-serene-outline-subtle">
              <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-3">
                <h3 className="font-extrabold text-lg text-serene-text">Patient Registration Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-serene-muted hover:text-serene-text font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-serene-text">
                <p><strong className="text-serene-muted">Full Name:</strong> {selectedPatient.name}</p>
                <p><strong className="text-serene-muted">Registration ID:</strong> {selectedPatient.registration_id}</p>
                <p><strong className="text-serene-muted">Email:</strong> {selectedPatient.email}</p>
                <p><strong className="text-serene-muted">Phone:</strong> {selectedPatient.phone}</p>
                <p><strong className="text-serene-muted">DOB:</strong> {selectedPatient.dob} ({selectedPatient.gender})</p>
                <p><strong className="text-serene-muted">Address:</strong> {selectedPatient.house_name}, {selectedPatient.place}, {selectedPatient.panchayath}, Ward {selectedPatient.ward_no}, {selectedPatient.pincode}</p>
                {selectedPatient.emergency_contact_name && (
                  <p><strong className="text-serene-muted">Emergency Contact:</strong> {selectedPatient.emergency_contact_name} ({selectedPatient.emergency_contact_phone})</p>
                )}

                <div className="pt-3 border-t border-serene-outline-subtle">
                  <h4 className="font-extrabold text-serene-text mb-2">Discharge Summary / Referral Document</h4>
                  {selectedPatient.discharge_summary_url ? (
                    <a
                      href={selectedPatient.discharge_summary_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-serene-primary rounded-xl shadow-sm hover:bg-serene-primary-hover transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Open Secure Medical Discharge Summary Document</span>
                    </a>
                  ) : (
                    <p className="text-rose-600 font-bold">No document uploaded.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-serene-outline-subtle flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-serene-muted hover:text-serene-text"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION REASON FORM MODAL */}
        {rejectingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <form onSubmit={handleRejectSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-serene-outline-subtle">
              <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-3">
                <h3 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Reject Patient Registration
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectingPatient(null)}
                  className="text-serene-muted hover:text-serene-text font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-serene-muted font-medium">
                Rejecting registration for <strong>{rejectingPatient.name}</strong>. Please state the exact reason for rejection (this will be communicated in their in-app status notification):
              </p>

              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Discharge summary document is unreadable or missing required referral signature."
                className="w-full p-3 text-xs border border-serene-outline-subtle rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-serene-muted hover:text-serene-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm"
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
