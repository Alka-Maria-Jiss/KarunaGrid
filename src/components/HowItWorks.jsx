import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Users, CalendarCheck, Activity, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserCheck,
    title: 'Simple Registration',
    desc: 'Patients or family caregivers quickly sign up and share their care requirements, location, and contact details.'
  },
  {
    number: '02',
    icon: Users,
    title: 'Matched Care Team',
    desc: 'Our platform connects your family with nearby certified doctors, palliative field nurses, and community volunteers.'
  },
  {
    number: '03',
    icon: CalendarCheck,
    title: 'Book Visits & Tele-Consults',
    desc: 'Request home nursing visits, schedule video appointments with doctors, and access welfare scheme guidance.'
  },
  {
    number: '04',
    icon: Activity,
    title: 'Track Unified Care Timeline',
    desc: 'Keep all doctors, family members, and field nurses synchronized with structured health logs and real-time care updates.'
  }
];

export default function HowItWorks({ onOpenRegister }) {
  return (
    <section id="how-it-works" className="py-24 bg-serene-low/60 border-t border-serene-outline-subtle/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="serene-tag">
            Four Simple Steps
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-serene-text mt-4 mb-4 tracking-tight">
            How KarunaGrid Simplifies Care
          </h2>
          <p className="text-serene-muted text-base sm:text-lg leading-relaxed font-medium">
            We remove complexity so families can focus on warmth, comfort, and spending quality time together.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: idx * 0.12 }}
                className="serene-card flex flex-col justify-between relative"
              >
                <div>
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-extrabold text-serene-primary/30 tracking-tight">
                      {step.number}
                    </span>
                    <div className="serene-icon-badge">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-serene-text mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-serene-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-serene-primary/40">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Registration CTA Footer */}
        <div className="mt-14 text-center">
          <button
            onClick={onOpenRegister}
            className="btn-serene-primary"
          >
            <span>Get Started with Step 1</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
}
