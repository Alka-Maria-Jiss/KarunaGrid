import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Activity, Phone, MapPin, CheckCircle2 } from 'lucide-react';

export default function NurseDashboard({ user, onLogout }) {
  const details = user?.details || {};

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        
        {/* WELCOME BANNER */}
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-4 shadow-sm">
          <Activity className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-extrabold text-base text-indigo-950">Nurse Care Portal</h3>
            <p className="text-xs sm:text-sm text-indigo-900 mt-1 font-medium leading-relaxed">
              Welcome, Nurse {user?.name || user?.email}! Your active care network profile is verified. You can review assigned home visit schedules, palliative care logs, and patient visit requests.
            </p>
          </div>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl border border-serene-outline-subtle p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-serene-outline-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-serene-text">{user?.name || 'Nurse'}</h2>
                <p className="text-xs text-serene-muted font-semibold">{user?.email}</p>
              </div>
            </div>
            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              APPROVED & ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-serene-text">
            <div>
              <p><strong className="text-serene-muted">Phone:</strong> {details.phone || 'N/A'}</p>
              <p><strong className="text-serene-muted">Panchayath:</strong> {details.panchayath || 'N/A'}</p>
            </div>
            <div>
              <p><strong className="text-serene-muted">Pincode:</strong> {details.pincode || 'N/A'}</p>
              <p><strong className="text-serene-muted">Nurse ID:</strong> #{details.nurse_id}</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
