import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import OnboardStaffForm from '../components/OnboardStaffForm';
import { ShieldCheck, UserCheck, UserPlus, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, FileText, Stethoscope, Activity } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('verifications');

  // Caregiver Verification State
  const [pendingCaregivers, setPendingCaregivers] = useState([]);
  const [isLoadingCaregivers, setIsLoadingCaregivers] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [rejectingCaregiver, setRejectingCaregiver] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Staff Creation Form State
  const [staffRole, setStaffRole] = useState('doctor');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffHouseName, setStaffHouseName] = useState('');
  const [staffPlace, setStaffPlace] = useState('');
  const [staffPanchayath, setStaffPanchayath] = useState('');
  const [staffWardNo, setStaffWardNo] = useState('');
  const [staffPincode, setStaffPincode] = useState('');
  const [staffSpecialization, setStaffSpecialization] = useState('');
  const [staffFormErrors, setStaffFormErrors] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchPendingCaregivers = async () => {
    try {
      setIsLoadingCaregivers(true);
      const data = await apiClient.get('/admin/caregivers/pending/');
      setPendingCaregivers(data || []);
    } catch (err) {
      console.error("Failed to load pending caregivers:", err);
      showError(err.message || "Failed to load pending caregiver verification requests.");
    } finally {
      setIsLoadingCaregivers(false);
    }
  };

  useEffect(() => {
    fetchPendingCaregivers();
  }, []);

  const handleApproveCaregiver = async (caregiver) => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/admin/caregivers/${caregiver.caregiver_id}/approve/`);
      showSuccess(res.message || `Caregiver ${caregiver.name} approved successfully.`);
      setPendingCaregivers((prev) => prev.filter((c) => c.caregiver_id !== caregiver.caregiver_id));
      if (selectedCaregiver?.caregiver_id === caregiver.caregiver_id) setSelectedCaregiver(null);
    } catch (err) {
      console.error("Failed to approve caregiver:", err);
      showError(err.message || "Failed to approve caregiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCaregiverSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError("Please enter a rejection reason.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/admin/caregivers/${rejectingCaregiver.caregiver_id}/reject/`, {
        rejection_reason: rejectionReason.trim(),
      });
      showSuccess(res.message || `Caregiver ${rejectingCaregiver.name} verification rejected.`);
      setPendingCaregivers((prev) => prev.filter((c) => c.caregiver_id !== rejectingCaregiver.caregiver_id));
      setRejectingCaregiver(null);
      setRejectionReason('');
      if (selectedCaregiver?.caregiver_id === rejectingCaregiver.caregiver_id) setSelectedCaregiver(null);
    } catch (err) {
      console.error("Failed to reject caregiver:", err);
      showError(err.message || "Failed to reject caregiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStaffFormErrors({});

    try {
      const payload = {
        role: staffRole,
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        phone: staffPhone,
        house_name: staffHouseName,
        place: staffPlace,
        panchayath: staffPanchayath,
        ward_no: parseInt(staffWardNo, 10) || 0,
        pincode: staffPincode,
        specialization: staffRole === 'doctor' ? staffSpecialization : '',
      };

      const res = await apiClient.post('/admin/staff/create/', payload);
      showSuccess(res.message || `${staffRole.toUpperCase()} account created successfully!`);

      // Reset staff form
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffPhone('');
      setStaffHouseName('');
      setStaffPlace('');
      setStaffPanchayath('');
      setStaffWardNo('');
      setStaffPincode('');
      setStaffSpecialization('');
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setStaffFormErrors(err.data.errors);
      } else {
        showError(err.message || "Failed to create staff account.");
      }
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
              onClick={() => setActiveTab('verifications')}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'verifications'
                  ? 'bg-serene-primary text-white shadow-sm'
                  : 'bg-serene-container text-serene-muted hover:text-serene-text'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Pending Caregivers ({pendingCaregivers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('onboard-doctor')}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'onboard-doctor'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-serene-container text-serene-muted hover:text-serene-text'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Onboard Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('onboard-nurse')}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'onboard-nurse'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-serene-container text-serene-muted hover:text-serene-text'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Onboard Nurse</span>
            </button>
          </div>

          {activeTab === 'verifications' && (
            <button
              type="button"
              onClick={fetchPendingCaregivers}
              className="p-2 rounded-xl text-serene-muted hover:text-serene-text hover:bg-serene-container transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingCaregivers ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* TAB 1: CAREGIVER VERIFICATIONS */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-serene-text">
              Caregiver Applications Pending Administrator Verification
            </h3>

            {isLoadingCaregivers && pendingCaregivers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-serene-outline-subtle text-xs text-serene-muted font-bold">
                Loading pending caregiver applications...
              </div>
            ) : pendingCaregivers.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-serene-outline-subtle space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-extrabold text-base text-serene-text">All Caregiver Applications Verifications Complete</h4>
                <p className="text-xs text-serene-muted max-w-sm mx-auto">
                  There are currently no pending caregiver applications requiring admin verification.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCaregivers.map((caregiver) => (
                  <div
                    key={caregiver.caregiver_id}
                    className="bg-white rounded-2xl border border-serene-outline-subtle p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-base text-serene-text">{caregiver.name}</h4>
                          <p className="text-xs text-serene-muted font-semibold">{caregiver.email}</p>
                        </div>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                          Pending Verification
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-serene-text">
                        <p><span className="font-semibold text-serene-muted">Phone:</span> {caregiver.phone}</p>
                        <p><span className="font-semibold text-serene-muted">Location:</span> {caregiver.place}, {caregiver.panchayath} (Ward {caregiver.ward_no}, {caregiver.pincode})</p>
                        {caregiver.qualifications && <p><span className="font-semibold text-serene-muted">Qualifications:</span> {caregiver.qualifications}</p>}
                        {caregiver.specialization && <p><span className="font-semibold text-serene-muted">Specialization:</span> {caregiver.specialization}</p>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-serene-outline-subtle/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCaregiver(caregiver)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-serene-primary bg-serene-container hover:bg-serene-primary hover:text-white rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Identity Proof</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRejectingCaregiver(caregiver)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveCaregiver(caregiver)}
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
        )}

        {/* TAB 2: ONBOARD DOCTOR */}
        {activeTab === 'onboard-doctor' && (
          <OnboardStaffForm role="doctor" />
        )}

        {/* TAB 3: ONBOARD NURSE */}
        {activeTab === 'onboard-nurse' && (
          <OnboardStaffForm role="nurse" />
        )}

        {/* DETAIL & IDENTITY PROOF VIEW MODAL */}
        {selectedCaregiver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-serene-outline-subtle">
              <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-3">
                <h3 className="font-extrabold text-lg text-serene-text">Caregiver Application Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedCaregiver(null)}
                  className="text-serene-muted hover:text-serene-text font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-serene-text">
                <p><strong className="text-serene-muted">Full Name:</strong> {selectedCaregiver.name}</p>
                <p><strong className="text-serene-muted">Email:</strong> {selectedCaregiver.email}</p>
                <p><strong className="text-serene-muted">Phone:</strong> {selectedCaregiver.phone}</p>
                <p><strong className="text-serene-muted">Address:</strong> {selectedCaregiver.house_name}, {selectedCaregiver.place}, {selectedCaregiver.panchayath}, Ward {selectedCaregiver.ward_no}, {selectedCaregiver.pincode}</p>
                {selectedCaregiver.qualifications && <p><strong className="text-serene-muted">Qualifications:</strong> {selectedCaregiver.qualifications}</p>}
                {selectedCaregiver.certifications && <p><strong className="text-serene-muted">Certifications:</strong> {selectedCaregiver.certifications}</p>}
                {selectedCaregiver.specialization && <p><strong className="text-serene-muted">Specialization:</strong> {selectedCaregiver.specialization}</p>}
                {selectedCaregiver.availability_notes && <p><strong className="text-serene-muted">Availability:</strong> {selectedCaregiver.availability_notes}</p>}

                <div className="pt-3 border-t border-serene-outline-subtle">
                  <h4 className="font-extrabold text-serene-text mb-2">Identity Proof Document</h4>
                  {selectedCaregiver.identity_proof_url ? (
                    <a
                      href={selectedCaregiver.identity_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-serene-primary rounded-xl shadow-sm hover:bg-serene-primary-hover transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Open Secure Caregiver Identity Proof Document</span>
                    </a>
                  ) : (
                    <p className="text-rose-600 font-bold">No document uploaded.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-serene-outline-subtle flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCaregiver(null)}
                  className="px-4 py-2 text-xs font-bold text-serene-muted hover:text-serene-text"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION REASON FORM MODAL */}
        {rejectingCaregiver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <form onSubmit={handleRejectCaregiverSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-serene-outline-subtle">
              <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-3">
                <h3 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Reject Caregiver Verification
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectingCaregiver(null)}
                  className="text-serene-muted hover:text-serene-text font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-serene-muted font-medium">
                Rejecting verification for <strong>{rejectingCaregiver.name}</strong>. Please state the exact reason for rejection:
              </p>

              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Uploaded identity proof document is incomplete or blurry."
                className="w-full p-3 text-xs border border-serene-outline-subtle rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingCaregiver(null)}
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
