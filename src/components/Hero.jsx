import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import heroImg from '../assets/landing_img.png';

export default function Hero({ onOpenRegister, onLearnMore }) {
  return (
    <section
      id="hero"
      className="relative w-full h-screen min-h-[620px] flex items-center overflow-hidden"
      style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Enhanced dark radial/linear gradient overlay for WCAG AA text readability */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.72) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-[120px] pb-16 flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl w-full text-center flex flex-col items-center justify-center">

          {/* Phase 1 Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/40 bg-black/40 backdrop-blur-md text-white text-xs sm:text-sm font-semibold mb-8 tracking-wide shadow-lg"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Community Palliative Care Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="font-extrabold text-white leading-[1.15] tracking-tight mb-10 max-w-4xl text-center drop-shadow-xl"
            style={{ fontSize: 'clamp(2.75rem, 6.5vw, 5rem)' }}
          >
            Bringing{' '}
            <span
              style={{
                backgroundImage: 'linear-gradient(90deg, #fde68a, #f9a875)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Comfort
            </span>
            , Dignity &amp; Peace to Every Home.
          </motion.h1>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto text-center"
          >
            {/* Primary CTA — High contrast olive button */}
            <button
              id="hero-register-btn"
              onClick={onOpenRegister}
              className="btn-serene-primary text-base sm:text-lg px-8 py-4 shadow-xl"
              style={{
                backgroundColor: '#645e45',
                borderColor: '#645e45',
              }}
            >
              <span>Register Care Account</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Secondary CTA — High contrast outline button */}
            <a
              href="#about"
              id="hero-learn-more-btn"
              onClick={onLearnMore}
              className="btn-serene-secondary text-base sm:text-lg px-7 py-4 shadow-md"
            >
              <span>What is Palliative Care?</span>
            </a>
          </motion.div>

        </div>
      </div>

      {/* Responsive adjustments */}
      <style>{`
        @media (max-width: 640px) {
          #hero {
            height: 100svh !important;
            min-height: 100svh !important;
          }
        }
      `}</style>
    </section>
  );
}
