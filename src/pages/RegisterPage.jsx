import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Upload,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

const stepTitles = [
  'Select Role',
  'Personal Details',
  'Address Details',
  'Document & Professional Details'
];

export default function RegisterPage({ onNavigate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('patient'); // 'patient' | 'caregiver'

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State - Step 2 Personal Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Form State - Step 3 Address Details
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('');
  const [panchayath, setPanchayath] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [pincode, setPincode] = useState('');

  // Form State - Step 4 Document Upload & Caregiver Professional Details
  const [dischargeSummaryFile, setDischargeSummaryFile] = useState(null);
  const [identityProofFile, setIdentityProofFile] = useState(null);
  const [qualifications, setQualifications] = useState('');
  const [certifications, setCertifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');

  // Status & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');
  const [isSuccess, setIsSuccess] = useState(false);

  const { showSuccess, showError } = useToast();

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  // Step 2 Client Validations
  const validateStep2 = () => {
    const errors = {};
    if (!name.trim()) errors.name = ['Full Name is required.'];
    if (!email.trim()) errors.email = ['Email Address is required.'];

    if (!phone.trim()) {
      errors.phone = ['Phone number is required.'];
    } else if (!/^\d{10}$/.test(phone.trim())) {
      errors.phone = ['Phone number must be a valid 10-digit number.'];
    }

    if (!password) {
      errors.password = ['Password is required.'];
    }
    if (password !== confirmPassword) {
      errors.confirm_password = ['Passwords do not match.'];
    }

    if (selectedRole === 'patient') {
      if (!dob) {
        errors.dob = ['Date of birth is required.'];
      } else {
        const dobDate = new Date(dob);
        const today = new Date();
        if (dobDate >= today) {
          errors.dob = ['Date of birth must be a past date.'];
        }
      }

      if (emergencyContactPhone.trim() && !/^\d{10}$/.test(emergencyContactPhone.trim())) {
        errors.emergency_contact_phone = ['Emergency contact phone number must be a 10-digit number.'];
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 Client Validations
  const validateStep3 = () => {
    const errors = {};
    if (!houseName.trim()) errors.house_name = ['House Name is required.'];
    if (!place.trim()) errors.place = ['Place is required.'];
    if (!panchayath.trim()) errors.panchayath = ['Panchayath is required.'];

    if (!wardNo || parseInt(wardNo, 10) <= 0) {
      errors.ward_no = ['Ward number must be a positive integer.'];
    }

    if (!pincode.trim()) {
      errors.pincode = ['Pincode is required.'];
    } else if (!/^\d{6}$/.test(pincode.trim())) {
      errors.pincode = ['Pincode must be a valid 6-digit number.'];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 4 Client Validations
  const validateStep4 = () => {
    const errors = {};
    const validExts = ['pdf', 'jpg', 'jpeg', 'png'];

    if (selectedRole === 'patient') {
      if (!dischargeSummaryFile) {
        errors.discharge_summary = ['Discharge summary / referral document is required.'];
      } else {
        const ext = dischargeSummaryFile.name.split('.').pop().toLowerCase();
        if (!validExts.includes(ext)) {
          errors.discharge_summary = ['Unsupported file format. Please upload a PDF, JPG, or PNG file.'];
        } else if (dischargeSummaryFile.size > 5 * 1024 * 1024) {
          errors.discharge_summary = ['File size exceeds maximum limit of 5MB.'];
        }
      }
    } else {
      if (!identityProofFile) {
        errors.identity_proof = ['Identity proof document is required.'];
      } else {
        const ext = identityProofFile.name.split('.').pop().toLowerCase();
        if (!validExts.includes(ext)) {
          errors.identity_proof = ['Unsupported file format. Please upload a PDF, JPG, or PNG file.'];
        } else if (identityProofFile.size > 5 * 1024 * 1024) {
          errors.identity_proof = ['File size exceeds maximum limit of 5MB.'];
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedRole) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setFieldErrors({});
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setFieldErrors({});
        setCurrentStep(4);
      }
    }
  };

  const handlePrevStep = () => {
    setFieldErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!validateStep4()) return;

    setIsLoading(true);
    setFieldErrors({});
    setBannerMessage(null);

    const formData = new FormData();
    formData.append('role', selectedRole);
    formData.append('name', name.trim());
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('confirm_password', confirmPassword);
    formData.append('phone', phone.trim());
    formData.append('house_name', houseName.trim());
    formData.append('place', place.trim());
    formData.append('panchayath', panchayath.trim());
    formData.append('ward_no', wardNo);
    formData.append('pincode', pincode.trim());

    if (selectedRole === 'patient') {
      formData.append('dob', dob);
      if (dischargeSummaryFile) {
        formData.append('discharge_summary', dischargeSummaryFile);
      }
      if (emergencyContactName.trim()) formData.append('emergency_contact_name', emergencyContactName.trim());
      if (emergencyContactPhone.trim()) formData.append('emergency_contact_phone', emergencyContactPhone.trim());
    } else {
      if (identityProofFile) {
        formData.append('identity_proof', identityProofFile);
      }
      if (qualifications.trim()) formData.append('qualifications', qualifications.trim());
      if (certifications.trim()) formData.append('certifications', certifications.trim());
      if (specialization.trim()) formData.append('specialization', specialization.trim());
      if (availabilityNotes.trim()) formData.append('availability_notes', availabilityNotes.trim());
    }

    try {
      const res = await apiClient.post('/auth/register/', formData);
      setIsSuccess(true);
      setBannerType('success');
      const defaultSuccessMessage =
        selectedRole === 'patient'
          ? 'Your registration is pending doctor approval. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided.'
          : 'Your registration is pending administrator verification. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided.';
      setBannerMessage(res.message || defaultSuccessMessage);
      showSuccess('Registration submitted successfully!');
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        const errors = err.data.errors;
        setFieldErrors(errors);

        // Smart Step Routing based on failing backend field
        const step2Fields = [
          'name',
          'email',
          'password',
          'confirm_password',
          'phone',
          'dob',
          'emergency_contact_name',
          'emergency_contact_phone'
        ];
        const step3Fields = ['house_name', 'place', 'panchayath', 'ward_no', 'pincode'];
        const step4Fields = [
          'discharge_summary',
          'identity_proof',
          'qualifications',
          'certifications',
          'specialization',
          'availability_notes'
        ];

        const errorKeys = Object.keys(errors);
        if (errorKeys.some((k) => step2Fields.includes(k))) {
          setCurrentStep(2);
        } else if (errorKeys.some((k) => step3Fields.includes(k))) {
          setCurrentStep(3);
        } else if (errorKeys.some((k) => step4Fields.includes(k))) {
          setCurrentStep(4);
        }
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'An error occurred during registration. Please try again.');
        showError(err.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-serene-bg flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-serene-primary-container selection:text-serene-text">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => handleNavigate('/')}
          className="flex items-center gap-3 font-extrabold text-lg text-serene-text hover:text-serene-primary transition-colors"
        >
          <img src={logoImg} alt="KarunaGrid Official Logo" className="w-10 h-10 object-contain rounded-full shadow-sm" />
          <span>KarunaGrid Care Network</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('/login')}
          className="text-xs sm:text-sm font-bold text-serene-primary hover:underline px-3 py-1.5 rounded-xl bg-serene-container border border-serene-outline-subtle transition-all"
        >
          Sign In
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center my-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-[540px] bg-white rounded-3xl shadow-2xl border border-serene-outline-subtle p-6 sm:p-8 space-y-6"
        >
          {/* Title Header */}
          <div className="text-center space-y-1">
            <span className="serene-tag text-xs font-bold px-3 py-1 bg-serene-container text-serene-primary border border-serene-outline-subtle inline-block mb-1">
              Account Registration
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight">
              Join KarunaGrid Network
            </h1>
            <p className="text-xs sm:text-sm text-serene-muted font-medium">
              Create your account in 4 simple steps.
            </p>
          </div>

          {/* Banner Messages */}
          {bannerMessage && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 ${
                bannerType === 'success'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  : 'bg-rose-100 text-rose-950 border border-rose-300'
              }`}
            >
              {bannerType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p>{bannerMessage}</p>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-extrabold text-serene-text">Registration Submitted!</h2>
              <p className="text-xs sm:text-sm text-serene-muted max-w-md mx-auto leading-relaxed font-medium">
                {selectedRole === 'patient'
                  ? 'Your registration is pending doctor approval. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided.'
                  : 'Your registration is pending administrator verification. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided.'}
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="py-3 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Go to Portal Login</span>
              </button>
            </div>
          ) : (
            <>
              {/* STEP WIZARD INDICATOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  {[1, 2, 3, 4].map((stepNum) => {
                    const isCompleted = stepNum < currentStep;
                    const isActive = stepNum === currentStep;
                    return (
                      <React.Fragment key={stepNum}>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : isActive
                              ? 'bg-serene-primary text-white ring-4 ring-serene-primary/20 shadow-md'
                              : 'bg-serene-container text-serene-muted border border-serene-outline-subtle'
                          }`}
                        >
                          {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                        </div>
                        {stepNum < 4 && (
                          <div
                            className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                              stepNum < currentStep ? 'bg-emerald-500' : 'bg-serene-outline-subtle/50'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="text-center">
                  <span className="text-xs font-extrabold text-serene-primary uppercase tracking-wider">
                    Step {currentStep} of 4 — {stepTitles[currentStep - 1]}
                  </span>
                </div>
              </div>

              {/* STEP CONTENT PANELS */}
              <form onSubmit={handleSubmitRegistration} className="space-y-4 pt-2">
                
                {/* STEP 1: ROLE SELECTION */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-serene-muted mb-2">
                      Select Registration Portal <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Patient Option */}
                      <div
                        onClick={() => setSelectedRole('patient')}
                        className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                          selectedRole === 'patient'
                            ? 'bg-serene-container border-2 border-serene-primary shadow-sm'
                            : 'bg-serene-low hover:bg-serene-container/60 border border-serene-outline-subtle'
                        }`}
                      >
                        <div
                          className={`p-3 rounded-2xl transition-colors ${
                            selectedRole === 'patient'
                              ? 'bg-serene-primary text-white shadow-sm'
                              : 'bg-white text-serene-primary border border-serene-outline-subtle'
                          }`}
                        >
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-serene-text text-base">Patient Portal</h3>
                          <p className="text-xs text-serene-muted mt-0.5 font-medium">
                            Register for home care services & medical tracking.
                          </p>
                        </div>
                      </div>

                      {/* Caregiver Option */}
                      <div
                        onClick={() => setSelectedRole('caregiver')}
                        className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                          selectedRole === 'caregiver'
                            ? 'bg-serene-container border-2 border-serene-primary shadow-sm'
                            : 'bg-serene-low hover:bg-serene-container/60 border border-serene-outline-subtle'
                        }`}
                      >
                        <div
                          className={`p-3 rounded-2xl transition-colors ${
                            selectedRole === 'caregiver'
                              ? 'bg-serene-primary text-white shadow-sm'
                              : 'bg-white text-serene-primary border border-serene-outline-subtle'
                          }`}
                        >
                          <HeartHandshake className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-serene-text text-base">Caregiver Portal</h3>
                          <p className="text-xs text-serene-muted mt-0.5 font-medium">
                            Register as a certified caregiver for network tasks.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full py-3 px-5 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <span>Continue to Personal Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: PERSONAL DETAILS */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.name
                            ? 'border-rose-400 focus:ring-rose-200'
                            : 'border-serene-outline-subtle focus:border-serene-primary'
                        }`}
                      />
                      {fieldErrors.name && (
                        <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.name[0]}</p>
                      )}
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.email
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.email && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.email[0]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Phone Number <span className="text-rose-500">*</span>{' '}
                          <span className="font-normal text-serene-muted lowercase">(10 digits)</span>
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.phone
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.phone && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.phone[0]}</p>
                        )}
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-serene-outline-subtle focus:border-serene-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.password[0]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.confirm_password
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-serene-outline-subtle focus:border-serene-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.confirm_password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.confirm_password[0]}</p>
                        )}
                      </div>
                    </div>

                    {/* Patient Specific Fields */}
                    {selectedRole === 'patient' && (
                      <div className="space-y-4 pt-2 border-t border-serene-outline-subtle/60">
                        <div>
                          <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                            Date of Birth <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.dob
                                ? 'border-rose-400 focus:ring-rose-200'
                                : 'border-serene-outline-subtle focus:border-serene-primary'
                            }`}
                          />
                          {fieldErrors.dob && (
                            <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.dob[0]}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Emergency Contact Name
                            </label>
                            <input
                              type="text"
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              placeholder="e.g. Jane Doe"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Emergency Contact Phone
                            </label>
                            <input
                              type="tel"
                              maxLength={10}
                              value={emergencyContactPhone}
                              onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="9876543210"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.emergency_contact_phone
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary'
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
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="py-3 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Continue to Address Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: ADDRESS DETAILS */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* House Name */}
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          House Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={houseName}
                          onChange={(e) => setHouseName(e.target.value)}
                          placeholder="e.g. Green Villa"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.house_name
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.house_name && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.house_name[0]}</p>
                        )}
                      </div>

                      {/* Place */}
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Place <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="e.g. Town Center"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.place
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.place && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.place[0]}</p>
                        )}
                      </div>

                      {/* Panchayath */}
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Panchayath <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={panchayath}
                          onChange={(e) => setPanchayath(e.target.value)}
                          placeholder="e.g. Central Panchayath"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.panchayath
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.panchayath && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.panchayath[0]}</p>
                        )}
                      </div>

                      {/* Ward No */}
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Ward No. <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={wardNo}
                          onChange={(e) => setWardNo(e.target.value)}
                          placeholder="e.g. 5"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.ward_no
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.ward_no && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.ward_no[0]}</p>
                        )}
                      </div>

                      {/* Pincode */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Pincode <span className="text-rose-500">*</span>{' '}
                          <span className="font-normal text-serene-muted lowercase">(6 digits)</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                          placeholder="682001"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.pincode
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-serene-outline-subtle focus:border-serene-primary'
                          }`}
                        />
                        {fieldErrors.pincode && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.pincode[0]}</p>
                        )}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="py-3 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Continue to Document Upload</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: DOCUMENT UPLOAD & CAREGIVER PROFESSIONAL DETAILS */}
                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    {/* PATIENT DOCUMENT UPLOAD */}
                    {selectedRole === 'patient' && (
                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Discharge Summary / Referral Document <span className="text-rose-500">*</span>{' '}
                          <span className="font-normal text-serene-muted lowercase">(PDF, JPG, PNG up to 5MB)</span>
                        </label>
                        <label className="border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-serene-low/50">
                          <Upload className="w-8 h-8 text-serene-primary mb-2" />
                          <span className="text-xs font-extrabold text-serene-text">
                            {dischargeSummaryFile ? dischargeSummaryFile.name : 'Click or drag document to upload'}
                          </span>
                          <span className="text-[11px] text-serene-muted mt-1">
                            {dischargeSummaryFile ? `${(dischargeSummaryFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, JPG, PNG (Max 5MB)'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setDischargeSummaryFile(e.target.files[0] || null)}
                            className="hidden"
                          />
                        </label>
                        {fieldErrors.discharge_summary && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">
                            {fieldErrors.discharge_summary[0]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* CAREGIVER IDENTITY PROOF & PROFESSIONAL DETAILS (MATCHING SCREENSHOT) */}
                    {selectedRole === 'caregiver' && (
                      <div className="space-y-5">
                        {/* Identity Proof Upload */}
                        <div>
                          <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                            Identity Proof Upload <span className="text-rose-500">*</span>{' '}
                            <span className="font-normal text-serene-muted lowercase">(PDF, JPG, PNG up to 5MB)</span>
                          </label>
                          <label className="border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-serene-low/50">
                            <Upload className="w-8 h-8 text-serene-primary mb-2" />
                            <span className="text-xs font-extrabold text-serene-text">
                              {identityProofFile ? identityProofFile.name : 'Click or drag document to upload identity proof'}
                            </span>
                            <span className="text-[11px] text-serene-muted mt-1">
                              {identityProofFile ? `${(identityProofFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, JPG, PNG (Max 5MB)'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setIdentityProofFile(e.target.files[0] || null)}
                              className="hidden"
                            />
                          </label>
                          {fieldErrors.identity_proof && (
                            <p className="text-rose-600 text-xs mt-1 font-semibold">
                              {fieldErrors.identity_proof[0]}
                            </p>
                          )}
                        </div>

                        {/* PROFESSIONAL DETAILS & QUALIFICATIONS (OPTIONAL SECTION MATCHING SCREENSHOT) */}
                        <div className="pt-3 border-t border-serene-outline-subtle/80 space-y-4">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-serene-muted">
                            Professional Details & Qualifications <span className="font-normal lowercase">(Optional)</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Qualifications */}
                            <div>
                              <label className="block text-xs font-bold text-serene-text mb-1">Qualifications</label>
                              <input
                                type="text"
                                value={qualifications}
                                onChange={(e) => setQualifications(e.target.value)}
                                placeholder="e.g. B.Sc Nursing, Certified Aide"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary"
                              />
                            </div>

                            {/* Certifications */}
                            <div>
                              <label className="block text-xs font-bold text-serene-text mb-1">Certifications</label>
                              <input
                                type="text"
                                value={certifications}
                                onChange={(e) => setCertifications(e.target.value)}
                                placeholder="e.g. CPR Certified, First Aid"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary"
                              />
                            </div>

                            {/* Specialization */}
                            <div>
                              <label className="block text-xs font-bold text-serene-text mb-1">Specialization</label>
                              <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder="e.g. Elderly Care, Palliative Care"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary"
                              />
                            </div>

                            {/* Availability Notes */}
                            <div>
                              <label className="block text-xs font-bold text-serene-text mb-1">Availability Notes</label>
                              <input
                                type="text"
                                value={availabilityNotes}
                                onChange={(e) => setAvailabilityNotes(e.target.value)}
                                placeholder="e.g. Full-time, Weekday Mornings"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-serene-outline-subtle text-sm bg-white focus:outline-none focus:border-serene-primary"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit & Back Navigation */}
                    <div className="flex items-center justify-between gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="py-3.5 px-7 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        {isLoading ? (
                          <span>Submitting Registration...</span>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Create Account</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            </>
          )}

          {/* Footer Link */}
          <div className="pt-4 border-t border-serene-outline-subtle/60 text-center">
            <p className="text-xs text-serene-muted font-medium">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="font-bold text-serene-primary hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Page Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-serene-muted font-medium py-2">
        Need assistance? Contact our 24/7 Care Helpline at{' '}
        <a href="tel:18005550199" className="font-bold text-serene-primary hover:underline">
          1-800-555-0199
        </a>
      </footer>
    </div>
  );
}
