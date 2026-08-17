import React, { useState, useEffect } from 'react';
import { HeartHandshake, Phone, Mail, MapPin, Award, Calendar, ShieldCheck, Heart } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function PatientCaregiverView() {
  const [caregiverData, setCaregiverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCaregiver = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get('/patient/caregiver/');
        if (res.assigned && res.caregiver) {
          setCaregiverData(res.caregiver);
        } else {
          setCaregiverData(null);
        }
      } catch (err) {
        console.error('Error fetching caregiver data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaregiver();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              My Assigned Community Caregiver
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f8f3eb] text-[#7a6449] rounded-full border border-[#e8dccb]">
              Care Support
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Verified hospice and palliative care supporter assigned to assist with home care needs
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fdfbf7] border border-[#e0d9cc] text-xs font-bold text-[#645e45]">
          <ShieldCheck className="w-4 h-4" />
          <span>Caregiver Assigned by Nursing Team</span>
        </div>
      </div>

      {/* Caregiver Profile Card */}
      {!caregiverData ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-3 shadow-2xs">
          <HeartHandshake className="w-12 h-12 text-[#7a6449] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Caregiver Has Been Assigned Yet
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto leading-relaxed">
            Your community palliative care team coordinates caregiver support based on your care requirements. As soon as a caregiver is assigned, their details and contact information will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-[#f2ece1]">
            <div className="w-14 h-14 rounded-2xl bg-[#f8f3eb] text-[#7a6449] flex items-center justify-center font-black text-xl border border-[#e8dccb]">
              {caregiverData.name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#1e1b14]">
                  {caregiverData.name}
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Active Care Support
                </span>
              </div>
              <p className="text-xs font-bold text-[#645e45] mt-0.5">
                {caregiverData.qualifications || 'Certified Palliative Caregiver'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
              <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                <Phone className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Contact Phone</span>
              </div>
              <p className="text-sm font-black text-[#1e1b14]">
                {caregiverData.phone || 'Phone not available'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
              <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                <Mail className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Email Address</span>
              </div>
              <p className="text-sm font-black text-[#1e1b14]">
                {caregiverData.email || 'Email not provided'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
              <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                <MapPin className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Service Region / Locality</span>
              </div>
              <p className="text-sm font-black text-[#1e1b14]">
                {caregiverData.place ? `${caregiverData.place}, ${caregiverData.panchayath || ''}` : 'Local District Care Support'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1">
              <div className="flex items-center gap-2 text-[#7b776c] font-bold text-[11px] uppercase">
                <Calendar className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Assignment Status</span>
              </div>
              <p className="text-sm font-black text-[#1e1b14]">
                Active since {caregiverData.assigned_date}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#faf7f0] border border-[#e0d9cc] text-xs text-[#7b776c] space-y-1">
            <p className="font-extrabold text-[#645e45]">Caregiver Role Notice</p>
            <p>
              Your assigned caregiver provides non-clinical assistance and palliative care support. Clinical medical interventions are performed by authorized Doctors and Nurses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
