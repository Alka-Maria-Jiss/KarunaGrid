import React, { useState } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');
  const [rejectionReason, setRejectionReason] = useState(null);

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
          onClick={() => handleNavigate('/register')}
          className="text-xs sm:text-sm font-bold text-serene-primary hover:underline px-3 py-1.5 rounded-xl bg-serene-container border border-serene-outline-subtle transition-all"
        >
          Register Account
        </button>
      </header>

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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight">
              Sign In to KarunaGrid
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
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 text-sm font-bold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
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

          {/* Footer Link */}
          <div className="pt-4 border-t border-serene-outline-subtle/60 text-center">
            <p className="text-xs text-serene-muted font-medium">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="font-bold text-serene-primary hover:underline"
              >
                Register Account
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
