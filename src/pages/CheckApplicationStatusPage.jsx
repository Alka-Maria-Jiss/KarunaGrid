import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Copy,
  Check,
  User,
  Mail,
  Calendar,
  LogIn,
  UserPlus,
  ShieldCheck,
  Home
} from 'lucide-react';
import apiClient from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function CheckApplicationStatusPage({ onNavigate }) {
  const [applicationId, setApplicationId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { showSuccess, showError } = useToast();

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!applicationId.trim() || !email.trim()) {
      setError('Please provide both your Application ID and Email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiClient.post('/auth/application-status/', {
        application_id: applicationId.trim(),
        email: email.trim(),
      });
      setResult(res);
      showSuccess('Application details retrieved successfully.');
    } catch (err) {
      const errorMsg =
        err.data?.errors?.detail?.[0] ||
        err.message ||
        'We could not find an application matching the provided details.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (result?.application_id) {
      navigator.clipboard.writeText(result.application_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const status = (result?.registration_status || '').toUpperCase();

  return (
    <div className="min-h-screen bg-[#fffdf9] flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-[#f4ede0] selection:text-[#1e1b14]">
      {/* Top Header Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => handleNavigate('/')}
          className="flex items-center gap-2.5 text-[#1e1b14] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 object-contain rounded-full shadow-xs" />
          <span className="font-extrabold text-base tracking-tight">KarunaGrid</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNavigate('/login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-[#645e45] hover:bg-[#f4ede0] transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/register')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#645e45] hover:bg-[#4c472f] shadow-xs transition-all cursor-pointer"
          >
            Register
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center my-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-[540px] bg-white rounded-3xl shadow-xl border border-[#e9e2d5] p-6 sm:p-8 space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <span className="inline-block px-3 py-1 text-[11px] font-extrabold uppercase bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc] mb-1">
              Public Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1e1b14] tracking-tight">
              Check Application Status
            </h1>
            <p className="text-xs sm:text-sm text-[#7b776c] font-medium">
              Enter your Application ID and registered email address to view the current review status.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCheckStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                Application ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value.toUpperCase())}
                placeholder="e.g. APP-2026-A1B2C3"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm font-mono bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all uppercase placeholder:normal-case"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. patient@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e0d9cc] text-xs sm:text-sm bg-white focus:outline-none focus:border-[#645e45] focus:ring-2 focus:ring-[#f4ede0] transition-all"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-[#faf0ec] border border-[#ebd4cc] text-[#ba1a1a] text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-[#645e45] hover:bg-[#4c472f] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Application...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </form>

          {/* STATUS RESULT CARD */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="pt-4 border-t border-[#f0eae0] space-y-4"
              >
                {/* 1. PENDING STATE */}
                {status === 'PENDING' && (
                  <div className="p-5 rounded-2xl bg-[#fffbf0] border border-[#fae6b8] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#faecd0] text-[#915e09] border border-[#e8d5b0]">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Registration Status: Pending
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#645e45] hover:text-[#1e1b14] cursor-pointer"
                        title="Copy Application ID"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : result.application_id}</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-[#1e1b14]">
                        Under Clinical Review
                      </h3>
                      <p className="text-xs text-[#7b776c] leading-relaxed">
                        Your registration application is currently waiting for Doctor approval. Our clinical team reviews applications to verify eligibility and medical referral details.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#faecd0] flex flex-wrap items-center justify-between text-[11px] text-[#7b776c] font-medium">
                      <span>Applicant: <strong className="text-[#1e1b14]">{result.name}</strong></span>
                      {result.submitted_at && <span>Submitted: {result.submitted_at}</span>}
                    </div>
                  </div>
                )}

                {/* 2. REJECTED STATE */}
                {status === 'REJECTED' && (
                  <div className="p-5 rounded-2xl bg-[#faf0ec] border border-[#ebd4cc] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#f6ded8] text-[#ba1a1a] border border-[#e8c1b8]">
                        <XCircle className="w-3.5 h-3.5" />
                        Registration Status: Rejected
                      </span>
                      <span className="text-xs font-mono font-bold text-[#ba1a1a]">
                        {result.application_id}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold text-[#1e1b14]">
                        Application Not Approved
                      </h3>
                      <div className="p-3 rounded-xl bg-white border border-[#ebd4cc] space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#ba1a1a] tracking-wider">
                          Doctor's Feedback / Reason:
                        </p>
                        <p className="text-xs text-[#1e1b14] font-medium leading-relaxed">
                          {result.rejection_reason || 'Incomplete registration details or outside service coverage.'}
                        </p>
                      </div>
                      <p className="text-xs text-[#7b776c] leading-relaxed">
                        You may correct the required information and submit a new registration application. Your previous application has been kept in our records for reference.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#f0ded8] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleNavigate('/register')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#ba1a1a] hover:bg-[#921414] transition-all cursor-pointer shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Submit New Application</span>
                      </button>
                      {result.reviewed_at && (
                        <span className="text-[10px] text-[#7b776c]">Reviewed: {result.reviewed_at}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. APPROVED STATE */}
                {status === 'APPROVED' && (
                  <div className="p-5 rounded-2xl bg-[#edf3ec] border border-[#cbe0ca] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#d9ebd7] text-[#2e5c2d] border border-[#badbba]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Registration Status: Approved
                      </span>
                      <span className="text-xs font-mono font-bold text-[#2e5c2d]">
                        {result.application_id}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-[#1e1b14]">
                        Welcome to KarunaGrid Care!
                      </h3>
                      <p className="text-xs text-[#7b776c] leading-relaxed">
                        Your registration has been verified and approved by the Doctor. Your patient account is now active and ready for use.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#cbe0ca] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleNavigate('/login')}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#2e5c2d] hover:bg-[#234722] transition-all cursor-pointer shadow-xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Go to Portal Login</span>
                      </button>
                      {result.reviewed_at && (
                        <span className="text-[10px] text-[#7b776c]">Approved: {result.reviewed_at}</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Helpful Links */}
          <div className="pt-4 border-t border-[#f0eae0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7b776c] font-medium">
            <span>
              Need to register?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="font-extrabold text-[#645e45] hover:underline"
              >
                Register here
              </button>
            </span>
            <span>
              Already approved?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="font-extrabold text-[#645e45] hover:underline"
              >
                Sign in
              </button>
            </span>
          </div>
        </motion.div>
      </main>

      {/* Page Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-[#7b776c] font-medium py-2">
        Need assistance with your registration? Contact our 24/7 Care Support at{' '}
        <a href="tel:18005550199" className="font-bold text-[#645e45] hover:underline">
          1-800-555-0199
        </a>
      </footer>
    </div>
  );
}
