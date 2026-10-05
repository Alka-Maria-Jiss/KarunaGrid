import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Heart, LogIn, UserPlus } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Navbar({ onOpenLogin, onOpenRegister }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'About Care', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Trust & Safety', href: '#trust' },
  ];

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'top-0 h-20 bg-serene-bg/95 backdrop-blur-md shadow-serene-sm border-b border-serene-outline-subtle/50'
            : 'top-6 h-20 bg-transparent'
        }`}
      >
        {/* 3-column grid: brand | nav | buttons — all on one line, nav truly centred */}
        <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* LEFT: Logo & Brand */}
          <a
            href="#hero"
            className="flex items-center gap-3 shrink-0 group focus:outline-none focus:ring-2 focus:ring-serene-primary rounded-serene"
          >
            <div className="shrink-0 overflow-hidden rounded-full p-0.5 bg-serene-low group-hover:bg-serene-container transition-colors shadow-serene-sm">
              <img
                src={logoImg}
                alt="KarunaGrid Logo"
                className="w-10 h-10 object-contain rounded-full group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <span
              className={`whitespace-nowrap font-bold tracking-tight transition-colors duration-300 ${
                isScrolled ? 'text-serene-text' : 'text-white'
              }`}
              style={{ fontSize: '26px', lineHeight: 1 }}
            >
              KarunaGrid
            </span>
          </a>

          {/* CENTER: Desktop Nav Links — transparent, white text over hero */}
          <nav className="hidden md:flex justify-self-center justify-center items-center gap-1 lg:gap-2 px-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`nav-link px-3.5 py-2 text-sm font-semibold rounded-sm transition-all duration-300 ${
                  isScrolled ? 'text-serene-muted' : 'text-white'
                }`}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-serene-primary bg-white border border-serene-primary/60 hover:bg-serene-primary hover:text-white hover:border-serene-primary rounded-full transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-serene-primary"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-serene-primary hover:bg-serene-primary-hover rounded-full transition-all duration-200 shadow-serene hover:shadow-serene-hover transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-serene-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>

          {/* RIGHT (mobile): Login + Hamburger — spans all 3 cols on small screens, sits in col 3 on md+ */}
          <div className="flex md:hidden items-center gap-2 justify-self-end">
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 text-xs font-semibold text-serene-primary bg-white border border-serene-primary/60 hover:bg-serene-primary hover:text-white rounded-full transition-all duration-300 shadow-sm"
            >
              Login
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full text-serene-text bg-serene-low border border-serene-outline-subtle hover:bg-serene-container focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Scoped nav-link hover styles */}
        <style>{`
          .nav-link {
            position: relative;
            border-bottom: 2px solid transparent;
          }
          .nav-link:hover {
            color: #D6A85E !important;
            border-bottom-color: transparent;
          }
          .nav-link.active {
            border-bottom-color: #D6A85E;
            color: #D6A85E !important;
          }
        `}</style>
      </header>

      {/* Mobile Slide-in Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-serene-text/30 backdrop-blur-sm"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-serene-bg shadow-serene-hover border-l border-serene-outline-subtle p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-serene-container">
                  <div className="flex items-center gap-2.5">
                    <img src={logoImg} alt="KarunaGrid Logo" className="w-8 h-8 rounded-full" />
                    <span className="font-bold text-lg text-serene-text">KarunaGrid</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-full text-serene-muted hover:bg-serene-container"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav items */}
                <div className="py-6 flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 text-base font-semibold text-serene-text hover:bg-serene-low rounded-serene transition-colors"
                    >
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Bottom CTAs */}
              <div className="pt-6 border-t border-serene-container flex flex-col gap-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-3 px-4 text-center font-bold text-serene-primary border border-serene-primary/50 rounded-full hover:bg-serene-low transition-colors"
                >
                  Login to Portal
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegister();
                  }}
                  className="w-full py-3 px-4 text-center font-bold text-white bg-serene-primary rounded-full hover:bg-serene-primary-hover shadow-serene transition-colors"
                >
                  Register Now
                </button>
                <p className="text-center text-xs text-serene-muted mt-2">
                  Compassionate community care for every home.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
