import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Upload,
  Check,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Copy,
  Clock,
  Eye,
  EyeOff,
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
  const [gender, setGender] = useState('Male');
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
  const [registeredAppId, setRegisteredAppId] = useState('');
  const [copiedAppId, setCopiedAppId] = useState(false);

  const { showSuccess, showError } = useToast();

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const focusFirstInvalidField = (errors) => {
    const fieldOrder = [
      'name',
      'email',
      'phone',
      'password',
      'confirm_password',
      'dob',
      'gender',
      'emergency_contact_name',
      'emergency_contact_phone',
      'house_name',
      'place',
      'panchayath',
      'ward_no',
      'pincode',
      'discharge_summary',
      'identity_proof',
    ];

    for (const key of fieldOrder) {
      if (errors[key]) {
        setTimeout(() => {
          const el = document.getElementById(`field-${key}`);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
        break;
      }
    }
  };

  // STEP 1 / Step 2 Wizard - Personal & Account Details Validations
  const validateStep1 = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // 1. Full Name
    if (!trimmedName) {
      errors.name = ['Full name is required.'];
    } else if (trimmedName.length > 100) {
      errors.name = ['Full name cannot exceed 100 characters.'];
    } else if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(trimmedName)) {
      errors.name = ['Full name can contain only letters, spaces, hyphens, and apostrophes.'];
    }

    // 2. Email Address
    if (!trimmedEmail) {
      errors.email = ['Email address is required.'];
    } else if (trimmedEmail.length > 150) {
      errors.email = ['Email address cannot exceed 150 characters.'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = ['Please enter a valid email address.'];
    }

    // 3. Phone Number
    if (!trimmedPhone) {
      errors.phone = ['Phone number is required.'];
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      errors.phone = ['Phone number must be exactly 10 digits.'];
    }

    // 4. Password
    if (!password) {
      errors.password = ['Password is required.'];
    } else if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      errors.password = [
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      ];
    }

    // 5. Confirm Password
    if (!confirmPassword) {
      errors.confirm_password = ['Confirm password is required.'];
    } else if (password !== confirmPassword) {
      errors.confirm_password = ['Passwords do not match.'];
    }

    // Patient Specific Fields
    if (selectedRole === 'patient') {
      // 6. Date of Birth
      if (!dob) {
        errors.dob = ['Date of birth is required.'];
      } else {
        const dobDate = new Date(dob);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dobDate >= today) {
          errors.dob = ['Date of birth must be in the past.'];
        } else {
          let age = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
          }
          if (age > 120) {
            errors.dob = ['Age cannot exceed 120 years.'];
          }
        }
      }

      // 7. Gender
      if (!gender || !gender.trim()) {
        errors.gender = ['Gender is required.'];
      } else if (!['Male', 'Female'].includes(gender.trim())) {
        errors.gender = ['Please select a valid gender option.'];
      }

      // 8. Emergency Contact Name (Optional)
      const trimmedEcName = emergencyContactName.trim();
      if (trimmedEcName) {
        if (trimmedEcName.length > 100) {
          errors.emergency_contact_name = ['Emergency contact name cannot exceed 100 characters.'];
        } else if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(trimmedEcName)) {
          errors.emergency_contact_name = ['Emergency contact name can contain only letters, spaces, hyphens, and apostrophes.'];
        }
      }

      // 9. Emergency Contact Phone (Optional)
      const trimmedEcPhone = emergencyContactPhone.trim();
      if (trimmedEcPhone) {
        if (!/^\d{10}$/.test(trimmedEcPhone)) {
          errors.emergency_contact_phone = ['Emergency contact phone must be exactly 10 digits.'];
        }
      }
    }

    return errors;
  };

  // STEP 2 / Step 3 Wizard - Address Details Validations
  const validateAddressStep = () => {
    const errors = {};
    const trimmedHouse = houseName.trim();
    const trimmedPlace = place.trim();
    const trimmedPanchayath = panchayath.trim();
    const trimmedWard = String(wardNo).trim();
    const trimmedPincode = pincode.trim();

    // 10. House Name
    if (!trimmedHouse) {
      errors.house_name = ['House name is required.'];
    } else if (trimmedHouse.length > 50) {
      errors.house_name = ['House name cannot exceed 50 characters.'];
    } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmedHouse)) {
      errors.house_name = ['House name can contain only letters and spaces.'];
    }

    // 11. Place
    if (!trimmedPlace) {
      errors.place = ['Place is required.'];
    } else if (trimmedPlace.length > 50) {
      errors.place = ['Place cannot exceed 50 characters.'];
    } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmedPlace)) {
      errors.place = ['Place can contain only letters and spaces.'];
    }

    // 12. Panchayath
    if (!trimmedPanchayath) {
      errors.panchayath = ['Panchayath is required.'];
    } else if (trimmedPanchayath.length > 50) {
      errors.panchayath = ['Panchayath cannot exceed 50 characters.'];
    } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmedPanchayath)) {
      errors.panchayath = ['Panchayath can contain only letters and spaces.'];
    }

    // 13. Ward Number
    if (!trimmedWard) {
      errors.ward_no = ['Ward number is required.'];
    } else if (!/^[1-9][0-9]*$/.test(trimmedWard)) {
      errors.ward_no = ['Ward number must be a positive whole number.'];
    }

    // 14. Pincode
    if (!trimmedPincode) {
      errors.pincode = ['Pincode is required.'];
    } else if (!/^\d{6}$/.test(trimmedPincode)) {
      errors.pincode = ['Pincode must be exactly 6 digits.'];
    }

    return errors;
  };

  // Step 4 Document Upload Validations
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
    if (Object.keys(errors).length > 0) {
      focusFirstInvalidField(errors);
    }
    return Object.keys(errors).length === 0;
  };

  const handleContinueStep1 = () => {
    const errors = validateStep1();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalidField(errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep(3);
  };

  const handleAddressContinue = () => {
    const errors = validateAddressStep();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalidField(errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep(4);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedRole) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      handleContinueStep1();
    } else if (currentStep === 3) {
      handleAddressContinue();
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
    formData.append('ward_no', String(wardNo).trim());
    formData.append('pincode', pincode.trim());

    if (selectedRole === 'patient') {
      formData.append('dob', dob);
      if (gender) formData.append('gender', gender.trim());
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
      if (res.application_id) {
        setRegisteredAppId(res.application_id);
      }
      const defaultSuccessMessage =
        selectedRole === 'patient'
          ? 'Your registration is pending doctor approval. Please save your Application ID to track the review status.'
          : 'Your registration is pending administrator verification. You will receive notification once your registration has been approved.';
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
          'gender',
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
        focusFirstInvalidField(errors);
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight flex items-center justify-center gap-3">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs" />
              <span>KarunaGrid Care Network</span>
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
            <div className="text-center space-y-5 py-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs border-2 border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[#1e1b14]">Registration Submitted!</h2>
                <p className="text-xs text-[#7b776c] font-medium">
                  {selectedRole === 'patient'
                    ? 'Your patient registration application has been submitted and is pending Doctor review.'
                    : 'Your caregiver application has been submitted and is pending Administrator verification.'}
                </p>
              </div>

              {/* Prominent Application ID Box (for Patients) */}
              {selectedRole === 'patient' && registeredAppId && (
                <div className="p-4 rounded-2xl bg-[#fffbf0] border border-[#fae6b8] space-y-2 text-left">
                  <p className="text-[10px] font-extrabold uppercase text-[#915e09] tracking-wider">
                    Your Application ID:
                  </p>
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#e8d5b0]">
                    <span className="font-mono font-black text-base text-[#1e1b14] tracking-wide">
                      {registeredAppId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(registeredAppId);
                        setCopiedAppId(true);
                        setTimeout(() => setCopiedAppId(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#faecd0] hover:bg-[#f5e3c0] text-[#915e09] transition-colors cursor-pointer"
                    >
                      {copiedAppId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAppId ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#7b776c] leading-relaxed">
                    Please save your Application ID. You can use it together with your email address to check your application status at any time.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {selectedRole === 'patient' && (
                  <button
                    type="button"
                    onClick={() => handleNavigate('/check-application-status')}
                    className="w-full sm:w-auto py-2.5 px-5 text-xs sm:text-sm font-extrabold text-[#645e45] bg-[#f4ede0] hover:bg-[#ede3d0] rounded-xl border border-[#e0d9cc] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Check Application Status</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNavigate('/login')}
                  className="w-full sm:w-auto py-2.5 px-6 text-xs sm:text-sm font-extrabold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Portal Login</span>
                </button>
              </div>
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
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full py-3 px-5 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Personal Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: PERSONAL DETAILS (STEP 1 IN REQUIREMENTS) */}
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
                        id="field-name"
                        type="text"
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
                          id="field-email"
                          type="email"
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
                          id="field-phone"
                          type="tel"
                          maxLength={10}
                          inputMode="numeric"
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
                            id="field-password"
                            type={showPassword ? 'text' : 'password'}
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.password[0]}</p>
                        )}

                        {/* Password Requirements Checklist */}
                        {password.length > 0 && (
                          <div className="p-3 bg-serene-low/80 rounded-xl border border-serene-outline-subtle/80 space-y-1 text-xs mt-2">
                            <p className="font-extrabold text-serene-text text-[11px] uppercase tracking-wider mb-1">
                              Password must contain:
                            </p>
                            <div className="space-y-1 text-[11px]">
                              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-serene-muted'}`}>
                                {password.length >= 8 ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="w-3.5 text-center text-xs">•</span>}
                                <span>At least 8 characters</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-emerald-700 font-bold' : 'text-serene-muted'}`}>
                                {/[A-Z]/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="w-3.5 text-center text-xs">•</span>}
                                <span>One uppercase letter</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? 'text-emerald-700 font-bold' : 'text-serene-muted'}`}>
                                {/[a-z]/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="w-3.5 text-center text-xs">•</span>}
                                <span>One lowercase letter</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${/\d/.test(password) ? 'text-emerald-700 font-bold' : 'text-serene-muted'}`}>
                                {/\d/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="w-3.5 text-center text-xs">•</span>}
                                <span>One number</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-700 font-bold' : 'text-serene-muted'}`}>
                                {/[^A-Za-z0-9]/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="w-3.5 text-center text-xs">•</span>}
                                <span>One special character</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="field-confirm_password"
                            type={showConfirmPassword ? 'text' : 'password'}
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1 cursor-pointer"
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
                        {/* Date of Birth & Gender */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Date of Birth <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id="field-dob"
                              type="date"
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

                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Gender <span className="text-rose-500">*</span>
                            </label>
                            <select
                              id="field-gender"
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.gender
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary'
                              }`}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                            {fieldErrors.gender && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.gender[0]}</p>
                            )}
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Emergency Contact Name <span className="font-normal text-serene-muted lowercase">(optional)</span>
                            </label>
                            <input
                              id="field-emergency_contact_name"
                              type="text"
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              placeholder="e.g. Jane Doe"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.emergency_contact_name
                                  ? 'border-rose-400 focus:ring-rose-200'
                                  : 'border-serene-outline-subtle focus:border-serene-primary'
                              }`}
                            />
                            {fieldErrors.emergency_contact_name && (
                              <p className="text-rose-600 text-xs mt-1 font-semibold">
                                {fieldErrors.emergency_contact_name[0]}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                              Emergency Contact Phone <span className="font-normal text-serene-muted lowercase">(optional)</span>
                            </label>
                            <input
                              id="field-emergency_contact_phone"
                              type="tel"
                              maxLength={10}
                              inputMode="numeric"
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
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueStep1}
                        className="py-3 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Address Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: ADDRESS DETAILS (STEP 2 IN REQUIREMENTS) */}
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
                          id="field-house_name"
                          type="text"
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
                          id="field-place"
                          type="text"
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
                          id="field-panchayath"
                          type="text"
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
                          id="field-ward_no"
                          type="text"
                          inputMode="numeric"
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
                          PINCODE <span className="text-rose-500">*</span>{' '}
                          <span className="font-normal text-serene-muted">(6 digits)</span>
                        </label>
                        <input
                          id="field-pincode"
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
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
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddressContinue}
                        className="py-3 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
                        <label
                          id="field-discharge_summary"
                          tabIndex={0}
                          className="border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-serene-low/50 focus:outline-none focus:ring-2 focus:ring-serene-primary"
                        >
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

                    {/* CAREGIVER IDENTITY PROOF & PROFESSIONAL DETAILS */}
                    {selectedRole === 'caregiver' && (
                      <div className="space-y-5">
                        {/* Identity Proof Upload */}
                        <div>
                          <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                            Identity Proof Upload <span className="text-rose-500">*</span>{' '}
                            <span className="font-normal text-serene-muted lowercase">(PDF, JPG, PNG up to 5MB)</span>
                          </label>
                          <label
                            id="field-identity_proof"
                            tabIndex={0}
                            className="border-2 border-dashed border-serene-outline-subtle hover:border-serene-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-serene-low/50 focus:outline-none focus:ring-2 focus:ring-serene-primary"
                          >
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

                        {/* PROFESSIONAL DETAILS & QUALIFICATIONS (OPTIONAL SECTION) */}
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
                        className="py-3 px-5 text-sm font-bold text-serene-muted hover:text-serene-text bg-serene-container hover:bg-serene-container/80 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="py-3.5 px-7 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
          <div className="pt-4 border-t border-serene-outline-subtle/60 text-center space-y-1.5">
            <p className="text-xs sm:text-sm text-serene-muted font-medium">
              Already have an approved account?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="font-extrabold text-serene-primary hover:underline ml-1 cursor-pointer"
              >
                Sign In
              </button>
            </p>
            <p className="text-xs text-[#7b776c]">
              Waiting for Doctor review?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/check-application-status')}
                className="font-extrabold text-[#645e45] hover:underline ml-1 cursor-pointer"
              >
                Check Application Status
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
