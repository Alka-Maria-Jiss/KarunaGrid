import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function VerifyOtpPage({ onNavigate }) {
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');
  const [fieldErrors, setFieldErrors] = useState({});

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const savedUsername = sessionStorage.getItem('reset_username') || '';
    if (!savedUsername) {
      // If user directly browsed to /verify-otp without submitting username
      handleNavigate('/forgot-password');
      return;
    }
    setUsername(savedUsername);
  }, []);

  // Cooldown countdown timer for Resend OTP
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const maskIdentifier = (val) => {
    if (!val) return '';
    if (val.includes('@')) {
      const [local, domain] = val.split('@');
      if (local.length <= 2) {
        return `${local.charAt(0)}*@${domain}`;
      }
      return `${local.charAt(0)}${'*'.repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`;
    }
    if (val.length <= 4) return `${val.charAt(0)}***`;
    return `${val.substring(0, 2)}${'*'.repeat(val.length - 4)}${val.substring(val.length - 2)}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setFieldErrors({ otp: ['Please enter a valid 6-digit numeric OTP.'] });
      return;
    }

    setIsLoading(true);
    setFieldErrors({});
    setBannerMessage(null);

    try {
      const data = await apiClient.post('/auth/forgot-password/verify-otp/', {
        username,
        otp: cleanOtp,
      });

      if (data.reset_token) {
        sessionStorage.setItem('reset_token', data.reset_token);
        showSuccess('OTP verified successfully.');
        handleNavigate('/reset-password');
      } else {
        throw new Error('Verification failed. No reset token received.');
      }
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else {
        const errorMsg = err.data?.detail || err.message || 'Invalid OTP. Please try again.';
        setBannerType('error');
        setBannerMessage(errorMsg);
        showError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setBannerMessage(null);
    setFieldErrors({});

    try {
      const data = await apiClient.post('/auth/forgot-password/resend-otp/', {
        username,
      });

      setBannerType('success');
      setBannerMessage(data.message || 'If an account exists for this username, a new OTP has been sent.');
      showSuccess('New verification OTP sent to your registered email.');
      setCooldown(60);
      setOtp('');
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = err.data?.retry_after || 60;
        setCooldown(retryAfter);
        setBannerType('error');
        setBannerMessage(err.data?.detail || `Please wait ${retryAfter} seconds before requesting a new OTP.`);
      } else if (err.status === 503) {
        setBannerType('error');
        setBannerMessage("We couldn't send the verification email right now. Please try again later.");
        showError("We couldn't send the verification email right now. Please try again later.");
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'Failed to resend OTP. Please try again.');
        showError(err.message || 'Failed to resend OTP.');
      }
    } finally {
      setIsResending(false);
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
              Email Verification
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight flex items-center justify-center gap-2.5">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs" />
              <span>Verify OTP</span>
            </h1>
            <p className="text-xs sm:text-sm text-serene-muted font-medium pt-1">
              Enter the 6-digit OTP sent to your registered email address
              {username ? (
                <span className="block font-semibold text-serene-text mt-0.5">
                  ({maskIdentifier(username)})
                </span>
              ) : ''}.
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
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-serene-text uppercase tracking-wider mb-1 text-center">
                Enter 6-Digit OTP Code <span className="text-rose-500">*</span>
              </label>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  className={`w-full max-w-[280px] text-center text-2xl tracking-[0.5em] font-mono font-bold py-3.5 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.otp
                      ? 'border-rose-400 focus:ring-rose-200 text-rose-700'
                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20 text-serene-text'
                  }`}
                />
              </div>
              {fieldErrors.otp && (
                <p className="text-rose-600 text-xs mt-1 font-semibold text-center">{fieldErrors.otp[0]}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Resend OTP Section */}
          <div className="bg-serene-container/50 rounded-2xl p-4 border border-serene-outline-subtle/50 text-center space-y-2">
            <p className="text-xs text-serene-muted font-medium">
              Didn't receive the email or code expired?
            </p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || isResending}
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-colors ${
                cooldown > 0
                  ? 'text-serene-muted/70 cursor-not-allowed'
                  : 'text-serene-primary hover:text-serene-primary-hover hover:underline'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? (
                <span>Sending...</span>
              ) : cooldown > 0 ? (
                <span>Resend OTP in {cooldown}s</span>
              ) : (
                <span>Resend OTP</span>
              )}
            </button>
          </div>

          {/* Footer Back to Login */}
          <div className="pt-4 border-t border-serene-outline-subtle/60 flex items-center justify-between text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => handleNavigate('/forgot-password')}
              className="font-bold text-serene-muted hover:text-serene-text hover:underline"
            >
              Change Username
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/login')}
              className="inline-flex items-center gap-1.5 font-extrabold text-serene-primary hover:text-serene-primary-hover hover:underline"
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
