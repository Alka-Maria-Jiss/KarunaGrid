import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  HeartHandshake,
  User,
  Activity,
  ShieldCheck,
  X,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Upload,
  Check,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import apiClient from '../api/apiClient';

const authRoles = [
  {
    id: 'patient',
    title: 'Patient Portal',
    icon: User,
    canRegister: true,
  },
  {
    id: 'caregiver',
    title: 'Caregiver Portal',
    icon: HeartHandshake,
    canRegister: true,
  },
  {
    id: 'doctor',
    title: 'Doctor Portal',
    icon: Stethoscope,
    canRegister: false,
  },
  {
    id: 'nurse',
    title: 'Nurse Portal',
    icon: Activity,
    canRegister: false,
  },
  {
    id: 'admin',
    title: 'Admin Portal',
    icon: ShieldCheck,
    canRegister: false,
  },
];

export default function RoleLoginModal({
  isOpen,
  onClose,
  initialTab = 'login',
  defaultRole = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedRoleId, setSelectedRoleId] = useState('patient');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');

  // Structured Address State (5 fields)
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('');
  const [panchayath, setPanchayath] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [pincode, setPincode] = useState('');

  // Patient Specific: Discharge Summary Document & Emergency Contact
  const [dischargeSummaryFile, setDischargeSummaryFile] = useState(null);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Caregiver Specific
  const [qualifications, setQualifications] = useState('');
  const [certifications, setCertifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [identityProofFile, setIdentityProofFile] = useState(null);

  // Status & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error'); // 'error' | 'success' | 'warning'
  const [rejectionReason, setRejectionReason] = useState(null);

  useEffect(() => {
    const nextTab = initialTab || 'login';
    setActiveTab(nextTab);
    if (nextTab === 'register' && !authRoles.find((r) => r.id === selectedRoleId)?.canRegister) {
      setSelectedRoleId('patient');
    }
    resetForm();
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (defaultRole) {
      if (activeTab === 'register' && !authRoles.find((r) => r.id === defaultRole)?.canRegister) {
        setSelectedRoleId('patient');
      } else {
        setSelectedRoleId(defaultRole);
      }
    } else if (activeTab === 'register' && !authRoles.find((r) => r.id === selectedRoleId)?.canRegister) {
      setSelectedRoleId('patient');
    }
  }, [defaultRole, isOpen, activeTab]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setPhone('');
    setDob('');
    setHouseName('');
    setPlace('');
    setPanchayath('');
    setWardNo('');
    setPincode('');
    setDischargeSummaryFile(null);
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setQualifications('');
    setCertifications('');
    setSpecialization('');
    setAvailabilityNotes('');
    setIdentityProofFile(null);
    setFieldErrors({});
    setBannerMessage(null);
    setRejectionReason(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  if (!isOpen) return null;

  // Filter roles based on active tab
  const displayedRoles = activeTab === 'register' ? authRoles.filter((r) => r.canRegister) : authRoles;
  const currentRoleObj = authRoles.find((r) => r.id === selectedRoleId) || authRoles[0];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'register' && !authRoles.find((r) => r.id === selectedRoleId)?.canRegister) {
      setSelectedRoleId('patient');
    }
    resetForm();
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    setFieldErrors({});
    setBannerMessage(null);
  };

  const validateClientRules = () => {
    const errors = {};

    if (activeTab === 'register') {
      // 1. Password Match
      if (password !== confirmPassword) {
        errors.confirm_password = ['Passwords do not match.'];
      }

      // 2. Phone validation (10-digit)
      if (!/^\d{10}$/.test(phone.trim())) {
        errors.phone = ['Phone number must be a valid 10-digit number.'];
      }

      // 3. Pincode validation (6-digit)
      if (!/^\d{6}$/.test(pincode.trim())) {
        errors.pincode = ['Pincode must be a valid 6-digit number.'];
      }

      // 4. Patient specific validations
      if (selectedRoleId === 'patient') {
        if (!dob) {
          errors.dob = ['Date of birth is required.'];
        } else {
          const dobDate = new Date(dob);
          const today = new Date();
          if (dobDate >= today) {
            errors.dob = ['Date of birth must be a past date.'];
          }
        }

        if (!dischargeSummaryFile) {
          errors.discharge_summary = ['Discharge summary / referral document is required.'];
        } else {
          const validExts = ['pdf', 'jpg', 'jpeg', 'png'];
          const fileExt = dischargeSummaryFile.name.split('.').pop().toLowerCase();
          if (!validExts.includes(fileExt)) {
            errors.discharge_summary = ['Unsupported file format. Please upload a PDF, JPG, or PNG file.'];
          } else if (dischargeSummaryFile.size > 5 * 1024 * 1024) {
            errors.discharge_summary = ['File size exceeds maximum limit of 5MB.'];
          }
        }

        if (emergencyContactPhone.trim() && !/^\d{10}$/.test(emergencyContactPhone.trim())) {
          errors.emergency_contact_phone = ['Emergency contact phone number must be a 10-digit number.'];
        }
      }

      // 5. Caregiver specific validations
      if (selectedRoleId === 'caregiver') {
        if (!identityProofFile) {
          errors.identity_proof = ['Identity proof document is required.'];
        } else {
          const validExts = ['pdf', 'jpg', 'jpeg', 'png'];
          const fileExt = identityProofFile.name.split('.').pop().toLowerCase();
          if (!validExts.includes(fileExt)) {
            errors.identity_proof = ['Unsupported file format. Please upload a PDF, JPG, or PNG file.'];
          } else if (identityProofFile.size > 5 * 1024 * 1024) {
            errors.identity_proof = ['File size exceeds maximum limit of 5MB.'];
          }
        }
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setBannerMessage(null);
    setRejectionReason(null);

    // Run client-side validations
    const clientErrors = validateClientRules();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === 'login') {
        // LOGIN SUBMISSION via apiClient
        const data = await apiClient.post('/auth/login/', { email, password });

        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        setBannerType('success');
        setBannerMessage(`Welcome back, ${data.user.name || data.user.email}! Access granted.`);
        setTimeout(() => {
          onClose();
          const userRole = (data.user.role || 'patient').toLowerCase();
          window.history.pushState({}, '', `/dashboard/${userRole}`);
          window.dispatchEvent(new Event('popstate'));
        }, 800);
      } else {
        // REGISTER SUBMISSION via apiClient with FormData
        const formData = new FormData();
        formData.append('role', selectedRoleId);
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('confirm_password', confirmPassword);
        formData.append('phone', phone);
        formData.append('house_name', houseName);
        formData.append('place', place);
        formData.append('panchayath', panchayath);
        formData.append('ward_no', wardNo);
        formData.append('pincode', pincode);

        if (selectedRoleId === 'patient') {
          formData.append('dob', dob);
          if (dischargeSummaryFile) {
            formData.append('discharge_summary', dischargeSummaryFile);
          }
          if (emergencyContactName) formData.append('emergency_contact_name', emergencyContactName);
          if (emergencyContactPhone) formData.append('emergency_contact_phone', emergencyContactPhone);
        } else {
          if (qualifications) formData.append('qualifications', qualifications);
          if (certifications) formData.append('certifications', certifications);
          if (specialization) formData.append('specialization', specialization);
          if (availabilityNotes) formData.append('availability_notes', availabilityNotes);
          if (identityProofFile) {
            formData.append('identity_proof', identityProofFile);
          }
        }

        const data = await apiClient.post('/auth/register/', formData);

        setBannerType('success');
        setBannerMessage(data.message || 'Account created successfully! Your registration is pending administrator approval.');
        resetForm();
      }
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else if (err.status === 403) {
        setBannerType('warning');
        setBannerMessage(err.message || 'Your account is pending administrator approval.');
        if (err.data?.rejection_reason) {
          setRejectionReason(err.data.rejection_reason);
        }
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isNonSelfRegisterRole = activeTab === 'register' && !currentRoleObj.canRegister;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-serene-text/50 backdrop-blur-md"
        />

        {/* Responsive Desktop Panel Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-[1040px] max-h-[90vh] bg-serene-bg rounded-2xl sm:rounded-3xl shadow-2xl border border-serene-outline-subtle p-5 sm:p-8 md:p-10 z-10 my-auto flex flex-col overflow-hidden transition-all duration-300"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-serene-outline-subtle/70 pb-3.5 mb-5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="serene-tag text-xs font-bold px-3 py-1 bg-serene-container text-serene-primary border border-serene-outline-subtle">
                KarunaGrid Care Network
              </span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-serene-container p-1 rounded-full border border-serene-outline-subtle">
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className={`py-1.5 sm:py-2 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'login'
                      ? 'bg-serene-primary text-white shadow-md'
                      : 'text-serene-muted hover:text-serene-text'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Portal Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`py-1.5 sm:py-2 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'register'
                      ? 'bg-serene-primary text-white shadow-md'
                      : 'text-serene-muted hover:text-serene-text'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-serene-muted hover:text-serene-text hover:bg-serene-container transition-colors ml-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Page Title & Subtitle */}
          <div className="mb-5 shrink-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-serene-text tracking-tight">
              {activeTab === 'login'
                ? 'Welcome back to KarunaGrid'
                : 'Join KarunaGrid Care Network'}
            </h2>
            <p className="text-serene-muted text-xs sm:text-sm md:text-base mt-1 font-medium">
              {activeTab === 'login'
                ? 'Select your care portal and sign in to access your dashboard.'
                : 'Select your registration portal and create your account.'}
            </p>
          </div>

          {/* Scrollable Content Container */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-5">

            {/* Banner Messages */}
            {bannerMessage && (
              <div
                className={`p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-3 ${
                  bannerType === 'success'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : bannerType === 'warning'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'bg-rose-100 text-rose-950 border border-rose-300'
                }`}
              >
                {bannerType === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{bannerMessage}</p>
                  {rejectionReason && (
                    <p className="mt-1 pt-1 border-t border-amber-300/60 font-normal text-xs text-rose-800">
                      <strong>Rejection Reason:</strong> {rejectionReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Role Selection Cards */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-serene-muted mb-2.5">
                Select Your Role
              </label>

              <div
                className={`grid gap-3 ${
                  activeTab === 'register'
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                }`}
              >
                {displayedRoles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-serene-container border-2 border-serene-primary shadow-sm'
                          : 'bg-serene-low hover:bg-serene-container/60 border border-serene-outline-subtle'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl transition-colors ${
                            isSelected
                              ? 'bg-serene-primary text-white shadow-sm'
                              : 'bg-white text-serene-primary border border-serene-outline-subtle/60'
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                        </div>
                        <h3 className="font-extrabold text-serene-text text-xs sm:text-sm md:text-base leading-snug">
                          {role.title}
                        </h3>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-serene-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NON-SELF-REGISTER ROLE NOTICE IN REGISTER TAB */}
            {isNonSelfRegisterRole ? (
              <div className="p-6 sm:p-8 bg-serene-container/80 border border-serene-outline-subtle rounded-2xl text-center flex flex-col items-center my-4">
                <div className="p-3 bg-white text-serene-primary rounded-full mb-3 shadow-sm border border-serene-outline-subtle">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base sm:text-lg md:text-xl text-serene-text mb-1.5">
                  Administrative Registration
                </h4>
                <p className="text-xs sm:text-sm text-serene-muted max-w-md mb-5 leading-relaxed font-medium">
                  Registration for {currentRoleObj.title} is managed directly by the network administrator.
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="btn-serene-primary text-xs sm:text-sm px-6 sm:px-8 py-3 font-bold shadow-md flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Go to Portal Login</span>
                </button>
              </div>
            ) : (
              /* AUTHENTICATION / REGISTRATION FORM */
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                
                {/* Form Layout Grid */}
                <div className={activeTab === 'login' ? 'max-w-lg mx-auto w-full space-y-4 py-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  
                  {/* EMAIL ADDRESS */}
                  <div>
                    <label className="block text-xs font-bold text-serene-text mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.email
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold">
                        {fieldErrors.email[0]}
                      </p>
                    )}
                  </div>

                  {/* PASSWORD WITH EYE TOGGLE */}
                  <div>
                    <label className="block text-xs font-bold text-serene-text mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-3.5 py-2.5 sm:py-3 pr-11 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.password
                            ? 'border-rose-400 focus:ring-rose-200'
                            : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <div className="text-rose-600 text-xs mt-1 font-semibold space-y-0.5">
                        {fieldErrors.password.map((err, idx) => (
                          <p key={idx}>{err}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ADDITIONAL FIELDS FOR REGISTRATION MODE */}
                  {activeTab === 'register' && (
                    <>
                      {/* CONFIRM PASSWORD WITH EYE TOGGLE */}
                      <div>
                        <label className="block text-xs font-bold text-serene-text mb-1">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-3.5 py-2.5 sm:py-3 pr-11 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.confirm_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.confirm_password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">
                            {fieldErrors.confirm_password[0]}
                          </p>
                        )}
                      </div>

                      {/* FULL NAME */}
                      <div>
                        <label className="block text-xs font-bold text-serene-text mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.name
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">
                            {fieldErrors.name[0]}
                          </p>
                        )}
                      </div>

                      {/* PHONE NUMBER */}
                      <div>
                        <label className="block text-xs font-bold text-serene-text mb-1">
                          Phone Number <span className="text-rose-500">*</span>{' '}
                          <span className="font-normal text-xs text-serene-muted">(10 digits)</span>
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.phone
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                          }`}
                        />
                        {fieldErrors.phone && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">
                            {fieldErrors.phone[0]}
                          </p>
                        )}
                      </div>

                      {/* PATIENT DOB */}
                      {selectedRoleId === 'patient' && (
                        <div>
                          <label className="block text-xs font-bold text-serene-text mb-1">
                            Date of Birth <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.dob
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                            }`}
                          />
                          {fieldErrors.dob && (
                            <p className="text-rose-600 text-xs mt-1 font-semibold">
                              {fieldErrors.dob[0]}
                            </p>
                          )}
                        </div>
                      )}

                      {/* STRUCTURED ADDRESS SECTION (5 FIELDS) */}
                      <div className="md:col-span-2 pt-2 border-t border-serene-outline-subtle/60">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-serene-muted mb-3">
                          Address Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {/* House Name */}
                          <div>
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              House Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={houseName}
                              onChange={(e) => setHouseName(e.target.value)}
                              placeholder="e.g. Green Villa"
                              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.house_name
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                              }`}
                            />
                            {fieldErrors.house_name && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.house_name[0]}
                              </p>
                            )}
                          </div>

                          {/* Place */}
                          <div>
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Place <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={place}
                              onChange={(e) => setPlace(e.target.value)}
                              placeholder="e.g. Town Center"
                              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.place
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                              }`}
                            />
                            {fieldErrors.place && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.place[0]}
                              </p>
                            )}
                          </div>

                          {/* Panchayath */}
                          <div>
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Panchayath <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={panchayath}
                              onChange={(e) => setPanchayath(e.target.value)}
                              placeholder="e.g. Central Panchayath"
                              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.panchayath
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                              }`}
                            />
                            {fieldErrors.panchayath && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.panchayath[0]}
                              </p>
                            )}
                          </div>

                          {/* Ward No. */}
                          <div>
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Ward No. <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={wardNo}
                              onChange={(e) => setWardNo(e.target.value)}
                              placeholder="e.g. 5"
                              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.ward_no
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                              }`}
                            />
                            {fieldErrors.ward_no && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.ward_no[0]}
                              </p>
                            )}
                          </div>

                          {/* Pincode */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Pincode <span className="text-rose-500">*</span>{' '}
                              <span className="font-normal text-xs text-serene-muted">(6 digits)</span>
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                              placeholder="682001"
                              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.pincode
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                              }`}
                            />
                            {fieldErrors.pincode && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.pincode[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PATIENT SPECIFIC DISCHARGE SUMMARY UPLOAD & EMERGENCY CONTACT */}
                      {selectedRoleId === 'patient' && (
                        <>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Discharge Summary / Referral Document <span className="text-rose-500">*</span>{' '}
                              <span className="font-normal text-xs text-serene-muted">(PDF, JPG, PNG up to 5MB)</span>
                            </label>
                            <div className="relative border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-xl p-3.5 text-center bg-white cursor-pointer transition-colors">
                              <input
                                type="file"
                                required
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setDischargeSummaryFile(e.target.files[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex items-center justify-center gap-2.5 text-serene-muted">
                                {dischargeSummaryFile ? (
                                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
                                    <Check className="w-4 h-4" />
                                    <span>{dischargeSummaryFile.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 text-serene-primary" />
                                    <span className="text-xs sm:text-sm font-semibold text-serene-text">
                                      Click or drag medical referral / discharge summary document
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {fieldErrors.discharge_summary && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.discharge_summary[0]}
                              </p>
                            )}
                          </div>

                          {/* OPTIONAL EMERGENCY CONTACT */}
                          <div className="md:col-span-2 pt-2 border-t border-serene-outline-subtle/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-serene-muted mb-3">
                              Emergency Contact <span className="font-normal text-xs normal-case text-serene-muted">(Optional)</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Contact Name
                                </label>
                                <input
                                  type="text"
                                  value={emergencyContactName}
                                  onChange={(e) => setEmergencyContactName(e.target.value)}
                                  placeholder="e.g. Jane Doe"
                                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary focus:ring-2 focus:ring-serene-primary/20"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Contact Phone <span className="font-normal text-xs text-serene-muted">(10 digits)</span>
                                </label>
                                <input
                                  type="tel"
                                  maxLength={10}
                                  value={emergencyContactPhone}
                                  onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, ''))}
                                  placeholder="9876543210"
                                  className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                    fieldErrors.emergency_contact_phone
                                      ? 'border-rose-400 focus:ring-rose-200'
                                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                                  }`}
                                />
                                {fieldErrors.emergency_contact_phone && (
                                  <p className="text-rose-600 text-xs mt-1 font-semibold">
                                    {fieldErrors.emergency_contact_phone[0]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* CAREGIVER IDENTITY PROOF UPLOAD & PROFESSIONAL DETAILS */}
                      {selectedRoleId === 'caregiver' && (
                        <>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-serene-text mb-1">
                              Identity Proof Upload <span className="text-rose-500">*</span>{' '}
                              <span className="font-normal text-xs text-serene-muted">(PDF, JPG, PNG up to 5MB)</span>
                            </label>
                            <div className="relative border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-xl p-3.5 text-center bg-white cursor-pointer transition-colors">
                              <input
                                type="file"
                                required
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setIdentityProofFile(e.target.files[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex items-center justify-center gap-2.5 text-serene-muted">
                                {identityProofFile ? (
                                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
                                    <Check className="w-4 h-4" />
                                    <span>{identityProofFile.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 text-serene-primary" />
                                    <span className="text-xs sm:text-sm font-semibold text-serene-text">
                                      Click or drag document to upload identity proof
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {fieldErrors.identity_proof && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.identity_proof[0]}
                              </p>
                            )}
                          </div>

                          {/* OPTIONAL PROFESSIONAL DETAILS */}
                          <div className="md:col-span-2 pt-2 border-t border-serene-outline-subtle/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-serene-muted mb-3">
                              Professional Details & Qualifications <span className="font-normal text-xs normal-case text-serene-muted">(Optional)</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Qualifications
                                </label>
                                <input
                                  type="text"
                                  value={qualifications}
                                  onChange={(e) => setQualifications(e.target.value)}
                                  placeholder="e.g. B.Sc Nursing, Certified Aide"
                                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary focus:ring-2 focus:ring-serene-primary/20"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Certifications
                                </label>
                                <input
                                  type="text"
                                  value={certifications}
                                  onChange={(e) => setCertifications(e.target.value)}
                                  placeholder="e.g. CPR Certified, First Aid"
                                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary focus:ring-2 focus:ring-serene-primary/20"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Specialization
                                </label>
                                <input
                                  type="text"
                                  value={specialization}
                                  onChange={(e) => setSpecialization(e.target.value)}
                                  placeholder="e.g. Elderly Care, Palliative Care"
                                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary focus:ring-2 focus:ring-serene-primary/20"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-serene-text mb-1">
                                  Availability Notes
                                </label>
                                <input
                                  type="text"
                                  value={availabilityNotes}
                                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                                  placeholder="e.g. Full-time, Weekday Mornings"
                                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary focus:ring-2 focus:ring-serene-primary/20"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Submit Form Button */}
                <div className={`pt-3 ${activeTab === 'login' ? 'max-w-lg mx-auto w-full' : ''}`}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-serene-primary w-full py-3.5 text-sm sm:text-base font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <span>
                          {activeTab === 'login'
                            ? `Access ${currentRoleObj.title}`
                            : 'Create Account'}
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-serene-outline-subtle/70 flex items-center justify-between text-xs text-serene-muted shrink-0">
            <span className="font-medium">Need support? Contact helpline: 1-800-KARUNA</span>
            <button
              onClick={onClose}
              className="font-bold text-serene-primary hover:underline"
            >
              Cancel
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
