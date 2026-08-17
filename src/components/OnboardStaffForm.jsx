import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Activity, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';

export default function OnboardStaffForm({ role = 'doctor', onSuccess }) {
  const isDoctor = role === 'doctor';
  const roleLabel = isDoctor ? 'Doctor' : 'Nurse';
  const RoleIcon = isDoctor ? Stethoscope : Activity;

  // Form State
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // Status & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { showSuccess, showError } = useToast();

  const resetForm = () => {
    setName('');
    setSpecialization('');
    setEmail('');
    setPassword('');
    setPhone('');
    setServiceArea('');
    setFieldErrors({});
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const endpoint = isDoctor ? '/admin/onboard-doctor/' : '/admin/onboard-nurse/';
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      service_area: serviceArea.trim(),
      ...(isDoctor && { specialization: specialization.trim() }),
    };

    try {
      const res = await apiClient.post(endpoint, payload);
      showSuccess(res.message || `${roleLabel} account created & pre-approved successfully!`);
      resetForm();
      if (onSuccess) onSuccess(res);
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else {
        showError(err.message || `Failed to onboard ${roleLabel.toLowerCase()}.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-serene-outline-subtle p-6 sm:p-8 space-y-6 shadow-sm max-w-2xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex items-center gap-3 border-b border-serene-outline-subtle pb-4">
        <div
          className={`p-3 rounded-2xl ${
            isDoctor ? 'bg-[#f4f2e9] text-[#645e45] border border-[#e2dec9]' : 'bg-[#f5f1ea] text-[#695e3d] border border-[#e7ded0]'
          }`}
        >
          <RoleIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-serene-text tracking-tight">
            Onboard New {roleLabel}
          </h3>
          <p className="text-xs text-serene-muted font-medium mt-0.5">
            Fill in the details below to create and pre-approve a new {roleLabel} account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FULL NAME */}
          <div className="md:col-span-2">
            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDoctor ? 'e.g. Dr. Sarah Jenkins' : 'e.g. Nurse Michael Adams'}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.name
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* SPECIALIZATION (Doctor Only) */}
          {isDoctor && (
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                Specialization <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Palliative Medicine, Oncology"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.specialization
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                }`}
              />
              {fieldErrors.specialization && (
                <p className="text-rose-600 text-xs mt-1 font-semibold">
                  {fieldErrors.specialization[0]}
                </p>
              )}
            </div>
          )}

          {/* EMAIL ID */}
          <div>
            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isDoctor ? 'doctor@karunagrid.org' : 'nurse@karunagrid.org'}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.email
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
              Initial Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
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

          {/* PHONE NUMBER */}
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
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.phone
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
              }`}
            />
            {fieldErrors.phone && (
              <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.phone[0]}</p>
            )}
          </div>

          {/* SERVICE AREA */}
          <div>
            <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
              Service Area / Region <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. Ernakulam Central District"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.service_area
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
              }`}
            />
            {fieldErrors.service_area && (
              <p className="text-rose-600 text-xs mt-1 font-semibold">
                {fieldErrors.service_area[0]}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-5 text-xs sm:text-sm font-bold text-white bg-[#645e45] hover:bg-[#4c472f] focus:ring-2 focus:ring-[#645e45]/30 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Onboarding {roleLabel}...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Onboard & Pre-Approve {roleLabel} Account</span>
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
