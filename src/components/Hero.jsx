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
      {/* Enhanced dark gradient overlay for WCAG AA text readability */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.52) 55%, rgba(0,0,0,0.22) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-[150px] pb-16 flex flex-col items-start justify-center">
        <div className="max-w-[700px] w-full text-left flex flex-col items-start">

          {/* Phase 1 Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/40 bg-black/30 backdrop-blur-md text-white text-xs sm:text-sm font-semibold mb-6 tracking-wide"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Community Palliative Care Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="font-extrabold text-white leading-[1.1] tracking-tight mb-6 max-w-[700px] text-left drop-shadow-md"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)' }}
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

          {/* Subheading — Left-aligned with 680px max width & 22px font size */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.35 }}
            className="text-white/95 mb-[40px] font-normal drop-shadow-sm max-w-[680px] text-left leading-[1.7] text-[1.125rem] sm:text-[22px]"
          >
            KarunaGrid connects patients, family caregivers, doctors, field nurses, and community
            coordinators into a seamless circle of care. Designed for warmth, privacy, and true
            human connection.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 text-left"
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
              className="btn-serene-secondary text-base sm:text-lg px-7 py-4"
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
          #hero .flex-col {
            align-items: center !important;
            text-align: center !important;
          }
          #hero h1 {
            text-align: center;
          }
          #hero p {
            text-align: center;
          }
          #hero .flex-col.sm\\:flex-row {
            flex-direction: column !important;
          }
        }
      `}</style>
    </section>
  );
}
