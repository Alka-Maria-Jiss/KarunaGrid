import React from 'react';
import { motion } from 'framer-motion';
import { Heart, UserPlus, PhoneCall } from 'lucide-react';

export default function CTASection({ onOpenRegister }) {
  return (
    <section className="py-20 bg-serene-low/60 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="serene-card p-8 sm:p-12 text-center relative overflow-hidden bg-serene-container/90 border-serene-outline-subtle shadow-serene-hover"
        >
          {/* Background decoration */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-serene-primary-container/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-serene-secondary-container/30 rounded-full blur-2xl pointer-events-none" />

          <div className="serene-icon-badge mb-6 mx-auto">
            <Heart className="w-6 h-6 fill-serene-primary text-serene-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-serene-text tracking-tight mb-4 max-w-2xl mx-auto">
            Ready to bring compassionate care to your loved ones?
          </h2>

          <p className="text-serene-muted text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed font-medium">
            Join the KarunaGrid community today. Registration takes less than 2 minutes and unlocks dedicated support for patients, caregivers, and medical providers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenRegister}
              className="btn-serene-primary w-full sm:w-auto px-8 py-4"
            >
              <UserPlus className="w-5 h-5" />
              <span>Register for KarunaGrid</span>
            </button>
            <a
              href="tel:1800527862"
              className="btn-serene-secondary w-full sm:w-auto px-7 py-4"
            >
              <PhoneCall className="w-5 h-5 text-serene-primary" />
              <span>24/7 Care Helpline</span>
            </a>
          </div>

          <p className="text-xs text-serene-muted mt-6 font-semibold">
            Free community access for patients and family caregivers.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
