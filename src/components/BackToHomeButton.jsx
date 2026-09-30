import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackToHomeButton({ onNavigate, className = '' }) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-serene-muted hover:text-serene-text transition-all duration-150 group cursor-pointer ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-serene-primary transition-transform duration-150 group-hover:-translate-x-1" />
      <span>Back to Home</span>
    </button>
  );
}
