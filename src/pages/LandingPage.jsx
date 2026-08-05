import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AboutPalliativeCare from '../components/AboutPalliativeCare';
import ServicesGrid from '../components/ServicesGrid';
import HowItWorks from '../components/HowItWorks';
import TrustImpact from '../components/TrustImpact';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import RoleLoginModal from '../components/RoleLoginModal';

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');
  const [selectedRole, setSelectedRole] = useState(null);

  const handleOpenModal = (tab = 'login', role = null) => {
    setModalTab(tab);
    setSelectedRole(role);
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen bg-serene-bg text-serene-text font-sans antialiased selection:bg-serene-primary-container selection:text-serene-text">
      {/* Navigation */}
      <Navbar
        onOpenLogin={() => handleOpenModal('login')}
        onOpenRegister={() => handleOpenModal('register', 'patient')}
      />

      {/* Hero Section */}
      <main>
        <Hero
          onOpenRegister={() => handleOpenModal('register', 'patient')}
          onLearnMore={() => {
            const el = document.getElementById('about');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* What is Palliative Care? */}
        <AboutPalliativeCare />

        {/* Services Grid */}
        <ServicesGrid
          onSelectService={() => handleOpenModal('login')}
        />

        {/* How It Works */}
        <HowItWorks
          onOpenRegister={() => handleOpenModal('register', 'patient')}
        />

        {/* Trust & Impact */}
        <TrustImpact />

        {/* Closing CTA */}
        <CTASection
          onOpenRegister={() => handleOpenModal('register', 'patient')}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenRoleLogin={(role) => handleOpenModal('login', role)}
      />

      {/* Role Login / Register Modal */}
      <RoleLoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseModal}
        initialTab={modalTab}
        defaultRole={selectedRole}
      />
    </div>
  );
}
