import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Award,
  Briefcase,
  Heart,
  Clock,
  Edit3,
  Save,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Hash,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  FileText,
  Activity,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';
import { getSecureDocumentUrl, openSecureDocument } from '../../utils/documentUtils';

export default function CaregiverProfileView({
  user,
  onUpdateUser,
  onRefresh,
}) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Form Edit State - Profile Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('');
  const [panchayath, setPanchayath] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [pincode, setPincode] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [certifications, setCertifications] = useState('');
  const [specialization, setSpecialization] = useState('General Palliative Care');
  const [experienceYears, setExperienceYears] = useState('1+ years');
  const [availabilityNotes, setAvailabilityNotes] = useState('');

  // Form Edit State - Password & Security
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/caregiver/profile/');
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || user?.email || '');
      setPhone(data.phone || '');
      setHouseName(data.house_name || '');
      setPlace(data.place || '');
      setPanchayath(data.panchayath || '');
      setWardNo(data.ward_no !== undefined && data.ward_no !== null ? String(data.ward_no) : '');
      setPincode(data.pincode || '');
      setQualifications(data.qualifications || '');
      setCertifications(data.certifications || '');
      setSpecialization(data.specialization || 'General Palliative Care');
      setExperienceYears(data.experience_years || '1+ years');
      setAvailabilityNotes(data.availability_notes || '');
    } catch (err) {
      console.error('Error fetching caregiver profile:', err);
      showError(err.message || 'Failed to load caregiver profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleStartEdit = () => {
    if (!profile) return;
    setName(profile.name || '');
    setEmail(profile.email || user?.email || '');
    setPhone(profile.phone || '');
    setHouseName(profile.house_name || '');
    setPlace(profile.place || '');
    setPanchayath(profile.panchayath || '');
    setWardNo(profile.ward_no !== undefined && profile.ward_no !== null ? String(profile.ward_no) : '');
    setPincode(profile.pincode || '');
    setQualifications(profile.qualifications || '');
    setCertifications(profile.certifications || '');
    setSpecialization(profile.specialization || 'General Palliative Care');
    setExperienceYears(profile.experience_years || '1+ years');
    setAvailabilityNotes(profile.availability_notes || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordOpen(false);
    setFieldErrors({});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordOpen(false);
    setFieldErrors({});
    setIsEditing(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Image size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validations
    const errors = {};
    if (!name.trim()) {
      errors.name = ["Caregiver's Full Name is required."];
    }
    if (!email.trim()) {
      errors.email = ['Email / Username is required.'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = ['Please enter a valid email address.'];
    }

    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      errors.phone = ['Phone number must be a valid 10-digit number.'];
    }
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      errors.pincode = ['Pincode must be a 6-digit number.'];
    }
    if (wardNo.trim() && isNaN(wardNo.trim())) {
      errors.ward_no = ['Ward number must be a valid integer.'];
    }

    // Password change validation if password fields filled
    if (newPassword) {
      if (!currentPassword) {
        errors.current_password = ['Current password is required to set a new password.'];
      }
      if (newPassword.length < 8) {
        errors.new_password = ['New password must be at least 8 characters long.'];
      }
      if (newPassword !== confirmPassword) {
        errors.confirm_password = ['New passwords do not match.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        house_name: houseName.trim(),
        place: place.trim(),
        panchayath: panchayath.trim(),
        ward_no: wardNo.trim() ? parseInt(wardNo.trim(), 10) : 1,
        pincode: pincode.trim(),
        qualifications: qualifications.trim(),
        certifications: certifications.trim(),
        specialization: specialization.trim(),
        experience_years: experienceYears.trim(),
        availability_notes: availabilityNotes.trim(),
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.confirm_password = confirmPassword;
      }

      const res = await apiClient.put('/caregiver/profile/', payload);
      const updatedProfile = res.profile || { ...profile, ...payload };
      setProfile(updatedProfile);
      showSuccess(res.message || 'Caregiver profile updated successfully.');

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordOpen(false);
      setIsEditing(false);

      if (onUpdateUser) {
        const freshUser = {
          ...user,
          name: updatedProfile.name,
          email: updatedProfile.email,
          details: {
            ...(user?.details || {}),
            ...updatedProfile,
          },
        };
        try {
          localStorage.setItem('user_info', JSON.stringify(freshUser));
        } catch (e) {}
        onUpdateUser(freshUser);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.data?.errors) {
        setFieldErrors(err.data.errors);
      }
      showError(err.message || 'Failed to update caregiver profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-[#e9e2d5] p-8 shadow-xs">
        <div className="w-10 h-10 border-3 border-[#645e45] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-[#7b776c]">Loading caregiver profile...</p>
      </div>
    );
  }

  const caregiverName = profile?.name || user?.name || user?.details?.name || 'Caregiver';
  const caregiverInitials = caregiverName.charAt(0).toUpperCase();
  const status = (profile?.verification_status || user?.status || 'APPROVED').toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {/* Avatar with Photo Upload */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-4 border-[#fdfbf7] overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <span>{caregiverInitials}</span>
              )}
            </div>
            {isEditing && (
              <label className="absolute -bottom-2 -right-2 bg-white text-[#645e45] hover:bg-[#f4ede0] p-2 rounded-xl border border-[#e9e2d5] shadow-md cursor-pointer transition-transform hover:scale-105">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Profile Name & Badge */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#1e1b14] tracking-tight">
                {caregiverName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                  status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {status === 'APPROVED' ? 'Verified Caregiver' : status}
              </span>
            </div>
            <p className="text-xs font-bold text-[#645e45]">
              {profile?.specialization || 'Palliative Home Care Aide'}
            </p>
            <p className="text-xs text-[#7b776c] font-medium flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-[#a8a196]" />
              <span>{profile?.email || user?.email || 'caregiver@karunagrid.org'}</span>
            </p>
          </div>
        </div>

        {/* Edit Button in Header */}
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-white bg-[#645e45] hover:bg-[#4c472f] shadow-xs transition-all cursor-pointer hover:shadow-md"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Main Profile Content: View or Edit Mode */}
      {!isEditing ? (
        /* ================= VIEW MODE ================= */
        <div className="space-y-5">
          {/* SECTION 1: PERSONAL INFORMATION & CONTACT */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Personal & Locality Information</h3>
                <p className="text-[11px] text-[#7b776c]">Basic identity, contact number, and local residence details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Full Name
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.name || 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Phone Number
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.phone || 'Not specified'}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  House / Address
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.house_name || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Place / Town
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.place || 'N/A'}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Panchayath / Municipality
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.panchayath || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Ward No & Pincode
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  Ward {profile?.ward_no || '-'}, {profile?.pincode || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROFESSIONAL QUALIFICATIONS & EXPERIENCE */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Professional Caregiving Qualifications</h3>
                <p className="text-[11px] text-[#7b776c]">Certifications, experience, specialization, and availability notes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Primary Specialization
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.specialization || 'General Palliative Care'}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Years of Experience
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.experience_years || '1+ years'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Qualifications
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.qualifications || 'Community Palliative Care Training'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Certifications
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.certifications || 'Basic Life Support & Palliative Care Aide'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] sm:col-span-2">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Availability Notes
                </p>
                <p className="text-xs text-[#4a473d]">
                  {profile?.availability_notes || 'Full-time daytime and evening home palliative support.'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: ACCOUNT & VERIFICATION DETAILS */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Account Credentials & Verification Proof</h3>
                <p className="text-[11px] text-[#7b776c]">System identifiers, login email, and verified documents</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Caregiver Code
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.caregiver_code || `KG-CGV-${String(profile?.caregiver_id || 1).padStart(4, '0')}`}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Username / Email
                </p>
                <p className="text-xs font-bold text-[#1e1b14] truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.email || user?.email}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Password Security
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Configured & Encrypted</span>
                </p>
              </div>

              {profile?.identity_proof_path && (
                <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] sm:col-span-2 lg:col-span-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-1.5">
                    Identity Proof Document
                  </p>
                  <a
                    href={getSecureDocumentUrl('caregiver_identity_proof', profile.caregiver_id)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openSecureDocument('caregiver_identity_proof', profile.caregiver_id);
                    }}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#645e45] hover:underline bg-[#f8f3eb] px-3 py-2 rounded-xl border border-[#e8dccb]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Uploaded Government ID Proof</span>
                  </a>
                </div>
              )}
            </div>

            {/* Bottom Edit Action */}
            <div className="pt-4 border-t border-[#f0eae0] flex justify-end">
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-[#645e45] hover:bg-[#4c472f] shadow-xs transition-all cursor-pointer hover:shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= EDIT MODE ================= */
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* EDIT FORM CARD */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eae0]">
              <div>
                <h3 className="text-base font-extrabold text-[#1e1b14]">Edit Caregiver Profile</h3>
                <p className="text-xs text-[#7b776c]">Update your personal details, care qualifications, and credentials</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
                title="Cancel editing"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editable Form Inputs */}
            <div className="space-y-5">
              {/* SECTION: BASIC IDENTITY */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#645e45] mb-3">
                  1. Basic Identity & Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Caregiver Full Name"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.name
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                      }`}
                    />
                    {fieldErrors.name && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.name[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Username / Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="caregiver@karunagrid.org"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.email
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.email[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Phone Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.phone
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.phone[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: ADDRESS & LOCALITY */}
              <div className="pt-4 border-t border-[#f0eae0]">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#645e45] mb-3">
                  2. Locality & Residential Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      House / Flat Name
                    </label>
                    <input
                      type="text"
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="House name"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Place / Town
                    </label>
                    <input
                      type="text"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="Town / locality"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Panchayath / Municipality
                    </label>
                    <input
                      type="text"
                      value={panchayath}
                      onChange={(e) => setPanchayath(e.target.value)}
                      placeholder="Panchayath name"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Ward Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={wardNo}
                      onChange={(e) => setWardNo(e.target.value)}
                      placeholder="e.g. 5"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.ward_no
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                      }`}
                    />
                    {fieldErrors.ward_no && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.ward_no[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Pincode (6 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="686575"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.pincode
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                      }`}
                    />
                    {fieldErrors.pincode && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.pincode[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: PROFESSIONAL QUALIFICATIONS */}
              <div className="pt-4 border-t border-[#f0eae0]">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#645e45] mb-3">
                  3. Caregiving Qualifications & Specialization
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Primary Specialization
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    >
                      <option value="General Palliative Care">General Palliative Care</option>
                      <option value="Bedridden Patient Care">Bedridden Patient Care</option>
                      <option value="Elderly & Dementia Support">Elderly & Dementia Support</option>
                      <option value="Post-operative Home Care">Post-operative Home Care</option>
                      <option value="Mobility & Rehabilitation Assistance">Mobility & Rehabilitation Assistance</option>
                      <option value="Wound Care & Hygiene Support">Wound Care & Hygiene Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Years of Experience
                    </label>
                    <select
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    >
                      <option value="Less than 1 year">Less than 1 year</option>
                      <option value="1+ years">1+ years</option>
                      <option value="2+ years">2+ years</option>
                      <option value="3+ years">3+ years</option>
                      <option value="5+ years">5+ years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Qualifications & Training
                    </label>
                    <input
                      type="text"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. Certified General Nursing Assistant, Palliative Aide Certificate"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Certifications
                    </label>
                    <input
                      type="text"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="e.g. BLS, CPR, Palliative Home Care Training (2024)"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                      Availability Notes
                    </label>
                    <textarea
                      rows={2}
                      value={availabilityNotes}
                      onChange={(e) => setAvailabilityNotes(e.target.value)}
                      placeholder="e.g. Available Monday to Saturday for daytime home care assignments..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: CHANGE PASSWORD ACCORDION */}
              <div className="pt-4 border-t border-[#f0eae0]">
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(!changePasswordOpen)}
                  className="flex items-center justify-between w-full py-2 text-left font-extrabold text-xs text-[#1e1b14] hover:text-[#645e45] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#645e45]" />
                    <span>Change Account Password (Optional)</span>
                  </div>
                  <span className="text-xs text-[#7b776c]">
                    {changePasswordOpen ? 'Hide' : 'Change password'}
                  </span>
                </button>

                {changePasswordOpen && (
                  <div className="mt-3 p-4 bg-[#fdfbf7] rounded-2xl border border-[#f0eae0] space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white pr-10 focus:outline-none focus:ring-2 ${
                            fieldErrors.current_password
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.current_password && (
                        <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.current_password[0]}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1">
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white pr-10 focus:outline-none focus:ring-2 ${
                              fieldErrors.new_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.new_password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.new_password[0]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1">
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white pr-10 focus:outline-none focus:ring-2 ${
                              fieldErrors.confirm_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.confirm_password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.confirm_password[0]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-[#f0eae0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl border border-[#e0d9cc] text-xs font-bold text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs text-white bg-[#645e45] hover:bg-[#4c472f] shadow-xs transition-all cursor-pointer hover:shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
