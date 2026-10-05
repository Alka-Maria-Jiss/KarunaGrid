import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AboutPalliativeCare from '../components/AboutPalliativeCare';
import ServicesGrid from '../components/ServicesGrid';
import HowItWorks from '../components/HowItWorks';
import TrustImpact from '../components/TrustImpact';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

export default function LandingPage({ onNavigate }) {
  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-serene-bg text-serene-text font-sans antialiased selection:bg-serene-primary-container selection:text-serene-text">
      {/* Navigation */}
      <Navbar
        onOpenLogin={() => handleNavigate('/login')}
        onOpenRegister={() => handleNavigate('/register')}
      />

      {/* Hero Section */}
      <main>
        <Hero
          onOpenRegister={() => handleNavigate('/register')}
          onLearnMore={() => {
            const el = document.getElementById('about');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* What is Palliative Care? */}
        <AboutPalliativeCare />

        {/* Services Grid */}
        <ServicesGrid
          onSelectService={() => handleNavigate('/login')}
        />

        {/* How It Works */}
        <HowItWorks
          onOpenRegister={() => handleNavigate('/register')}
        />

        {/* Trust & Impact */}
        <TrustImpact />

        {/* Closing CTA */}
        <CTASection
          onOpenRegister={() => handleNavigate('/register')}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenRoleLogin={() => handleNavigate('/login')}
      />
    </div>
  );
}
