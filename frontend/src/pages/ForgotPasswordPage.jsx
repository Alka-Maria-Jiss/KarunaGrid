import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, Send, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function ForgotPasswordPage({ onNavigate }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');
  const [fieldErrors, setFieldErrors] = useState({});

  const { showSuccess, showError } = useToast();

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setFieldErrors({ username: ['Please enter your username.'] });
      return;
    }

    setIsLoading(true);
    setFieldErrors({});
    setBannerMessage(null);

    try {
      const data = await apiClient.post('/auth/forgot-password/request-otp/', {
        username: cleanUsername,
      });

      // Save username for verification page
      sessionStorage.setItem('reset_username', cleanUsername);

      showSuccess(data.message || "If an account exists, a verification OTP has been sent.");

      // Navigate to OTP verification page
      handleNavigate('/verify-otp');
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else if (err.status === 503) {
        setBannerType('error');
        setBannerMessage("We couldn't send the verification email right now. Please try again later.");
        showError("We couldn't send the verification email right now. Please try again later.");
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'Unable to process your request. Please try again.');
        showError(err.message || 'Unable to process request.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              Account Security
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight flex items-center justify-center gap-2.5">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs" />
              <span>Forgot Password</span>
            </h1>
            <p className="text-xs sm:text-sm text-serene-muted font-medium pt-1">
              Enter your username and we'll send a verification OTP to your registered email address.
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1">
                Username / Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.username
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.username[0]}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>Sending OTP...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Note */}
          <div className="bg-serene-container/60 rounded-xl p-3.5 border border-serene-outline-subtle/40 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-serene-primary shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-serene-muted leading-relaxed">
              We never share your email address. If an account is linked to your username, a one-time verification code valid for 10 minutes will be delivered to your inbox.
            </p>
          </div>

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
