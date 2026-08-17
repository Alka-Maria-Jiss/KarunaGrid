import React, { useState, useEffect } from 'react';
import { Boxes, Plus, CheckCircle2, Clock, AlertCircle, PackageCheck, ShieldCheck, X } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function PatientEquipmentView({
  onRefresh,
}) {
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchEquipmentData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/patient/equipment/');
      setTypes(res.available_types || []);
      setRequests(res.my_requests || []);
      if (res.available_types && res.available_types.length > 0 && !selectedTypeId) {
        setSelectedTypeId(res.available_types[0].equipment_type_id);
      }
    } catch (err) {
      console.error('Error fetching equipment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTypeId) {
      showError('Please choose an equipment type.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/patient/equipment/', {
        equipment_type_id: selectedTypeId,
      });
      showSuccess(res.message || 'Equipment request submitted successfully!');
      setShowRequestModal(false);
      fetchEquipmentData();
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to submit equipment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Assistive Medical Equipment Requests
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              {requests.length} Requests
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Request home palliative medical equipment (oxygen concentrators, hospital beds, wheelchairs)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Request Medical Equipment</span>
        </button>
      </div>

      {/* MY EQUIPMENT REQUESTS */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#1e1b14] border-b border-[#f2ece1] pb-3 flex items-center justify-between">
          <span>My Equipment Requests</span>
          <span className="text-xs text-[#7b776c] font-medium">
            Clinical evaluation handled by Doctor
          </span>
        </h3>

        {requests.length === 0 ? (
          <div className="p-8 text-center bg-[#fdfbf7] rounded-xl border border-[#f0eae0] text-xs text-[#7b776c] font-medium">
            You have not submitted any medical equipment requests yet.
          </div>
        ) : (
          <div className="divide-y divide-[#f2ece1]">
            {requests.map((r) => (
              <div
                key={r.request_id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-[#1e1b14]">
                      {r.equipment_type_name}
                    </h4>
                    <p className="text-[11px] text-[#7b776c] font-medium">
                      Requested on {r.requested_at}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-xs">
                    <span className="text-[10px] text-[#7b776c] block font-bold">
                      Doctor Approval:
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                        r.doctor_approval_status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : r.doctor_approval_status === 'Rejected'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {r.doctor_approval_status}
                    </span>
                  </div>

                  <div className="text-right text-xs pl-2 border-l border-[#f2ece1]">
                    <span className="text-[10px] text-[#7b776c] block font-bold">
                      Delivery Status:
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#f4ede0] text-[#645e45]">
                      {r.delivery_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AVAILABLE EQUIPMENT CATALOG (READ-ONLY) */}
      <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#1e1b14] border-b border-[#f2ece1] pb-3">
          Available Equipment Catalog
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {types.map((t) => (
            <div
              key={t.equipment_type_id}
              className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-2 flex flex-col justify-between"
            >
              <div>
                <h4 className="font-extrabold text-xs text-[#1e1b14]">{t.name}</h4>
                <p className="text-[11px] text-[#7b776c] line-clamp-2 mt-0.5">
                  {t.description || 'Palliative medical device available on clinical prescription.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTypeId(t.equipment_type_id);
                  setShowRequestModal(true);
                }}
                className="mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#645e45] hover:text-white transition-all cursor-pointer text-center"
              >
                Request This Device
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleRequestSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e1b14]">
                    Request Medical Equipment
                  </h3>
                  <p className="text-xs text-[#7b776c]">
                    Your request will be evaluated by your attending Doctor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Select Equipment Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  {types.map((t) => (
                    <option key={t.equipment_type_id} value={t.equipment_type_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-[#7b776c] bg-[#fdfbf7] p-3 rounded-xl border border-[#f0eae0] leading-relaxed">
                <strong>Important:</strong> Medical equipment requests require clinical necessity verification by your Doctor. Once approved, the Administrator allocates and delivers the unit.
              </p>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:text-[#1e1b14]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
