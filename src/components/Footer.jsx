import React from 'react';
import {
  Heart,
  Stethoscope,
  HeartHandshake,
  User,
  ShieldAlert,
  Shield,
  Phone,
  Mail,
  MapPin,
  LifeBuoy
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Footer({ onOpenRoleLogin }) {
  return (
    <footer className="bg-[#1e1b14] text-white pt-16 pb-12 border-t border-serene-outline/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Prominent Emergency / Helpline Callout Card */}
        <div className="mb-14 p-6 sm:p-8 bg-[#2d291e] rounded-serene-lg border border-[#4a473d] flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3.5 bg-[#645e45] text-white rounded-full shrink-0 shadow-md">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-extrabold text-[#fde68a]">
                24/7 Community Care Helpline
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                Need Immediate Palliative Care Assistance?
              </h3>
              <p className="text-sm text-gray-300 font-medium">
                Call free hotline: <strong className="text-white font-bold">1-800-KARUNA (1-800-527-862)</strong> • Available 24 hours daily.
              </p>
            </div>
          </div>

          <a
            href="tel:1800527862"
            className="px-7 py-3.5 bg-white text-[#1e1b14] font-bold rounded-full hover:bg-[#fff9ef] transition-colors shrink-0 shadow-md flex items-center gap-2"
          >
            <LifeBuoy className="w-5 h-5 text-[#645e45]" />
            <span>Call Helpline Now</span>
          </a>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-gray-700/60">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="KarunaGrid Logo" className="w-10 h-10 rounded-full bg-[#fff9ef] p-1" />
              <span className="font-extrabold text-2xl text-white tracking-tight">
                Karuna<span className="text-[#b5ad8f]">Grid</span>
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed max-w-sm font-medium">
              Community Palliative Care Coordination Platform. Connecting patients, caregivers, doctors, nurses, and volunteers into a unified circle of care.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Designed with compassion for families & clinical teams.</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li><a href="#hero" className="hover:text-amber-300 transition-colors">Home</a></li>
              <li><a href="#about" className="hover:text-amber-300 transition-colors">About Care</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Services</a></li>
              <li><a href="#how-it-works" className="hover:text-amber-300 transition-colors">How It Works</a></li>
              <li><a href="#trust" className="hover:text-amber-300 transition-colors">Trust & Safety</a></li>
            </ul>
          </div>

          {/* Col 3: 5 Portal Roles */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-4">
              Care Portals (5 Roles)
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onOpenRoleLogin('patient')}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 text-amber-300" />
                  <span>Patient Portal</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenRoleLogin('caregiver')}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <HeartHandshake className="w-4 h-4 text-amber-300" />
                  <span>Caregiver Portal</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenRoleLogin('doctor')}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Stethoscope className="w-4 h-4 text-amber-300" />
                  <span>Doctor Portal</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenRoleLogin('nurse')}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <span>Nurse & Field Team</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenRoleLogin('admin')}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Shield className="w-4 h-4 text-amber-300" />
                  <span>Administrator Portal</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Support */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-4">
              Contact & Network Support
            </h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-amber-300 shrink-0 mt-1" />
                <span>Helpline: 1-800-KARUNA (527-862)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-amber-300 shrink-0 mt-1" />
                <span>care@karunagrid.org</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0 mt-1" />
                <span>Community Care Network</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} KarunaGrid Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:underline hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:underline hover:text-white">Terms of Service</a>
            <a href="#" className="hover:underline hover:text-white">Accessibility Notice</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
