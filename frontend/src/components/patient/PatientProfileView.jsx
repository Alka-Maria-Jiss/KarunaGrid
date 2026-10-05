import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Camera,
  Hash,
  HeartHandshake,
  Stethoscope,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientProfileView({
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

  // Form State - Demographic & Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('');
  const [panchayath, setPanchayath] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [pincode, setPincode] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Form State - Password & Security
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
      const data = await apiClient.get('/patient/profile/');
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || user?.email || '');
      setGender(data.gender || 'Male');
      setDob(data.date_of_birth || data.dob || '');
      setPhone(data.phone || '');
      setHouseName(data.house_name || '');
      setPlace(data.place || '');
      setPanchayath(data.panchayath || '');
      setWardNo(data.ward_no || '');
      setPincode(data.pincode || '');
      setEmergencyName(data.emergency_contact_name || '');
      setEmergencyPhone(data.emergency_contact_phone || '');
    } catch (err) {
      console.error('Error fetching patient profile:', err);
      showError(err.message || 'Failed to load profile details.');
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
    setGender(profile.gender || 'Male');
    setDob(profile.date_of_birth || profile.dob || '');
    setPhone(profile.phone || '');
    setHouseName(profile.house_name || '');
    setPlace(profile.place || '');
    setPanchayath(profile.panchayath || '');
    setWardNo(profile.ward_no || '');
    setPincode(profile.pincode || '');
    setEmergencyName(profile.emergency_contact_name || '');
    setEmergencyPhone(profile.emergency_contact_phone || '');
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
      errors.name = ['Full Name is required.'];
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
    if (emergencyPhone.trim() && !/^\d{10}$/.test(emergencyPhone.trim())) {
      errors.emergency_contact_phone = ['Emergency contact phone must be a 10-digit number.'];
    }
    if (dob) {
      const parsedDob = new Date(dob);
      if (parsedDob >= new Date()) {
        errors.date_of_birth = ['Date of birth must be a past date.'];
      }
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
        gender: gender.trim(),
        date_of_birth: dob || null,
        house_name: houseName.trim(),
        place: place.trim(),
        panchayath: panchayath.trim(),
        ward_no: wardNo.trim(),
        pincode: pincode.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.confirm_password = confirmPassword;
      }

      const res = await apiClient.put('/patient/profile/', payload);
      const updatedProfile = res.profile || { ...profile, ...payload };
      setProfile(updatedProfile);
      showSuccess(res.message || 'Profile updated successfully.');

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordOpen(false);
      setIsEditing(false);

      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          name: updatedProfile.name,
          email: updatedProfile.email,
        });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.data?.errors) {
        setFieldErrors(err.data.errors);
      }
      showError(err.message || 'Failed to update patient profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-[#e9e2d5] p-8 shadow-xs">
        <div className="w-10 h-10 border-3 border-[#645e45] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-[#7b776c]">Loading patient profile...</p>
      </div>
    );
  }

  const patientName = profile?.name || user?.name || 'Patient';
  const patientInitials = patientName.charAt(0).toUpperCase();

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
                <span>{patientInitials}</span>
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

          {/* Profile Name & Badges */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#1e1b14] tracking-tight">
                {patientName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase bg-[#edf3ec] text-[#426442] rounded-full border border-[#d2e2d0]">
                <CheckCircle2 className="w-3 h-3" />
                {profile?.registration_status || 'Registered Patient'}
              </span>
            </div>
            <p className="text-xs font-bold text-[#645e45]">
              {profile?.place ? `${profile.place}, ` : ''}{profile?.panchayath || 'Palliative Home Care'}
            </p>
            <p className="text-xs text-[#7b776c] font-medium flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-[#a8a196]" />
              <span>{profile?.email || user?.email || 'patient@karunagrid.org'}</span>
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
          {/* SECTION 1: PERSONAL INFORMATION */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Personal & Contact Details</h3>
                <p className="text-[11px] text-[#7b776c]">Basic identification and direct contact information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  Gender
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.gender || 'Male'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Date of Birth
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.date_of_birth || profile?.dob || 'Not specified'}</span>
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
            </div>
          </div>

          {/* SECTION 2: RESIDENTIAL & EMERGENCY ADDRESS */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Residential Address & Emergency Contact</h3>
                <p className="text-[11px] text-[#7b776c]">Panchayath location for home visit allocation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  House Name / Building
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.house_name || 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Place / Locality
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.place || 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Panchayath / Ward / Pincode
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.panchayath ? `${profile.panchayath}, Ward ${profile?.ward_no || '-'}, ${profile?.pincode || ''}` : 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Emergency Contact Person
                </p>
                <p className="text-xs font-bold text-[#1e1b14]">
                  {profile?.emergency_contact_name || 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Emergency Contact Phone
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#ba1a1a]" />
                  <span>{profile?.emergency_contact_phone || 'Not specified'}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Assigned Doctor
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.doctor_name || 'Dr. Assigned Care Physician'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: ACCOUNT & SECURITY INFORMATION */}
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1e1b14]">Account Information</h3>
                <p className="text-[11px] text-[#7b776c]">System credentials and login credentials</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Username / Email
                </p>
                <p className="text-xs font-bold text-[#1e1b14] truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>{profile?.email || user?.email || 'patient@karunagrid.org'}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Care Program
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#645e45]" />
                  <span>Palliative Home Care</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Registration Status
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-xs font-extrabold text-emerald-700">
                    {profile?.registration_status || 'Approved'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0]">
                <p className="text-[10px] font-extrabold uppercase text-[#7b776c] tracking-wider mb-0.5">
                  Password Status
                </p>
                <p className="text-xs font-bold text-[#1e1b14] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Configured & Encrypted</span>
                </p>
              </div>
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
                <h3 className="text-base font-extrabold text-[#1e1b14]">Edit Patient Profile</h3>
                <p className="text-xs text-[#7b776c]">Update your personal, address, and login credentials</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors"
                title="Cancel editing"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editable Form Inputs */}
            <div className="space-y-5">
              {/* Full Name & Username/Email */}
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
                    placeholder="e.g. John Doe"
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
                    placeholder="patient@karunagrid.org"
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
              </div>

              {/* Gender, Date of Birth, and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.date_of_birth
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                    }`}
                  />
                  {fieldErrors.date_of_birth && (
                    <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.date_of_birth[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Phone Number <span className="font-normal text-[#7b776c] lowercase">(10 digits)</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
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

              {/* Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    House Name / Building
                  </label>
                  <input
                    type="text"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    placeholder="e.g. Karuna Villa"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Place / Locality
                  </label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g. Chevayur"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Panchayath
                  </label>
                  <input
                    type="text"
                    value={panchayath}
                    onChange={(e) => setPanchayath(e.target.value)}
                    placeholder="e.g. Kozhikode"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Ward No
                  </label>
                  <input
                    type="text"
                    value={wardNo}
                    onChange={(e) => setWardNo(e.target.value)}
                    placeholder="12"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  />
                </div>
              </div>

              {/* Pincode & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="673017"
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

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Sarah Doe"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.emergency_contact_phone
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-[#e0d9cc] focus:border-[#645e45] focus:ring-[#f4ede0]'
                    }`}
                  />
                  {fieldErrors.emergency_contact_phone && (
                    <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.emergency_contact_phone[0]}</p>
                  )}
                </div>
              </div>

              {/* PASSWORD / SECURITY CHANGE SECTION */}
              <div className="pt-2 border-t border-[#f0eae0]">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#645e45]" />
                    <span className="text-xs font-extrabold text-[#1e1b14]">Change Password</span>
                    <span className="text-[10px] text-[#7b776c] font-normal">(Optional)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordOpen(!changePasswordOpen);
                      if (changePasswordOpen) {
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }
                    }}
                    className="text-xs font-bold text-[#645e45] hover:text-[#4c472f] underline cursor-pointer"
                  >
                    {changePasswordOpen ? 'Hide Password Fields' : 'Update Password'}
                  </button>
                </div>

                {changePasswordOpen && (
                  <div className="mt-3 p-4 rounded-2xl bg-[#fdfbf7] border border-[#e0d9cc] space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-extrabold text-[#1e1b14] mb-1">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full px-4 py-2 pr-10 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.current_password
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-[#e0d9cc] focus:border-[#645e45]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b776c] hover:text-[#1e1b14]"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.current_password && (
                        <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.current_password[0]}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-[#1e1b14] mb-1">
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className={`w-full px-4 py-2 pr-10 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.new_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-[#e0d9cc] focus:border-[#645e45]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b776c] hover:text-[#1e1b14]"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.new_password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.new_password[0]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-[#1e1b14] mb-1">
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-4 py-2 pr-10 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.confirm_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-[#e0d9cc] focus:border-[#645e45]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b776c] hover:text-[#1e1b14]"
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

            {/* Read-Only Clinical System Fields Notice */}
            <div className="p-4 rounded-2xl bg-[#f8f5ee] border border-[#e9e2d5] space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#7b776c]" />
                <h4 className="text-xs font-extrabold text-[#1e1b14]">Protected Clinical & System Fields (Read-Only)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#7b776c] uppercase block">Care Program</span>
                  <span className="font-semibold text-[#4a473d] block">Palliative Home Care</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#7b776c] uppercase block">Account Status</span>
                  <span className="font-semibold text-emerald-700 block">Verified & Active</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#7b776c] uppercase block">Clinical Status</span>
                  <span className="font-semibold text-[#4a473d] block">{profile?.registration_status || 'Approved'}</span>
                </div>
              </div>
            </div>

            {/* Form Action Buttons: Cancel and Save Changes */}
            <div className="pt-4 border-t border-[#f0eae0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs text-[#7b776c] bg-[#f4ede0] hover:bg-[#eee7da] hover:text-[#1e1b14] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs text-white bg-[#645e45] hover:bg-[#4c472f] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
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
