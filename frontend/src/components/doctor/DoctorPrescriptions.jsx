import React, { useState, useEffect } from 'react';
import { Pill, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, User, ArrowRight } from 'lucide-react';

export default function DoctorPrescriptions({
  initialPatientId = null,
}) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '');
  const [items, setItems] = useState([
    { medicine_name: '', dosage: '500mg', frequency: 'Once daily', duration_days: '7', change_type: 'New' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/prescriptions/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
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
        if (!selectedPatientId && data.length > 0) {
          setSelectedPatientId(data[0].patient_id);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      { medicine_name: '', dosage: '', frequency: 'Twice daily', duration_days: '5', change_type: 'New' },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const validItems = items.filter((it) => it.medicine_name.trim());
    if (validItems.length === 0) {
      setMessage({ text: 'Please enter at least one valid medication item.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/prescriptions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          items: validItems,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Prescription created successfully.', type: 'success' });
        setShowCreateModal(false);
        setItems([{ medicine_name: '', dosage: '500mg', frequency: 'Once daily', duration_days: '7', change_type: 'New' }]);
        fetchPrescriptions();
      } else {
        setMessage({ text: data.errors?.items?.[0] || data.detail || 'Failed to create prescription.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error submitting prescription.', type: 'error' });
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
            <Pill className="w-5 h-5 text-[#695e3d]" />
            <h2 className="text-lg font-black text-[#1e1b14]">
              Prescriptions & Medication Management
            </h2>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-1">
            Issue palliative medication regimens, maintain version histories, and track active dosage changes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPrescriptions}
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
            <span>Create Prescription</span>
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

      {/* Prescriptions List */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7b776c]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#645e45] mb-2" />
            <p className="font-bold">Loading prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
            <Pill className="w-8 h-8 mx-auto text-[#695e3d] mb-2" />
            <p className="font-bold text-sm text-[#1e1b14]">No prescriptions found.</p>
            <p>Click "Create Prescription" to prescribe medications for a registered patient.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f2ece1]">
            {prescriptions.map((rx) => (
              <div key={rx.prescription_id} className="p-5 hover:bg-[#fdfbf7] transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#f5f1ea] text-[#695e3d] border border-[#e7ded0]">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#1e1b14]">
                          {rx.patient_name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] text-[10px] font-extrabold">
                          Version {rx.version_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7b776c] mt-0.5">
                        Prescribed by Dr. {rx.doctor_name} on {rx.created_at}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      rx.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {rx.status}
                  </span>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-xl border border-[#f0eae0] bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#fdfbf7] border-b border-[#f0eae0] text-[10px] font-extrabold text-[#7b776c] uppercase">
                        <th className="py-2.5 px-3.5">Medicine Name</th>
                        <th className="py-2.5 px-3.5">Dosage</th>
                        <th className="py-2.5 px-3.5">Frequency</th>
                        <th className="py-2.5 px-3.5">Duration</th>
                        <th className="py-2.5 px-3.5">Change Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                      {rx.items?.map((it) => (
                        <tr key={it.item_id}>
                          <td className="py-2 px-3.5 font-black">{it.medicine_name}</td>
                          <td className="py-2 px-3.5 font-medium text-[#4a473d]">{it.dosage || 'N/A'}</td>
                          <td className="py-2 px-3.5 font-medium text-[#4a473d]">{it.frequency || 'N/A'}</td>
                          <td className="py-2 px-3.5 font-medium text-[#4a473d]">
                            {it.duration_days ? `${it.duration_days} days` : 'Ongoing'}
                          </td>
                          <td className="py-2 px-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#edf3ec] text-[#426442] text-[10px] font-extrabold">
                              {it.change_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e9e2d5] shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#f2ece1] bg-[#fdfbf7] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1e1b14]">Create / Update Prescription</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
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

              {/* Medicine Items Dynamic Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#1e1b14]">Prescription Items (Medications) *</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#645e45] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          value={it.medicine_name}
                          onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                          placeholder="Medicine name (e.g., Morphine)"
                          className="w-full p-2 rounded-lg bg-white border border-[#e9e2d5] text-xs text-[#1e1b14] font-bold"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={it.dosage}
                          onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (10mg)"
                          className="w-full p-2 rounded-lg bg-white border border-[#e9e2d5] text-xs text-[#1e1b14]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={it.frequency}
                          onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                          placeholder="Frequency"
                          className="w-full p-2 rounded-lg bg-white border border-[#e9e2d5] text-xs text-[#1e1b14]"
                        />
                      </div>
                      <div>
                        <select
                          value={it.change_type}
                          onChange={(e) => handleItemChange(idx, 'change_type', e.target.value)}
                          className="w-full p-2 rounded-lg bg-white border border-[#e9e2d5] text-[11px] font-bold text-[#1e1b14]"
                        >
                          <option value="New">New</option>
                          <option value="Continued">Continued</option>
                          <option value="DosageChanged">Dosage Changed</option>
                          <option value="Discontinued">Discontinued</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-[#faf0ec] disabled:opacity-30 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {isSubmitting ? 'Saving...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
