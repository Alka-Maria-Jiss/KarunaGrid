import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';

export default function NotFound({ onGoHome }) {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-serene-bg flex items-center justify-center p-6 text-serene-text antialiased">
      <div className="max-w-md w-full serene-card text-center flex flex-col items-center p-8">
        
        <div className="serene-icon-badge bg-serene-container text-serene-primary p-4 rounded-2xl mb-6 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="serene-tag text-[11px] mb-3">
          Error 404 — Page Not Found
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text mb-3 tracking-tight">
          We couldn't find that page
        </h1>

        <p className="text-serene-muted text-sm leading-relaxed mb-8 font-medium">
          The page or resource you are trying to access does not exist or may have been moved.
        </p>

        <button
          onClick={handleGoHome}
          className="btn-serene-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>

        <p className="text-[11px] text-serene-muted mt-6 pt-4 border-t border-serene-outline-subtle/50">
          KarunaGrid Care Network — Helpline: 1-800-KARUNA
        </p>

      </div>
    </div>
  );
}
