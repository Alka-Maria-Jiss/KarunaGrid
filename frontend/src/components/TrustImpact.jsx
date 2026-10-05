import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Home, Users, Lock } from 'lucide-react';

const trustPillars = [
  {
    icon: ShieldCheck,
    title: 'Coordinated Community Care',
    desc: 'Shared care timelines prevent miscommunication between doctors, nurses, and family members.'
  },
  {
    icon: Home,
    title: 'Home-First Approach',
    desc: 'Prioritizing patient comfort at home while maintaining reliable medical communication & monitoring.'
  },
  {
    icon: Users,
    title: 'Family Included Every Step',
    desc: 'Empowering caregivers with clear daily routines, respite support, and direct access to medical advice.'
  },
  {
    icon: Lock,
    title: 'Privacy & Dignity Guaranteed',
    desc: 'Strict healthcare privacy standards ensure sensitive medical logs are accessible only to authorized care teams.'
  }
];

export default function TrustImpact() {
  return (
    <section id="trust" className="py-20 bg-serene-bg relative overflow-hidden border-t border-serene-outline-subtle/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="serene-tag">
            Our Care Commitments
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-serene-text mt-4 mb-4 tracking-tight">
            Built on Trust, Human Dignity, and Safety
          </h2>
          <p className="text-serene-muted text-base sm:text-lg leading-relaxed font-medium">
            Healthcare technology should feel like an extension of warm community care, not a distant clinical portal.
          </p>
        </motion.div>

        {/* 4-Pillar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="serene-card text-center flex flex-col items-center justify-between"
              >
                <div className="flex flex-col items-center">
                  <div className="serene-icon-badge mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-serene-text mb-2 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-serene-muted leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
