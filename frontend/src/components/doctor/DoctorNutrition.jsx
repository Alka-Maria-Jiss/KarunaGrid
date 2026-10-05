import React, { useState, useEffect } from 'react';
import { Utensils, Plus, CheckCircle2, AlertCircle, RefreshCw, X, User } from 'lucide-react';

export default function DoctorNutrition() {
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dietaryRecommendations, setDietaryRecommendations] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/nutrition/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching nutrition plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/doctor/patients/?status=Approved', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedPatientId(data[0].patient_id);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPatients();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/nutrition/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          dietary_recommendations: dietaryRecommendations.trim(),
          special_instructions: specialInstructions.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Nutrition plan created successfully.', type: 'success' });
        setShowCreateModal(false);
        setDietaryRecommendations('');
        setSpecialInstructions('');
        fetchPlans();
      } else {
        setMessage({ text: data.detail || 'Failed to save nutrition plan.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error creating nutrition plan.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Nutrition & Dietary Care Plans
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Formulate personalized palliative nutrition guidelines, feeding instructions, and dietary restrictions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPlans}
            disabled={isLoading}
            className="p-2 rounded-xl text-[#645e45] bg-[#fdfbf7] border border-[#e9e2d5] hover:bg-[#f4ede0] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Nutrition Plan</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#ba1a1a] flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Plans List */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading nutrition plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Utensils className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No nutrition plans created.</p>
            <p>Click "Create Nutrition Plan" to formulate dietary care for a registered patient.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f2ece1]">
            {plans.map((np) => (
              <div key={np.plan_id} className="p-5 hover:bg-[#fdfbf7] transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#1e1b14]">
                          {np.patient_name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] text-[10px] font-extrabold">
                          Version {np.version_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7b776c] mt-0.5">
                        Created by Dr. {np.doctor_name} on {np.created_at}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      np.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {np.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-[#f0eae0] space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b776c]">
                      Dietary Recommendations
                    </span>
                    <p className="text-[#1e1b14] leading-relaxed">
                      {np.dietary_recommendations || 'Standard balanced palliative diet.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#f0eae0] space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b776c]">
                      Special Instructions
                    </span>
                    <p className="text-[#4a473d] leading-relaxed">
                      {np.special_instructions || 'None specified.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1e1b14]">Create Nutrition Care Plan</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1e1b14] mb-1">Select Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs font-bold text-[#1e1b14]"
                >
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name}{p.place ? ` – ${p.place}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1e1b14] mb-1">Dietary Recommendations *</label>
                <textarea
                  rows={3}
                  required
                  value={dietaryRecommendations}
                  onChange={(e) => setDietaryRecommendations(e.target.value)}
                  placeholder="Specify caloric requirements, soft foods, high-protein supplements..."
                  className="w-full p-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1e1b14] mb-1">Special Feeding Instructions</label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Swallowing precautions, aspiration risks, small frequent meals..."
                  className="w-full p-2.5 rounded-xl bg-white border border-[#e9e2d5] text-xs text-[#1e1b14]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl font-black text-white bg-[#645e45] hover:bg-[#4c472f] shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Nutrition Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
