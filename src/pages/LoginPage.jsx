import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

    if (!googleClientId) {
      console.warn('Google Sign-In is not configured: VITE_GOOGLE_CLIENT_ID is missing.');
    }

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
        if (!isMounted || !window.google?.accounts?.id) return;

        if (googleClientId) {
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
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: googleButtonRef.current.offsetWidth || 360,
            });
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
    <div className="min-h-screen bg-serene-bg flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-serene-primary-container selection:text-serene-text">
      {/* Main Form Container */}
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
              Portal Access
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight flex items-center justify-center gap-2.5">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs" />
              <span>Sign In to KarunaGrid</span>
            </h1>
            <p className="text-xs sm:text-sm text-serene-muted font-medium">
              Enter your credentials to access your care dashboard.
            </p>
          </div>

          {/* Banner Messages */}
          {bannerMessage && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 ${
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
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
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.email
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-rose-600 text-xs mt-1 font-semibold">{fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Password */}
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
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-serene-outline-subtle focus:border-serene-primary focus:ring-serene-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-serene-muted hover:text-serene-text p-1"
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
                  className="text-xs font-bold text-serene-primary hover:text-serene-primary-hover hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>Signing In...</span>
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
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-serene-outline-subtle w-full" />
            <span className="bg-white px-3 text-xs font-bold text-serene-muted uppercase tracking-wider">
              OR
            </span>
            <div className="border-t border-serene-outline-subtle w-full" />
          </div>

          {/* Google Sign-In Container */}
          <div className="w-full flex justify-center min-h-[44px]">
            {isGoogleLoading && (
              <div
                className="w-full max-w-[360px] h-[44px] rounded-lg border border-[#dadce0] bg-white text-[#3c4043] shadow-xs flex items-center justify-center gap-2.5 cursor-wait select-none"
                aria-live="polite"
              >
                <div className="w-[18px] h-[18px] border-2 border-serene-primary/30 border-t-serene-primary rounded-full animate-spin shrink-0" />
                <span className="font-semibold text-xs sm:text-sm text-serene-text">Signing in...</span>
              </div>
            )}
            <div
              ref={googleButtonRef}
              className={`w-full flex justify-center ${isGoogleLoading ? 'hidden' : ''}`}
              id="google-signin-btn-container"
            />
          </div>



          {/* Footer Link */}
          <div className="pt-4 border-t border-serene-outline-subtle/60 text-center space-y-1.5">
            <p className="text-xs sm:text-sm text-serene-muted font-medium">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="font-extrabold text-serene-primary hover:underline ml-1"
              >
                Register Account
              </button>
            </p>
            <p className="text-xs text-[#7b776c]">
              Waiting for Doctor review?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/check-application-status')}
                className="font-extrabold text-[#645e45] hover:underline ml-1"
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
