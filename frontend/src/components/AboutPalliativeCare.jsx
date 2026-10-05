import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sun, Users, CheckCircle2, LifeBuoy, Shield } from 'lucide-react';

export default function AboutPalliativeCare() {
  const pillars = [
    {
      icon: Heart,
      title: 'Symptom & Pain Relief',
      description: 'Managing physical discomfort, pain, fatigue, and distress so patients can live comfortably at home.'
    },
    {
      icon: Users,
      title: 'Family & Caregiver Support',
      description: 'Providing emotional guidance, shift coordination, and practical respite for family caregivers.'
    },
    {
      icon: Sun,
      title: 'Whole-Person Wellbeing',
      description: 'Addressing physical, emotional, social, and spiritual needs with warmth and human empathy.'
    }
  ];

  return (
    <section id="about" className="py-20 bg-serene-low/50 relative overflow-hidden border-y border-serene-outline-subtle/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="serene-tag">
            Understanding Palliative Care
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-serene-text mt-4 mb-4 tracking-tight">
            What is Palliative Care?
          </h2>
          <p className="text-serene-muted text-base sm:text-lg leading-relaxed font-medium">
            Palliative care is specialized, compassionate support for anyone living with a serious illness. It is focused on relief from symptoms and stress — improving quality of life for both the patient and their family.
          </p>
        </motion.div>

        {/* Phase 1 Trust Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 text-center">
          <div className="serene-card py-4 px-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-serene-primary block">5 Roles</span>
            <span className="text-xs text-serene-muted font-semibold">Patients, Caregivers, Nurses, Doctors & Admins</span>
          </div>
          <div className="serene-card py-4 px-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-serene-primary block">11 Modules</span>
            <span className="text-xs text-serene-muted font-semibold">Comprehensive Care Coverage</span>
          </div>
          <div className="serene-card py-4 px-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-serene-primary block">100% Free</span>
            <span className="text-xs text-serene-muted font-semibold">Community Welfare & Scheme Access</span>
          </div>
          <div className="serene-card py-4 px-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-serene-primary block">24/7 Support</span>
            <span className="text-xs text-serene-muted font-semibold">Dedicated Care Line & Tele-Consults</span>
          </div>
        </div>

        {/* Main Content Grid: Clarification Banner & Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
          
          {/* Left: SVG Illustration & Myth vs Fact Box */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 serene-card"
          >
            {/* Calming SVG Illustration */}
            <div className="w-full flex justify-center mb-6">
              <svg viewBox="0 0 200 160" className="w-48 h-36 text-serene-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="80" r="70" fill="#f4ede0" />
                <path d="M100 40 C70 40, 50 65, 50 90 C50 115, 80 135, 100 145 C120 135, 150 115, 150 90 C150 65, 130 40, 100 40 Z" fill="#b5ad8f" opacity="0.4" />
                <path d="M100 50 C80 50, 65 70, 65 92 C65 110, 88 126, 100 134 C112 126, 135 110, 135 92 C135 70, 120 50, 100 50 Z" fill="#645e45" />
                <path d="M85 85 Q100 70 115 85 Q100 100 85 85 Z" fill="#fff9ef" />
                <circle cx="100" cy="85" r="5" fill="#695e3d" />
              </svg>
            </div>

            <div className="bg-serene-container/80 p-4 rounded-serene border border-serene-outline-subtle mb-4">
              <div className="flex items-center gap-2 font-bold text-serene-text mb-1">
                <CheckCircle2 className="w-5 h-5 text-serene-primary shrink-0" />
                <span>Not Just End-of-Life Care</span>
              </div>
              <p className="text-xs sm:text-sm text-serene-muted leading-relaxed font-normal">
                Unlike hospice, palliative care can begin at <strong>any stage of a serious illness</strong>. It is provided right alongside curative treatments like chemotherapy, surgery, or active therapy.
              </p>
            </div>

            <div className="bg-serene-bg p-4 rounded-serene border border-serene-outline-subtle">
              <div className="flex items-center gap-2 font-bold text-serene-text mb-1">
                <LifeBuoy className="w-5 h-5 text-serene-secondary shrink-0" />
                <span>Who Is It For?</span>
              </div>
              <p className="text-xs sm:text-sm text-serene-muted leading-relaxed font-normal">
                For individuals facing cancer, heart failure, ALS, dementia, stroke recovery, or chronic conditions — and the family members caring for them daily.
              </p>
            </div>
          </motion.div>

          {/* Right: Three Pillars Cards */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, x: 25 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: idx * 0.12 }}
                  className="serene-card flex items-start gap-4"
                >
                  <div className="serene-icon-badge">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-serene-text mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-serene-muted leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

        {/* Reassurance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-serene-primary text-white p-6 sm:p-8 rounded-serene-lg shadow-serene text-center max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="text-left">
            <h3 className="text-xl font-bold text-white mb-1">
              Need assistance finding local community palliative services?
            </h3>
            <p className="text-white/90 text-sm font-medium">
              KarunaGrid matches you with nearby nurses, doctors, and volunteer care coordinators.
            </p>
          </div>
          <a
            href="#services"
            className="px-6 py-3 bg-white text-serene-primary font-bold rounded-full hover:bg-serene-bg transition-colors shrink-0 shadow-serene-sm"
          >
            Explore Services
          </a>
        </motion.div>

      </div>
    </section>
  );
}
