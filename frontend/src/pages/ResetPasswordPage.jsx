import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Check, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function ResetPasswordPage({ onNavigate }) {
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const token = sessionStorage.getItem('reset_token');
    if (!token) {
      handleNavigate('/forgot-password');
      return;
    }
    setResetToken(token);
  }, []);

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  // Real-time password requirement checklist
  const criteria = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'One number (0-9)', met: /\d/.test(newPassword) },
    { label: 'One special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const allCriteriaMet = criteria.every((c) => c.met);
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setBannerMessage(null);

    const errors = {};
    if (!allCriteriaMet) {
      errors.new_password = [
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
      ];
    }

    if (newPassword !== confirmPassword) {
      errors.confirm_password = ['Passwords do not match.'];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiClient.post('/auth/forgot-password/reset/', {
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      // Clear reset session storage
      sessionStorage.removeItem('reset_token');
      sessionStorage.removeItem('reset_username');
      sessionStorage.setItem(
        'password_reset_success',
        'Password updated successfully. Please log in with your new password.'
      );

      setIsSuccess(true);
      showSuccess(data.message || 'Password updated successfully. Please log in with your new password.');
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else {
        const errorMsg =
          err.data?.detail || err.message || 'Failed to reset password. Please try again.';
        setBannerMessage(errorMsg);
        showError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-serene-bg flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-serene-primary-container selection:text-serene-text">
        <main className="flex-1 flex items-center justify-center my-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-[500px] bg-white rounded-3xl shadow-2xl border border-serene-outline-subtle p-6 sm:p-8 space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight">
                Password Updated Successfully
              </h1>
              <p className="text-sm text-serene-muted font-medium">
                Your KarunaGrid password has been updated. Please sign in to your care portal using your new credentials.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Login</span>
              </button>
            </div>
          </motion.div>
        </main>

        <footer className="max-w-5xl mx-auto w-full text-center text-xs text-serene-muted font-medium py-2">
          Need assistance? Contact our 24/7 Care Helpline at{' '}
          <a href="tel:18005550199" className="font-bold text-serene-primary hover:underline">
            1-800-555-0199
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-serene-bg flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-serene-primary-container selection:text-serene-text">
      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center my-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-[500px] bg-white rounded-3xl shadow-2xl border border-serene-outline-subtle p-6 sm:p-8 space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <span className="serene-tag text-xs font-bold px-3 py-1 bg-serene-container text-serene-primary border border-serene-outline-subtle inline-block mb-1">
              New Password
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight flex items-center justify-center gap-2.5">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs" />
              <span>Create New Password</span>
            </h1>
            <p className="text-xs sm:text-sm text-serene-muted font-medium pt-1">
              Choose a strong, secure password for your KarunaGrid account.
            </p>
          </div>

          {/* Banner Messages */}
          {bannerMessage && (
            <div className="p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 bg-rose-100 text-rose-950 border border-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p>{bannerMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.new_password
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.new_password && (
                <div className="text-rose-600 text-xs mt-1 font-semibold space-y-0.5">
                  {fieldErrors.new_password.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.confirm_password
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirm_password && (
                <div className="text-rose-600 text-xs mt-1 font-semibold space-y-0.5">
                  {fieldErrors.confirm_password.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Live Password Validation Checklist */}
            <div className="bg-serene-container/50 rounded-xl p-3.5 border border-serene-outline-subtle/50 space-y-1.5">
              <span className="text-[11px] font-bold text-serene-muted uppercase tracking-wider block">
                Password Requirements:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {criteria.map((c, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center gap-1.5 ${
                      c.met ? 'text-emerald-700 font-semibold' : 'text-serene-muted'
                    }`}
                  >
                    {c.met ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 inline-block rounded-full border border-serene-outline-subtle shrink-0" />
                    )}
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !allCriteriaMet || !confirmPassword}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Back to Login */}
          <div className="pt-4 border-t border-serene-outline-subtle/60 text-center">
            <button
              type="button"
              onClick={() => handleNavigate('/login')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-serene-primary hover:text-serene-primary-hover hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
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
