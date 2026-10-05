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
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-serene-muted hover:text-serene-primary transition-all duration-150 group cursor-pointer ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 text-serene-muted group-hover:text-serene-primary group-hover:-translate-x-0.5 transition-all duration-150" />
      <span>Back to Home</span>
    </button>
  );
}
