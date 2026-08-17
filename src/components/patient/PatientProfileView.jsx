import React, { useState } from 'react';
import { User, Phone, MapPin, ShieldCheck, FileText, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientProfileView({
  profile = {},
  onRefresh,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [phone, setPhone] = useState(profile.phone || '');
  const [houseName, setHouseName] = useState(profile.house_name || '');
  const [place, setPlace] = useState(profile.place || '');
  const [panchayath, setPanchayath] = useState(profile.panchayath || '');
  const [wardNo, setWardNo] = useState(profile.ward_no || '');
  const [pincode, setPincode] = useState(profile.pincode || '');
  const [emergencyName, setEmergencyName] = useState(profile.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergency_contact_phone || '');

  const { showSuccess, showError } = useToast();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.put('/patient/profile/', {
        phone: phone.trim(),
        house_name: houseName.trim(),
        place: place.trim(),
        panchayath: panchayath.trim(),
        ward_no: wardNo.trim(),
        pincode: pincode.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
      });
      showSuccess('Personal information updated successfully!');
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update personal details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#1e1b14]">
            My Patient Profile & Records
          </h2>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            View personal contact details and review your verified clinical registration record
          </p>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Contact Info</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#7b776c] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Profile Form / Display */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* CARD 1: PERSONAL & CONTACT INFORMATION */}
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
            <div className="p-1.5 rounded-lg bg-[#f4ede0] text-[#645e45]">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">
              Personal Information (Editable)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Full Name
              </label>
              <input
                type="text"
                disabled
                value={profile.name || ''}
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#1e1b14] cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#1e1b14] cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Phone Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 digit phone"
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45] focus:ring-1 focus:ring-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc] text-[#1e1b14]'
                }`}
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Date of Birth
              </label>
              <input
                type="text"
                disabled
                value={profile.dob || 'Not specified'}
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold text-[#1e1b14] cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                House Name / No
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45] focus:ring-1 focus:ring-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc] text-[#1e1b14]'
                }`}
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Place / Locality
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45] focus:ring-1 focus:ring-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc] text-[#1e1b14]'
                }`}
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Panchayath / Municipality
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={panchayath}
                onChange={(e) => setPanchayath(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45] focus:ring-1 focus:ring-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc] text-[#1e1b14]'
                }`}
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Ward No / Pincode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!isEditing}
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  placeholder="Ward"
                  className={`w-1/2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isEditing
                      ? 'bg-white border border-[#645e45]'
                      : 'bg-[#fdfbf7] border border-[#e0d9cc]'
                  }`}
                />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className={`w-1/2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isEditing
                      ? 'bg-white border border-[#645e45]'
                      : 'bg-[#fdfbf7] border border-[#e0d9cc]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: EMERGENCY CONTACT */}
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f2ece1]">
            <div className="p-1.5 rounded-lg bg-[#faf0ec] text-[#9c4c37]">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#1e1b14]">
              Emergency Contact Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Contact Person Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Family member / primary contact"
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc]'
                }`}
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#7b776c] mb-1 uppercase text-[10px]">
                Emergency Phone Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="10 digit contact phone"
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-white border border-[#645e45]'
                    : 'bg-[#fdfbf7] border border-[#e0d9cc]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: CLINICAL RECORD (READ-ONLY) */}
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#edf3ec] text-[#426442]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1e1b14]">
                Clinical Registration Record (Protected)
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#edf3ec] text-[#426442] border border-[#d2e2d0]">
              Doctor Verified
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
              <p><strong>Registration ID:</strong> {profile.registration_id}</p>
              <p><strong>Clinical Approval Status:</strong> {profile.registration_status}</p>
              <p className="text-[11px] text-[#7b776c]">
                Clinical diagnoses and medical parameters are managed exclusively by your assigned Doctor.
              </p>
            </div>

            {profile.discharge_summary_path && (
              <a
                href={`/api/auth/documents/view/?type=patient_discharge_summary&id=${profile.patient_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#645e45] hover:underline p-3 rounded-xl bg-[#f4ede0] border border-[#e0d9cc]"
              >
                <FileText className="w-4 h-4" />
                <span>View Uploaded Discharge Summary Document</span>
              </a>
            )}
          </div>
        </div>

        {/* Save Button if Editing */}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
