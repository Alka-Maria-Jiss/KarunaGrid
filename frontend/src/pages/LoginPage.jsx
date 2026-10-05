import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import BackToHomeButton from '../components/BackToHomeButton';
import logoImg from '../assets/logo.png';

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleRendered, setIsGoogleRendered] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');
  const [rejectionReason, setRejectionReason] = useState(null);

  const googleButtonRef = useRef(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    // Clear any stale invalid auth tokens on login screen mount
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');

    const resetSuccessMsg = sessionStorage.getItem('password_reset_success');
    if (resetSuccessMsg) {
      setBannerType('success');
      setBannerMessage(resetSuccessMsg);
      sessionStorage.removeItem('password_reset_success');
    }
  }, []);

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    const credential = response?.credential;
    if (!credential) {
      setBannerType('error');
      setBannerMessage('Google authentication failed. Please try again.');
      showError('Google authentication failed. No credential returned.');
      return;
    }

    setIsGoogleLoading(true);
    setFieldErrors({});
    setBannerMessage(null);
    setRejectionReason(null);

    try {
      const data = await apiClient.post('/auth/google/', { credential });

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_info', JSON.stringify(data.user));

      showSuccess(`Welcome back, ${data.user.name || data.user.email}!`);

      const userRole = (data.user.role || 'patient').toLowerCase();
      handleNavigate(`/dashboard/${userRole}`);
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
        if (err.data.errors.non_field_errors) {
          setBannerType('error');
          setBannerMessage(err.data.errors.non_field_errors[0]);
        }
      } else if (err.status === 403) {
        setBannerType('warning');
        setBannerMessage(err.message || 'Your account is pending administrator approval.');
        if (err.data?.rejection_reason) {
          setRejectionReason(err.data.rejection_reason);
        }
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'Google authentication failed. Please try again.');
        showError(err.message || 'Google authentication failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      (typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID) ||
      '';

    const loadGoogleScript = () => {
      return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (existingScript) {
          if (window.google?.accounts?.id) {
            resolve();
          } else {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', reject);
          }
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      });
    };

    const initializeAndRender = async () => {
      try {
        await loadGoogleScript();
        if (!isMounted) return;

        if (googleClientId && window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 360,
            });
            setIsGoogleRendered(true);
          }
        }
      } catch (err) {
        console.warn('Google Identity Services initialization notice:', err);
      }
    };

    initializeAndRender();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCustomGoogleClick = () => {
    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      (typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID) ||
      '';

    if (!googleClientId) {
      setBannerType('warning');
      setBannerMessage('Sign in with Google is not configured: VITE_GOOGLE_CLIENT_ID is missing.');
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.prompt();
      } catch (err) {
        console.error('Google Sign-In prompt error:', err);
      }
    } else {
      setBannerType('error');
      setBannerMessage('Google Identity Services is currently loading. Please try again in a moment.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setBannerMessage(null);
    setRejectionReason(null);

    try {
      const data = await apiClient.post('/auth/login/', { email, password });

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_info', JSON.stringify(data.user));

      showSuccess(`Welcome back, ${data.user.name || data.user.email}!`);

      const userRole = (data.user.role || 'patient').toLowerCase();
      handleNavigate(`/dashboard/${userRole}`);
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
        if (err.data.errors.non_field_errors) {
          setBannerType('error');
          setBannerMessage(err.data.errors.non_field_errors[0]);
        }
      } else if (err.status === 403) {
        setBannerType('warning');
        setBannerMessage(err.message || 'Your account is pending administrator approval.');
        if (err.data?.rejection_reason) {
          setRejectionReason(err.data.rejection_reason);
        }
      } else {
        setBannerType('error');
        setBannerMessage(err.message || 'An error occurred. Please try again.');
        showError(err.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-serene-bg flex flex-col justify-between p-4 sm:p-6 selection:bg-serene-primary-container selection:text-serene-text">
      {/* Main Form Container */}
      <main className="flex-1 flex flex-col items-center justify-center py-2 sm:py-4">
        {/* Back to Home Link */}
        <div className="w-full max-w-[440px] mb-2.5 flex items-center justify-start">
          <BackToHomeButton onNavigate={onNavigate} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.99, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-[440px] bg-white rounded-2xl shadow-sm border border-serene-outline-subtle/80 p-6 sm:p-7 space-y-4"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <img
                src={logoImg}
                alt="KarunaGrid Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-full shadow-xs"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-serene-text tracking-tight">
                Sign In to KarunaGrid
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-serene-muted font-normal">
              Enter your credentials to access your care dashboard.
            </p>
          </div>

          {/* Banner Messages */}
          {bannerMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 ${
                bannerType === 'success'
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                  : bannerType === 'warning'
                  ? 'bg-amber-50 text-amber-950 border border-amber-200'
                  : 'bg-rose-50 text-rose-950 border border-rose-200'
              }`}
            >
              {bannerType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p>{bannerMessage}</p>
                {rejectionReason && (
                  <p className="mt-1 pt-1 border-t border-amber-200 font-normal text-xs text-rose-800">
                    <strong>Rejection Reason:</strong> {rejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-serene-text uppercase tracking-wider mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-serene-text placeholder:text-serene-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.email
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-serene-outline-subtle hover:border-serene-outline focus:border-serene-primary focus:ring-serene-primary/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-serene-text uppercase tracking-wider mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm bg-white text-serene-text placeholder:text-serene-muted/60 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-serene-outline-subtle hover:border-serene-outline focus:border-serene-primary focus:ring-serene-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1 cursor-pointer"
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
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('/forgot-password')}
                  className="text-xs font-semibold text-serene-primary hover:text-serene-primary-hover hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-[42px] px-4 text-sm font-semibold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center my-2.5">
            <div className="border-t border-serene-outline-subtle/70 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-serene-muted uppercase tracking-wider">
              OR
            </span>
            <div className="border-t border-serene-outline-subtle/70 w-full" />
          </div>

          {/* Google Sign-In Container */}
          <div className="w-full flex flex-col items-center justify-center min-h-[42px]">
            {isGoogleLoading ? (
              <div
                className="w-full h-[42px] rounded-xl border border-serene-outline-subtle bg-white text-serene-text shadow-xs flex items-center justify-center gap-2 cursor-wait select-none"
                aria-live="polite"
              >
                <div className="w-4 h-4 border-2 border-serene-primary/30 border-t-serene-primary rounded-full animate-spin shrink-0" />
                <span className="font-semibold text-xs text-serene-text">Signing in with Google...</span>
              </div>
            ) : (
              <div className="w-full relative flex justify-center">
                {/* Official Google Button Mount Target */}
                <div
                  ref={googleButtonRef}
                  className={`w-full flex justify-center ${isGoogleRendered ? '' : 'hidden'}`}
                  id="google-signin-btn-container"
                />
                {/* Fallback & Prompt Button */}
                {!isGoogleRendered && (
                  <button
                    type="button"
                    onClick={handleCustomGoogleClick}
                    className="w-full h-[42px] px-4 rounded-xl border border-serene-outline-subtle hover:border-serene-outline bg-white hover:bg-serene-low/50 text-serene-text font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="pt-3 border-t border-serene-outline-subtle/60 text-center space-y-1.5 text-xs">
            <p className="text-serene-muted font-medium">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="font-bold text-serene-primary hover:text-serene-primary-hover hover:underline ml-1 cursor-pointer"
              >
                Register Account
              </button>
            </p>
            <p className="text-serene-muted font-medium">
              Waiting for Doctor review?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/check-application-status')}
                className="font-bold text-serene-primary hover:text-serene-primary-hover hover:underline ml-1 cursor-pointer"
              >
                Check Application Status
              </button>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Page Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-serene-muted py-2">
        Need assistance? Contact our 24/7 Care Helpline at{' '}
        <a href="tel:18005550199" className="font-semibold text-serene-primary hover:underline">
          1-800-555-0199
        </a>
      </footer>
    </div>
  );
}
