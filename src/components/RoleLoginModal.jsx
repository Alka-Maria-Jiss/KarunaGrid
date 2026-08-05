import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  HeartHandshake,
  User,
  ShieldAlert,
  Shield,
  X,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2
} from 'lucide-react';

/*
  ==========================================================================
  KARUNAGRID PHASE 1 ROLES ONLY (5 ACTIVE ROLES)
  ==========================================================================
  1. Patient - Personal care timeline, tele-consults & symptom logging
  2. Caregiver - Family care routine management, medication tracking & respite support
  3. Doctor - Clinical oversight, tele-consults & treatment plan management
  4. Nurse & Field Team - Home visit management, vital sign recording & triage
  5. Administrator - System configuration, user access & compliance reporting
  
  MEDICAL STORE OWNER IS A PHASE 2 ROLE (EXCLUDED FROM PHASE 1).
  ==========================================================================
*/

const phase1Roles = [
  {
    id: 'patient',
    title: 'Patient Portal',
    desc: 'Access your personal care plan, log daily symptoms, request home visits, and message your care team.',
    registerHelp: 'Choose this if you are receiving palliative care or seeking symptom relief at home.',
    icon: User,
    tag: 'Comfort & Care'
  },
  {
    id: 'caregiver',
    title: 'Caregiver Portal',
    desc: 'Manage family care routines, track medication schedules, organize shift rosters, and access respite support.',
    registerHelp: 'Choose this if you are a family member or primary caregiver caring for a loved one.',
    icon: HeartHandshake,
    tag: 'Family Support'
  },
  {
    id: 'doctor',
    title: 'Doctor Portal',
    desc: 'Review patient health timelines, approve prescriptions, conduct tele-consultations, and oversee treatment plans.',
    registerHelp: 'Choose this if you are a licensed medical doctor or palliative care specialist.',
    icon: Stethoscope,
    tag: 'Clinical Oversight'
  },
  {
    id: 'nurse',
    title: 'Nurse & Field Team',
    desc: 'Plan home visit schedules, record patient vital signs, report health updates, and coordinate triage.',
    registerHelp: 'Choose this if you are a field nurse, community palliative worker, or clinical assistant.',
    icon: ShieldAlert,
    tag: 'Community Field Care'
  },
  {
    id: 'admin',
    title: 'Administrator Portal',
    desc: 'Manage platform user access, oversee clinic assignments, review compliance reports, and configure care settings.',
    registerHelp: 'Choose this if you are a network coordinator or system administrator.',
    icon: Shield,
    tag: 'System Management'
  }
];

export default function RoleLoginModal({
  isOpen,
  onClose,
  initialTab = 'login',
  defaultRole = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedRoleId, setSelectedRoleId] = useState(defaultRole || 'patient');

  useEffect(() => {
    setActiveTab(initialTab || 'login');
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (defaultRole) {
      setSelectedRoleId(defaultRole);
    }
  }, [defaultRole, isOpen]);

  if (!isOpen) return null;

  const currentRoleObj = phase1Roles.find((r) => r.id === selectedRoleId) || phase1Roles[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const mode = activeTab === 'login' ? 'Login' : 'Registration';
    alert(
      `[KarunaGrid Care Network]\nSuccessfully initiated ${mode} for: ${currentRoleObj.title}.\n(Role: ${currentRoleObj.id.toUpperCase()})`
    );
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-serene-text/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-serene-bg rounded-serene-lg shadow-serene-hover border border-serene-outline-subtle p-6 sm:p-8 z-10 my-8 overflow-hidden"
        >
          {/* Top Bar: Close Button */}
          <div className="flex items-center justify-between border-b border-serene-outline-subtle/60 pb-4 mb-5">
            <div>
              <span className="serene-tag text-[10px]">
                KarunaGrid Care Network
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-serene-muted hover:text-serene-text hover:bg-serene-container transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reassuring Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-serene-text tracking-tight">
              {activeTab === 'login'
                ? 'Welcome back to your care circle'
                : "Join KarunaGrid's care community"}
            </h2>
            <p className="text-serene-muted text-sm sm:text-base mt-1 leading-relaxed font-medium">
              {activeTab === 'login'
                ? 'Select your assigned portal role to access your dedicated dashboard.'
                : 'Register your account to connect with nearby palliative doctors, nurses, and volunteers.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-serene-container p-1 rounded-full mb-6 border border-serene-outline-subtle">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-serene-primary text-white shadow-serene-sm'
                  : 'text-serene-muted hover:text-serene-text'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Portal Login</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-serene-primary text-white shadow-serene-sm'
                  : 'text-serene-muted hover:text-serene-text'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Account</span>
            </button>
          </div>

          {/* Guided Role Selection List */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-serene-muted mb-3">
              Select Your Role ({phase1Roles.length} Care Portals):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
              {phase1Roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`cursor-pointer p-4 rounded-serene border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-serene-container border-serene-primary shadow-serene-sm'
                        : 'bg-serene-low hover:bg-serene-container/60 border-serene-outline-subtle'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${isSelected ? 'bg-serene-primary text-white' : 'bg-serene-bg text-serene-primary'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-serene-text text-sm">
                            {role.title}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-serene-primary shrink-0" />}
                      </div>

                      <p className="text-xs text-serene-muted leading-relaxed font-normal">
                        {role.desc}
                      </p>
                    </div>

                    {/* Guided registration explanation */}
                    {activeTab === 'register' && isSelected && (
                      <div className="mt-3 pt-2 border-t border-serene-outline-subtle/40 text-[11px] text-serene-primary font-semibold">
                        💡 {role.registerHelp}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Action */}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              className="btn-serene-primary w-full py-3.5 text-base font-bold shadow-serene"
            >
              <span>
                {activeTab === 'login'
                  ? `Access ${currentRoleObj.title}`
                  : `Proceed to ${currentRoleObj.title} Registration`}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-serene-outline-subtle/50 flex items-center justify-between text-xs text-serene-muted">
            <span>Need support? Contact helpline: 1-800-KARUNA</span>
            <button
              onClick={onClose}
              className="font-semibold text-serene-primary hover:underline"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
