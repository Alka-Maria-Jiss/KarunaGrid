import React, { useState } from 'react';
import { Stethoscope, UserPlus, Search, ShieldCheck, Power, Phone, MapPin, Eye, X, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminDoctorManagement({
  doctors = [],
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Form State for Add Doctor
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { showSuccess, showError } = useToast();

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.email?.toLowerCase().includes(q) ||
      doc.details?.specialization?.toLowerCase().includes(q) ||
      doc.details?.service_area?.toLowerCase().includes(q)
    );
  });

  const handleToggleStatus = async (user_id, currentActive) => {
    try {
      const res = await apiClient.post(`/admin/users/${user_id}/toggle-status/`);
      showSuccess(res.message);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update doctor account status.');
    }
  };

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const payload = {
        name: name.trim(),
        specialization: specialization.trim() || 'Palliative Medicine',
        email: email.trim(),
        phone: phone.trim(),
        service_area: serviceArea.trim(),
        password,
      };

      const res = await apiClient.post('/admin/onboard-doctor/', payload);
      showSuccess(res.message || 'Doctor account created and pre-approved successfully!');

      // Reset form
      setName('');
      setSpecialization('');
      setEmail('');
      setPhone('');
      setServiceArea('');
      setPassword('');
      setShowAddModal(false);

      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setFieldErrors(err.data.errors);
      } else {
        showError(err.message || 'Failed to create doctor account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Doctor Management
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4f2e9] text-[#645e45] rounded-full border border-[#e2dec9]">
              {filteredDoctors.length} Doctors
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Manage registered palliative care physicians and onboard pre-approved doctors
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Doctor (Pre-Approved)</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors by name, email, specialization, or service area..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {filteredDoctors.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No doctor records found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                  <th className="py-3 px-4 font-extrabold">Doctor Name</th>
                  <th className="py-3 px-4 font-extrabold">Specialization</th>
                  <th className="py-3 px-4 font-extrabold">Email & Contact</th>
                  <th className="py-3 px-4 font-extrabold">Service Area</th>
                  <th className="py-3 px-4 font-extrabold">Account Status</th>
                  <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece1]">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.user_id} className="hover:bg-[#faf7f0] transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#f4f2e9] text-[#645e45] flex items-center justify-center font-extrabold text-xs border border-[#e2dec9]">
                          Dr
                        </div>
                        <span>{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#4a473d]">
                      {doc.details?.specialization || 'Palliative Medicine'}
                    </td>
                    <td className="py-3.5 px-4 text-[#4a473d]">
                      <p className="font-medium">{doc.email}</p>
                      <p className="text-[11px] text-[#7b776c]">{doc.phone || 'No phone'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                      {doc.address || doc.details?.service_area || 'District Service'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                          doc.is_active
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{doc.is_active ? 'Active & Approved' : 'Deactivated'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDoctor(doc)}
                          className="p-1.5 rounded-lg text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc.user_id, doc.is_active)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            doc.is_active
                              ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={doc.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD DOCTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAddDoctorSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4f2e9] text-[#645e45]">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Onboard New Doctor
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Doctor accounts created by Administrator are automatically pre-approved
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Thomas Paul"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
                {fieldErrors.name && (
                  <p className="text-rose-600 font-semibold mt-0.5">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Specialization <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Palliative Medicine, Oncology, Pain Management"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@karunagrid.org"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
                {fieldErrors.email && (
                  <p className="text-rose-600 font-semibold mt-0.5">{fieldErrors.email[0]}</p>
                )}
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Phone Number (10 digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Service Area / District <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Ernakulam District"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Creating Doctor...' : 'Onboard & Pre-Approve'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCTOR DETAIL MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Doctor Profile Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#1e1b14]">
              <p><strong>Name:</strong> {selectedDoctor.name}</p>
              <p><strong>Email:</strong> {selectedDoctor.email}</p>
              <p><strong>Phone:</strong> {selectedDoctor.phone || 'N/A'}</p>
              <p><strong>Specialization:</strong> {selectedDoctor.details?.specialization || 'Palliative Medicine'}</p>
              <p><strong>Service Area:</strong> {selectedDoctor.address || selectedDoctor.details?.service_area || 'District Ward'}</p>
              <p><strong>Account Status:</strong> {selectedDoctor.is_active ? 'Active' : 'Deactivated'}</p>
              <p><strong>Registered Date:</strong> {selectedDoctor.created_at}</p>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] rounded-xl hover:bg-[#4c472f]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
