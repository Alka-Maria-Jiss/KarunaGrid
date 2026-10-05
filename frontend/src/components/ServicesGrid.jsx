import React from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Home,
  FileSpreadsheet,
  HeartHandshake,
  Utensils,
  FileText,
  Activity,
  Boxes,
  ArrowUpRight
} from 'lucide-react';

/*
  ==========================================================================
  KARUNAGRID PHASE 1 MODULES MAPPING (11 MODULES TOTAL)
  ==========================================================================
  
  PRE-LOGIN PUBLIC SERVICE CARDS DISPLAYED BELOW (8 CARDS):
  1. Telemedicine & Video Consults (Module 2)
  2. Home Visit Management (Module 3)
  3. Lab Report & Prescription Management (Module 4)
  4. Caregiver Coordination & Relief (Module 5)
  5. Nutrition & Customized Meal Plans (Module 6)
  6. Government Welfare Scheme Assistance (Module 7)
  7. Medical Equipment Management (Module 8)
  8. Unified Patient Care Timeline (Module 9)
  
  DASHBOARD-ONLY / POST-LOGIN MODULES (DOCUMENTED HERE):
  9. Patient Registration & Medical Profile Management (Module 1) - Handled upon signup and inside Patient/Caregiver dashboard.
  10. Notifications (Module 10) - In-app alerts, SMS visit reminders, and medication schedule alerts.
  11. Reporting & Analytics (Module 11) - Administrative compliance reports, field visit logs, and care summaries.
  
  PHASE 2 ROADMAP ITEMS (STRICTLY EXCLUDED FROM PHASE 1):
  - Medical Store Owner Role
  - AI Symptom Prediction, SHAP Explainability & Risk Scoring
  - AI Doctor Handoff Summaries
  - Emergency SOS & Real-time GPS Tracking
  - Medicine Request & Verification
  - Patient Feedback & Ratings System
  ==========================================================================
*/

const services = [
  {
    icon: Video,
    title: 'Telemedicine & Video Consults',
    desc: 'Connect with palliative doctors and nurse specialists from home without exhausting travel.',
    category: 'Virtual Care',
    badge: '24/7 On-Call'
  },
  {
    icon: Home,
    title: 'Home Visit Management',
    desc: 'Schedule and track field visits by palliative nurses, doctors, and trained community volunteers.',
    category: 'Field Care',
    badge: 'Doorstep Care'
  },
  {
    icon: FileSpreadsheet,
    title: 'Lab Reports & Prescription Management',
    desc: 'Access verified lab results, track prescribed medications, and log daily symptoms manually for your doctor.',
    category: 'Pharmacy & Labs',
    badge: 'Symptom Logging'
  },
  {
    icon: HeartHandshake,
    title: 'Caregiver Support & Relief',
    desc: 'Organize family shift schedules, access respite care resources, and prevent caregiver burnout with community support.',
    category: 'Family Support',
    badge: 'Respite Booking'
  },
  {
    icon: Utensils,
    title: 'Nutrition & Customized Meal Plans',
    desc: 'Dietary guidance tailored to patient preferences, digestive comfort, and medical nutrition needs.',
    category: 'Wellness',
    badge: 'Tailored Diets'
  },
  {
    icon: FileText,
    title: 'Government Welfare Scheme Assistance',
    desc: 'Step-by-step guidance to apply for medical subsidies, disability pensions, and palliative welfare grants.',
    category: 'Financial & Legal',
    badge: 'Free Guidance'
  },
  {
    icon: Boxes,
    title: 'Medical Equipment Support',
    desc: 'Request and track essential home care equipment like oxygen concentrators, hospital beds, and mobility aids.',
    category: 'Equipment Loan',
    badge: 'Community Supply'
  },
  {
    icon: Activity,
    title: 'Unified Patient Care Timeline',
    desc: 'Keep doctors, nurses, and family members synchronized with a clean chronological history of vitals and visit notes.',
    category: 'Care Records',
    badge: 'Shared Timeline'
  }
];

export default function ServicesGrid({ onSelectService }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <section id="services" className="py-24 bg-serene-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="serene-tag">
            Our Coordinated Services
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-serene-text mt-4 mb-4 tracking-tight">
            Comprehensive Community Care at Your Doorstep
          </h2>
          <p className="text-serene-muted text-base sm:text-lg leading-relaxed font-medium">
            KarunaGrid brings together medical care, family support, and social welfare into one easy-to-use platform designed for peace of mind.
          </p>
        </div>

        {/* 8-Card Staggered Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
        >
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                variants={cardVariants}
                onClick={onSelectService}
                className="group serene-card cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Top: Icon & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="serene-icon-badge group-hover:bg-serene-primary group-hover:text-white transition-colors duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="serene-tag text-[10px]">
                      {service.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-serene-text mb-2.5 group-hover:text-serene-primary transition-colors flex items-center justify-between leading-snug">
                    <span>{service.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-serene-primary shrink-0 ml-1" />
                  </h3>
                  <p className="text-sm text-serene-muted leading-relaxed mb-6 font-normal">
                    {service.desc}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="pt-4 border-t border-serene-outline-subtle/60 flex items-center justify-between text-xs font-semibold text-serene-primary">
                  <span>{service.category}</span>
                  <span className="group-hover:underline">Access Portal &rarr;</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Subtle note about post-login modules */}
        <div className="mt-12 text-center text-xs text-serene-muted max-w-2xl mx-auto">
          <span>
            * Additional core capabilities — including patient medical profiles, automated visit notifications, and care reporting — are accessible inside post-login portals.
          </span>
        </div>

      </div>
    </section>
  );
}
