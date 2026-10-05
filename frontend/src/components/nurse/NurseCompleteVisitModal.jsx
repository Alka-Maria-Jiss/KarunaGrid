import React, { useState } from 'react';
import {
  X,
  HeartPulse,
  Activity,
  Thermometer,
  Wind,
  FileText,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  User,
  UserCheck,
  Stethoscope
} from 'lucide-react';

export default function NurseCompleteVisitModal({
  visit,
  onClose,
  onCompleted = () => {},
}) {
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenLevel, setOxygenLevel] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [nextVisitRecommendation, setNextVisitRecommendation] = useState('');
  const [symptoms, setSymptoms] = useState([
    { name: '', severity: 'Mild' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!visit) return null;

  const handleAddSymptom = () => {
    setSymptoms([...symptoms, { name: '', severity: 'Mild' }]);
  };

  const handleRemoveSymptom = (index) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const handleSymptomChange = (index, field, value) => {
    const updated = [...symptoms];
    updated[index][field] = value;
    setSymptoms(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const validSymptoms = symptoms.filter((s) => s.name && s.name.trim() !== '');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/care-coordination/home-visits/occurrences/${visit.occurrence_id}/complete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blood_pressure: bloodPressure,
          pulse: pulse ? parseInt(pulse, 10) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          oxygen_level: oxygenLevel ? parseInt(oxygenLevel, 10) : null,
          treatment_notes: treatmentNotes,
          next_visit_recommendation: nextVisitRecommendation || null,
          symptoms: validSymptoms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCompleted(data);
        onClose();
      } else {
        const errorDetail = data.detail || (data.errors ? Object.values(data.errors).flat().join(' ') : 'Failed to complete visit.');
        setErrorMsg(errorDetail);
      }
    } catch (err) {
      setErrorMsg('Network error while submitting visit completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#e9e2d5] overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-[#fcfaf6] border-b border-[#e9e2d5] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b14]">Complete Home Visit</h2>
              <p className="text-xs text-[#7b776c]">Record clinical vital signs, symptoms & treatment notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7b776c] hover:bg-[#f0ece1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Context Banner */}
          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e9e2d5] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <User className="w-4 h-4 text-[#645e45]" />
              <div>
                <p className="text-xs font-black text-[#1e1b14]">
                  {visit.patient_name}
                </p>
                <p className="text-[10px] text-[#7b776c]">{visit.location || 'Home Residence'}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#645e45]/10 text-[#645e45]">
              Visit Date: {visit.scheduled_date}
            </span>
          </div>

          {/* HOME VISIT TEAM BANNER */}
          <div className="p-3.5 rounded-2xl bg-[#f5f1e8] border border-[#e0d9cc] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#645e45] uppercase tracking-wider">
              <span>Home Visit Clinical Team</span>
              <span className="text-[10px] bg-white text-[#645e45] px-2 py-0.5 rounded-md border border-[#e0d9cc]">
                Clinical Documentation
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center space-x-1.5 text-[#1e1b14]">
                <UserCheck className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Team: <strong>Shared Nurse Team</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#1e1b14]">
                <Stethoscope className="w-3.5 h-3.5 text-[#645e45]" />
                <span>Doctor: <strong>{visit.visiting_doctor || visit.visiting_doctor_name || 'Assigned Visiting Doctor'}</strong></span>
              </div>
            </div>
          </div>

          {/* Vital Signs Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-[#1e1b14] border-b border-[#f0ece1] pb-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>VITAL SIGNS</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#4a473d] mb-1">
                  BP (mmHg)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a473d] mb-1">
                  Pulse (bpm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a473d] mb-1">
                  Temp (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a473d] mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 98"
                  value={oxygenLevel}
                  onChange={(e) => setOxygenLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Symptoms Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-1.5">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-[#1e1b14]">
                <Activity className="w-4 h-4 text-amber-700" />
                <span>SYMPTOMS & SEVERITY</span>
              </div>
              <button
                type="button"
                onClick={handleAddSymptom}
                className="text-[11px] font-bold text-[#645e45] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Symptom</span>
              </button>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {symptoms.map((sym, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Pain, Dyspnea, Fatigue..."
                    value={sym.name}
                    onChange={(e) => handleSymptomChange(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
                  />
                  <select
                    value={sym.severity}
                    onChange={(e) => handleSymptomChange(idx, 'severity', e.target.value)}
                    className="w-28 px-2 py-1.5 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30 font-semibold bg-white"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                  {symptoms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSymptom(idx)}
                      className="p-1.5 text-[#7b776c] hover:text-red-700 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Notes & Next Recommendation */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-[#1e1b14] border-b border-[#f0ece1] pb-1.5">
              <FileText className="w-4 h-4 text-[#645e45]" />
              <span>TREATMENT NOTES & CLINICAL ASSESSMENT</span>
            </div>

            <div>
              <textarea
                placeholder="Document palliative care provided, dressing changes, comfort measures, patient response..."
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4a473d] mb-1">
                Next Visit Recommendation Date (Optional)
              </label>
              <input
                type="date"
                value={nextVisitRecommendation}
                onChange={(e) => setNextVisitRecommendation(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-[#645e45]/30"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-[#f0ece1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e9e2d5] text-xs font-bold text-[#4a473d] hover:bg-[#f3ede2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#645e45] text-white text-xs font-bold rounded-xl hover:bg-[#524d38] transition-all flex items-center space-x-1.5 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Mark Visit as Completed</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
