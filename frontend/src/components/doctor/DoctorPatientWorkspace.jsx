import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Clock,
  UserCheck,
  FileSpreadsheet,
  Pill,
  Utensils,
  Stethoscope,
  AlertTriangle,
  Activity,
  User,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  ExternalLink,
  ChevronRight,
  GitCompare,
  Trash2,
  Check,
  Download,
  Heart,
  Video,
  Info
} from 'lucide-react';

export default function DoctorPatientWorkspace({
  patientId,
  initialTab = 'profile',
  onBack,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profileData, setProfileData] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Modals state
  const [showAddDiagnosisModal, setShowAddDiagnosisModal] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState(new Date().toISOString().split('T')[0]);

  const [showAddAllergyModal, setShowAddAllergyModal] = useState(false);
  const [allergyName, setAllergyName] = useState('');
  const [allergySeverity, setAllergySeverity] = useState('Moderate');

  const [showAddConditionModal, setShowAddConditionModal] = useState(false);
  const [conditionName, setConditionName] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');

  const [showCreateRxModal, setShowCreateRxModal] = useState(false);
  const [rxItems, setRxItems] = useState([
    { medicine_name: '', dosage: '500mg', frequency: 'Once daily', duration_days: '7', change_type: 'New' }
  ]);

  const [showCompareRxModal, setShowCompareRxModal] = useState(false);
  const [compareVersions, setCompareVersions] = useState({ vA: null, vB: null });

  const [showCreateNutritionModal, setShowCreateNutritionModal] = useState(false);
  const [dietaryRecs, setDietaryRecs] = useState('');
  const [specialInst, setSpecialInst] = useState('');

  const [showReviewLabModal, setShowReviewLabModal] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const [showRejectAppModal, setShowRejectAppModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialTab when changed from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchAllPatientData = async () => {
    if (!patientId) return;
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      // 1. Fetch Full Clinical Profile
      const profRes = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/profile/`, { headers });
      if (profRes.ok) {
        const pData = await profRes.json();
        setProfileData(pData);
        setDiagnoses(pData.diagnoses || []);
        setAllergies(pData.allergies || []);
        setConditions(pData.chronic_conditions || []);
        setPrescriptions(pData.prescriptions || []);
        setNutritionPlans(pData.nutrition_plans || []);
        setLabReports(pData.lab_reports || []);
      }

      // 2. Fetch Timeline
      const timeRes = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${patientId}/timeline/`, { headers });
      if (timeRes.ok) {
        const tData = await timeRes.json();
        setTimelineEvents(Array.isArray(tData) ? tData : []);
      }

      // 3. Fetch Standalone Prescriptions
      const rxRes = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/prescriptions/?patient_id=${patientId}`, { headers });
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        setPrescriptions(Array.isArray(rxData) ? rxData : []);
      }

      // 4. Fetch Standalone Nutrition Plans
      const nutRes = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/nutrition/?patient_id=${patientId}`, { headers });
      if (nutRes.ok) {
        const nutData = await nutRes.json();
        setNutritionPlans(Array.isArray(nutData) ? nutData : []);
      }

      // 5. Fetch Standalone Lab Reports
      const labRes = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/lab-reports/?patient_id=${patientId}`, { headers });
      if (labRes.ok) {
        const labData = await labRes.json();
        setLabReports(Array.isArray(labData) ? labData : []);
      }
    } catch (err) {
      console.error('Error loading patient workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPatientData();
  }, [patientId]);

  // Temporary status banner auto-clear
  const showToast = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
  };

  // --- ACTIONS ---

  // Add Diagnosis
  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (!diagnosisText.trim()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/patients/${patientId}/diagnoses/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagnosis_text: diagnosisText.trim(),
          diagnosed_date: diagnosisDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Diagnosis added successfully.');
        setDiagnosisText('');
        setShowAddDiagnosisModal(false);
        fetchAllPatientData();
      } else {
        showToast(data.errors?.diagnosis_text?.[0] || data.detail || 'Failed to add diagnosis.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Allergy
  const handleAddAllergy = async (e) => {
    e.preventDefault();
    if (!allergyName.trim()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/patients/${patientId}/allergies/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allergy_name: allergyName.trim(),
          severity: allergySeverity,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Allergy recorded successfully.');
        setAllergyName('');
        setShowAddAllergyModal(false);
        fetchAllPatientData();
      } else {
        showToast(data.errors?.allergy_name?.[0] || 'Failed to record allergy.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Chronic Condition
  const handleAddCondition = async (e) => {
    e.preventDefault();
    if (!conditionName.trim()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/patients/${patientId}/chronic-conditions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condition_name: conditionName.trim(),
          notes: conditionNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Chronic condition recorded.');
        setConditionName('');
        setConditionNotes('');
        setShowAddConditionModal(false);
        fetchAllPatientData();
      } else {
        showToast(data.errors?.condition_name?.[0] || 'Failed to record condition.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Prescription Version
  const handleOpenCreateRx = () => {
    const activeRx = prescriptions.find((r) => r.status === 'Active');
    if (activeRx && activeRx.items && activeRx.items.length > 0) {
      // Pre-fill from active version with Continued change_type
      setRxItems(
        activeRx.items.map((it) => ({
          medicine_name: it.medicine_name,
          dosage: it.dosage || '',
          frequency: it.frequency || 'Twice daily',
          duration_days: it.duration_days || '14',
          change_type: 'Continued',
        }))
      );
    } else {
      setRxItems([
        { medicine_name: '', dosage: '500mg', frequency: 'Once daily', duration_days: '7', change_type: 'New' }
      ]);
    }
    setShowCreateRxModal(true);
  };

  const handleRxItemChange = (index, field, value) => {
    const updated = [...rxItems];
    updated[index][field] = value;
    setRxItems(updated);
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      { medicine_name: '', dosage: '', frequency: 'Twice daily', duration_days: '7', change_type: 'New' }
    ]);
  };

  const handleRemoveRxItem = (index) => {
    if (rxItems.length <= 1) return;
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    const validItems = rxItems.filter((it) => it.medicine_name.trim());
    if (validItems.length === 0) {
      showToast('Please specify at least one medication name.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/prescriptions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          items: validItems,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Prescription version created.');
        setShowCreateRxModal(false);
        fetchAllPatientData();
      } else {
        showToast(data.errors?.items?.[0] || data.detail || 'Failed to create prescription.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Nutrition Plan Version
  const handleOpenCreateNutrition = () => {
    const activePlan = nutritionPlans.find((n) => n.status === 'Active');
    if (activePlan) {
      setDietaryRecs(activePlan.dietary_recommendations || '');
      setSpecialInst(activePlan.special_instructions || '');
    } else {
      setDietaryRecs('');
      setSpecialInst('');
    }
    setShowCreateNutritionModal(true);
  };

  const handleSubmitNutrition = async (e) => {
    e.preventDefault();
    if (!dietaryRecs.trim() && !specialInst.trim()) {
      showToast('Please provide dietary recommendations or special instructions.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/medical-records/doctor/nutrition/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          dietary_recommendations: dietaryRecs.trim(),
          special_instructions: specialInst.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Nutrition plan updated.');
        setShowCreateNutritionModal(false);
        fetchAllPatientData();
      } else {
        showToast(data.errors?.dietary_recommendations?.[0] || 'Failed to create nutrition plan.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review Lab Report
  const handleOpenReviewLab = (report) => {
    setSelectedLabReport(report);
    setReviewRemarks(report.remarks || '');
    setShowReviewLabModal(true);
  };

  const handleSubmitLabReview = async (e) => {
    e.preventDefault();
    if (!selectedLabReport) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/medical-records/doctor/lab-reports/${selectedLabReport.report_id}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remarks: reviewRemarks.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Lab report marked as Reviewed.');
        setShowReviewLabModal(false);
        setSelectedLabReport(null);
        fetchAllPatientData();
      } else {
        showToast(data.detail || 'Failed to submit review.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registration Review Approval / Rejection
  const handleApproveApplication = async (appId) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${appId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Registration approved.');
        fetchAllPatientData();
      } else {
        showToast(data.errors?.detail?.[0] || data.detail || 'Failed to approve application.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectApplication = async (e) => {
    e.preventDefault();
    const appObj = profileData?.application;
    if (!appObj || !rejectionReason.trim()) {
      showToast('A non-empty rejection reason is required.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/doctor/patients/${appObj.id}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Registration application rejected.');
        setShowRejectAppModal(false);
        setRejectionReason('');
        fetchAllPatientData();
      } else {
        showToast(data.errors?.rejection_reason?.[0] || 'Failed to reject application.', 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patient = profileData?.patient_info || {};
  const application = profileData?.application || null;

  // Tabs definition
  const tabs = [
    { id: 'profile', label: 'Medical Profile', icon: FileText },
    { id: 'timeline', label: 'Patient Timeline', icon: Clock },
    { id: 'registration', label: 'Registration Review', icon: UserCheck, badge: application?.registration_status },
    { id: 'lab_reports', label: 'Lab Reports', icon: FileSpreadsheet, count: labReports.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill, count: prescriptions.length },
    { id: 'nutrition', label: 'Nutrition Plans', icon: Utensils, count: nutritionPlans.length },
    { id: 'diagnoses', label: 'Diagnoses', icon: Stethoscope, count: diagnoses.length },
    { id: 'allergies', label: 'Allergies', icon: AlertTriangle, count: allergies.length },
    { id: 'conditions', label: 'Chronic Conditions', icon: Activity, count: conditions.length },
  ];

  if (isLoading && !profileData) {
    return (
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-12 text-center text-xs text-[#7b776c] shadow-2xs space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#645e45]" />
        <p className="font-bold text-sm text-[#1e1b14]">Loading Patient Clinical Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* STATUS TOAST BANNER */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-2xs ${
            statusMessage.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage({ text: '', type: '' })}
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. PERSISTENT PATIENT HEADER */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#645e45] hover:text-[#1e1b14] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patients List</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllPatientData}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer"
              title="Refresh Workspace"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Identity & Demographics Grid */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#645e45] text-white flex items-center justify-center font-black text-xl shadow-xs flex-shrink-0">
              {patient.name ? patient.name.charAt(0).toUpperCase() : 'P'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-black text-[#1e1b14] tracking-tight">
                  {patient.name || 'Patient Record'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    patient.registration_status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : patient.registration_status === 'Rejected'
                      ? 'bg-red-50 text-red-900 border-red-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {patient.registration_status || 'Pending'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7b776c] font-medium">
                <span>{patient.gender || 'Gender N/A'} • {patient.dob || 'DOB N/A'}</span>
                {patient.phone && (
                  <span className="inline-flex items-center gap-1 text-[#4a473d]">
                    <Phone className="w-3 h-3 text-[#7b776c]" />
                    {patient.phone}
                  </span>
                )}
                {patient.place && (
                  <span className="inline-flex items-center gap-1 text-[#4a473d]">
                    <MapPin className="w-3 h-3 text-[#7b776c]" />
                    {patient.place}{patient.panchayath ? `, ${patient.panchayath}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Emergency & Discharge Summary Tags */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-1.5 text-xs text-[#7b776c]">
            {patient.emergency_contact_name && (
              <p className="text-[11px] font-bold text-[#4a473d]">
                Emergency: <span className="text-[#1e1b14]">{patient.emergency_contact_name}</span> ({patient.emergency_contact_phone || 'No phone'})
              </p>
            )}
            {patient.discharge_summary_path && (
              <a
                href={`http://127.0.0.1:8000/api/auth/documents/view/?type=discharge_summary&id=${patient.patient_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#645e45] hover:underline"
              >
                <FileText className="w-3 h-3" />
                <span>View Discharge Summary</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="pt-2 border-t border-[#f2ece1] overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#645e45] text-white shadow-2xs'
                      : 'text-[#4a473d] hover:bg-[#f4ede0] hover:text-[#1e1b14]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#7b776c]'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#f4ede0] text-[#645e45]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                        isActive
                          ? 'bg-white text-[#645e45]'
                          : tab.badge === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. TAB WORKSPACE CONTENTS */}

      {/* TAB 1: MEDICAL PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Diagnoses</p>
              <p className="text-2xl font-black text-[#1e1b14] mt-1">{diagnoses.length}</p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">Recorded conditions</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Active Prescription</p>
              <p className="text-2xl font-black text-[#645e45] mt-1">
                {prescriptions.find((r) => r.status === 'Active') ? `v${prescriptions.find((r) => r.status === 'Active').version_number}` : 'None'}
              </p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">{prescriptions.length} total versions</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Active Nutrition</p>
              <p className="text-2xl font-black text-[#645e45] mt-1">
                {nutritionPlans.find((n) => n.status === 'Active') ? `v${nutritionPlans.find((n) => n.status === 'Active').version_number}` : 'None'}
              </p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">{nutritionPlans.length} total versions</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#e9e2d5] shadow-2xs">
              <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Lab Reports</p>
              <p className="text-2xl font-black text-[#1e1b14] mt-1">{labReports.length}</p>
              <p className="text-[11px] text-[#7b776c] mt-0.5">
                {labReports.filter((l) => l.review_status === 'Pending').length} pending review
              </p>
            </div>
          </div>

          {/* 2-Column: Personal Details & Clinical Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Demographics */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#f2ece1] pb-3">
                <User className="w-4 h-4 text-[#645e45]" />
                <h3 className="font-black text-sm text-[#1e1b14]">Personal & Location Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#7b776c] font-bold">Full Name</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">{patient.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Care Program</p>
                  <p className="font-extrabold text-[#645e45] mt-0.5">Palliative Home Care</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Date of Birth / Age</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">{patient.dob || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Gender</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">{patient.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Phone Number</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">{patient.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">House Name</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">{patient.house_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Place / Panchayath</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">
                    {patient.place || 'N/A'}{patient.panchayath ? `, ${patient.panchayath}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Ward / Pincode</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">
                    Ward {patient.ward_no || 1} • {patient.pincode || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2 border-t border-[#f2ece1] pt-2 mt-1">
                  <p className="text-[#7b776c] font-bold">Emergency Contact</p>
                  <p className="font-extrabold text-[#1e1b14] mt-0.5">
                    {patient.emergency_contact_name || 'None listed'} ({patient.emergency_contact_phone || 'No phone'})
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical Overview Badges */}
            <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#645e45]" />
                  <h3 className="font-black text-sm text-[#1e1b14]">Clinical Summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDiagnosisModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Diagnosis</span>
                </button>
              </div>

              {/* Diagnoses List */}
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Diagnoses</p>
                {diagnoses.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No active diagnoses recorded.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {diagnoses.map((d) => (
                      <span key={d.id} className="px-2.5 py-1 rounded-lg bg-[#f5f1ea] text-[#1e1b14] text-xs font-bold border border-[#e9e2d5]">
                        🩺 {d.text} <span className="text-[10px] text-[#7b776c]">({d.date})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Allergies */}
              <div className="space-y-2 pt-2 border-t border-[#f2ece1]">
                <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Allergies</p>
                {allergies.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No allergies documented.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a) => (
                      <span key={a.id} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200 text-xs font-bold">
                        ⚠️ {a.name} ({a.severity})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chronic Conditions */}
              <div className="space-y-2 pt-2 border-t border-[#f2ece1]">
                <p className="text-[11px] font-extrabold text-[#7b776c] uppercase">Chronic Conditions</p>
                {conditions.length === 0 ? (
                  <p className="text-xs text-[#7b776c] italic">No chronic conditions listed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {conditions.map((c) => (
                      <span key={c.id} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                        🏥 {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Vitals Trend Table (from Nurse visits) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#f2ece1] pb-3">
              <Activity className="w-4 h-4 text-[#645e45]" />
              <h3 className="font-black text-sm text-[#1e1b14]">Recent Home Visit Vitals & Assessments</h3>
            </div>

            {profileData?.recent_vitals && profileData.recent_vitals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">BP</th>
                      <th className="py-2.5 px-3">Pulse</th>
                      <th className="py-2.5 px-3">Temp (°F)</th>
                      <th className="py-2.5 px-3">SpO2 (%)</th>
                      <th className="py-2.5 px-3">Attending Nurse</th>
                      <th className="py-2.5 px-3">Clinical Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                    {profileData.recent_vitals.map((v, i) => (
                      <tr key={i} className="hover:bg-[#fdfbf7]">
                        <td className="py-2.5 px-3 font-bold">{v.date}</td>
                        <td className="py-2.5 px-3 font-semibold">{v.blood_pressure || 'N/A'}</td>
                        <td className="py-2.5 px-3 font-semibold">{v.pulse ? `${v.pulse} bpm` : 'N/A'}</td>
                        <td className="py-2.5 px-3 font-semibold">{v.temperature || 'N/A'}</td>
                        <td className="py-2.5 px-3 font-semibold">{v.oxygen_level ? `${v.oxygen_level}%` : 'N/A'}</td>
                        <td className="py-2.5 px-3 text-[#4a473d]">{v.nurse}</td>
                        <td className="py-2.5 px-3 text-[#7b776c] max-w-xs truncate">{v.treatment_notes || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#7b776c]">
                <Activity className="w-6 h-6 mx-auto text-[#645e45] mb-1" />
                <p className="font-bold">No home visit vitals recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Patient Clinical Timeline</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Chronological record of registrations, approvals, prescriptions, nutrition plans, diagnostics, and visits.</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#f4ede0] text-[#645e45] font-black text-xs">
              {timelineEvents.length} Events
            </span>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c]">
              <Clock className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No timeline events recorded.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e9e2d5]">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#645e45] border-2 border-white shadow-2xs" />
                  <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#e9e2d5] space-y-1.5 group-hover:border-[#645e45] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-extrabold text-[10px] uppercase">
                          {evt.category}
                        </span>
                        <h4 className="font-black text-xs text-[#1e1b14]">{evt.event}</h4>
                      </div>
                      <span className="text-[11px] text-[#7b776c] font-bold">{evt.date}</span>
                    </div>
                    <p className="text-xs text-[#4a473d]">{evt.description}</p>
                    {evt.status && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-white text-[#7b776c] border border-[#e9e2d5] text-[10px] font-bold">
                        Status: {evt.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTRATION REVIEW */}
      {activeTab === 'registration' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Patient Registration & Discharge Review</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Inspect submitted registration application details and clinical discharge summary before granting palliative care enrollment.</p>
            </div>
            {application && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  application.registration_status === 'Approved'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : application.registration_status === 'Rejected'
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                {application.registration_status}
              </span>
            )}
          </div>

          {application ? (
            <div className="space-y-6">
              {/* Application Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fdfbf7] p-5 rounded-xl border border-[#e9e2d5] text-xs">
                <div>
                  <p className="text-[#7b776c] font-bold">Application ID</p>
                  <p className="font-black text-[#1e1b14] mt-0.5">{application.application_id}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Submitted Date</p>
                  <p className="font-bold text-[#1e1b14] mt-0.5">{application.created_at}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Applicant Email</p>
                  <p className="font-bold text-[#1e1b14] mt-0.5">{application.email}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Phone Number</p>
                  <p className="font-bold text-[#1e1b14] mt-0.5">{application.phone}</p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Address / Location</p>
                  <p className="font-bold text-[#1e1b14] mt-0.5">
                    {application.house_name}, {application.place}, {application.panchayath}
                  </p>
                </div>
                <div>
                  <p className="text-[#7b776c] font-bold">Emergency Contact</p>
                  <p className="font-bold text-[#1e1b14] mt-0.5">
                    {application.emergency_contact_name || 'N/A'} ({application.emergency_contact_phone || 'N/A'})
                  </p>
                </div>
              </div>

              {/* Uploaded Discharge Summary Viewer Box */}
              <div className="p-5 rounded-xl border border-[#e9e2d5] bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#645e45]" />
                    <div>
                      <h4 className="font-bold text-xs text-[#1e1b14]">Hospital Discharge Summary Document</h4>
                      <p className="text-[11px] text-[#7b776c]">Mandatory clinical document uploaded by patient or primary caregiver.</p>
                    </div>
                  </div>
                  {application.discharge_summary_path ? (
                    <a
                      href={`http://127.0.0.1:8000/api/auth/documents/view/?type=patient_discharge_summary&id=${application.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Inspect Discharge Summary</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                      No Discharge Summary Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Rejection / Review Status Display */}
              {application.registration_status === 'Rejected' && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    Rejection Reason
                  </p>
                  <p className="font-medium">{application.rejection_reason || 'Application criteria not met.'}</p>
                </div>
              )}

              {application.registration_status === 'Approved' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="font-bold">
                    Registration approved by {application.reviewed_by_doctor || 'Doctor'} on {application.reviewed_at || 'Verified'}.
                  </p>
                </div>
              )}

              {/* Doctor Review Actions (Only when Pending) */}
              {application.registration_status === 'Pending' && (
                <div className="flex items-center gap-3 pt-4 border-t border-[#f2ece1]">
                  <button
                    type="button"
                    onClick={() => handleApproveApplication(application.id)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-extrabold hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Registration</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectAppModal(true)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-red-700 text-white text-xs font-extrabold hover:bg-red-800 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Registration</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
              <UserCheck className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No application record on file.</p>
              <p>This patient account was directly created by administrative onboarding.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LAB REPORTS */}
      {activeTab === 'lab_reports' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Laboratory & Diagnostic Reports</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Review laboratory investigations and diagnostic reports uploaded by this patient.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-[#edf3ec] text-[#426442] font-black text-xs border border-[#d2e2d0]">
                {labReports.length} Reports
              </span>
              {labReports.filter((l) => l.review_status === 'Pending').length > 0 && (
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 font-extrabold text-xs border border-amber-300">
                  {labReports.filter((l) => l.review_status === 'Pending').length} Pending Review
                </span>
              )}
            </div>
          </div>

          {labReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c] space-y-1">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No laboratory reports have been uploaded by this patient.</p>
              <p>Uploaded diagnostic records from the patient will appear here for your clinical evaluation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                    <th className="py-3.5 px-3">Report Date</th>
                    <th className="py-3.5 px-3">Investigation / Test</th>
                    <th className="py-3.5 px-3">Uploaded On</th>
                    <th className="py-3.5 px-3">Review Status</th>
                    <th className="py-3.5 px-3">Doctor Clinical Remarks</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                  {labReports.map((lr) => (
                    <tr key={lr.report_id} className="hover:bg-[#fdfbf7] transition-colors">
                      <td className="py-3.5 px-3 font-black text-[#1e1b14]">{lr.report_date}</td>
                      <td className="py-3.5 px-3 font-extrabold text-[#1e1b14] max-w-xs truncate">
                        {lr.investigation_name || lr.file_path}
                      </td>
                      <td className="py-3.5 px-3 text-[#7b776c]">{lr.uploaded_at}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            lr.review_status === 'Reviewed'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {lr.review_status === 'Reviewed' ? 'Reviewed' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-[#4a473d] max-w-xs">
                        {lr.remarks ? (
                          <p className="italic text-[#1e1b14] truncate">"{lr.remarks}"</p>
                        ) : lr.review_status === 'Reviewed' ? (
                          <span className="text-[#426442] font-semibold text-[11px]">Reviewed & verified</span>
                        ) : (
                          <span className="text-[#7b776c] italic text-[11px]">Awaiting review</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`http://127.0.0.1:8000/api/auth/documents/view/?type=lab_report&id=${lr.report_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] text-[11px] font-bold hover:bg-[#f4ede0] inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Document</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleOpenReviewLab(lr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                              lr.review_status === 'Reviewed'
                                ? 'bg-[#f4ede0] text-[#645e45] hover:bg-[#645e45] hover:text-white'
                                : 'bg-[#645e45] text-white hover:bg-[#4d4835]'
                            }`}
                          >
                            {lr.review_status === 'Reviewed' ? 'View Review' : 'Review Report'}
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
      )}

      {/* TAB 5: PRESCRIPTIONS (VERSIONING & COMPARISON) */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Prescription Version Management</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Historical clinical prescriptions. Every modification creates a new permanent version without overwriting prior records.</p>
            </div>
            <div className="flex items-center gap-2">
              {prescriptions.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setCompareVersions({
                      vA: prescriptions[0],
                      vB: prescriptions[1],
                    });
                    setShowCompareRxModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#fdfbf7] text-[#645e45] border border-[#e9e2d5] text-xs font-bold hover:bg-[#f4ede0] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Versions</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateRx}
                className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Version</span>
              </button>
            </div>
          </div>

          {/* Prescriptions List (Latest / Active on Top) */}
          {prescriptions.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center text-xs text-[#7b776c] shadow-2xs space-y-1">
              <Pill className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No prescriptions on file.</p>
              <p>Click "Create New Version" to issue the first prescription.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => {
                const isActive = rx.status === 'Active';
                return (
                  <div
                    key={rx.prescription_id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs space-y-4 ${
                      isActive ? 'border-[#645e45] ring-1 ring-[#645e45]' : 'border-[#e9e2d5] opacity-90'
                    }`}
                  >
                    {/* Version Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2ece1] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-lg bg-[#f4ede0] text-[#645e45] font-black text-sm">
                          Version {rx.version_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#7b776c]">
                        <span>Issued by: <strong className="text-[#1e1b14]">{rx.doctor_name || 'Doctor'}</strong></span>
                        <span>•</span>
                        <span>{rx.created_at}</span>
                      </div>
                    </div>

                    {/* Prescription Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#fdfbf7] border-b border-[#e9e2d5] text-[11px] font-extrabold text-[#7b776c] uppercase">
                            <th className="py-2.5 px-3">Medicine Name</th>
                            <th className="py-2.5 px-3">Dosage</th>
                            <th className="py-2.5 px-3">Frequency</th>
                            <th className="py-2.5 px-3">Duration</th>
                            <th className="py-2.5 px-3 text-right">Change Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                          {rx.items && rx.items.length > 0 ? (
                            rx.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-[#fdfbf7]">
                                <td className="py-2.5 px-3 font-bold">{it.medicine_name}</td>
                                <td className="py-2.5 px-3 font-semibold">{it.dosage || 'N/A'}</td>
                                <td className="py-2.5 px-3 text-[#4a473d]">{it.frequency || 'N/A'}</td>
                                <td className="py-2.5 px-3 text-[#4a473d]">
                                  {it.duration_days ? `${it.duration_days} days` : 'Ongoing'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                      it.change_type === 'New'
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                        : it.change_type === 'DosageChanged'
                                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                        : it.change_type === 'Discontinued'
                                        ? 'bg-red-50 text-red-900 border border-red-200'
                                        : 'bg-zinc-100 text-zinc-700'
                                    }`}
                                  >
                                    {it.change_type || 'New'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-xs text-[#7b776c] italic">
                                No medication line items found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: NUTRITION PLANS (VERSIONING) */}
      {activeTab === 'nutrition' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Palliative Nutrition & Meal Plans</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Versioned dietary regimens, feeding guidelines, and special restrictions.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateNutrition}
              className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Plan Version</span>
            </button>
          </div>

          {nutritionPlans.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center text-xs text-[#7b776c] shadow-2xs space-y-1">
              <Utensils className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No nutrition plans on record.</p>
              <p>Click "Create New Plan Version" to specify dietary instructions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nutritionPlans.map((np) => {
                const isActive = np.status === 'Active';
                return (
                  <div
                    key={np.plan_id}
                    className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 ${
                      isActive ? 'border-[#645e45] ring-1 ring-[#645e45]' : 'border-[#e9e2d5] opacity-90'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2ece1] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-lg bg-[#f4ede0] text-[#645e45] font-black text-sm">
                          Nutrition Plan v{np.version_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}
                        >
                          {np.status}
                        </span>
                      </div>

                      <div className="text-xs text-[#7b776c]">
                        Created by <strong>{np.doctor_name || 'Doctor'}</strong> on {np.created_at}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] space-y-1.5">
                        <p className="font-extrabold text-[#645e45] uppercase text-[10px]">Dietary Recommendations</p>
                        <p className="text-[#1e1b14] whitespace-pre-line leading-relaxed">
                          {np.dietary_recommendations || 'Standard palliative soft diet.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] space-y-1.5">
                        <p className="font-extrabold text-[#645e45] uppercase text-[10px]">Special Instructions & Restrictions</p>
                        <p className="text-[#1e1b14] whitespace-pre-line leading-relaxed">
                          {np.special_instructions || 'None noted.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DIAGNOSES */}
      {activeTab === 'diagnoses' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Patient Diagnoses</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Documented clinical diagnoses and staging for this patient.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDiagnosisModal(true)}
              className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Diagnosis</span>
            </button>
          </div>

          {diagnoses.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c]">
              <Stethoscope className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No diagnoses recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f2ece1]">
              {diagnoses.map((d) => (
                <div key={d.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-xs text-[#1e1b14]">{d.text}</p>
                    <p className="text-[11px] text-[#7b776c]">Diagnosed on {d.date} by {d.doctor}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#f4ede0] text-[#645e45] font-extrabold text-[10px]">
                    Recorded
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: ALLERGIES */}
      {activeTab === 'allergies' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Documented Allergies</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Drug, food, or environmental allergies requiring clinical precaution.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAllergyModal(true)}
              className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Allergy</span>
            </button>
          </div>

          {allergies.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c]">
              <AlertTriangle className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No allergies documented.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {allergies.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs text-red-900">{a.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-red-700">Updated on {a.updated_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: CHRONIC CONDITIONS */}
      {activeTab === 'conditions' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f2ece1] pb-4">
            <div>
              <h3 className="font-black text-sm text-[#1e1b14]">Underlying Chronic Conditions</h3>
              <p className="text-xs text-[#7b776c] mt-0.5">Comorbidities and chronic diseases tracked for palliative management.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddConditionModal(true)}
              className="px-4 py-2 rounded-xl bg-[#645e45] text-white text-xs font-bold hover:bg-[#4d4835] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Condition</span>
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7b776c]">
              <Activity className="w-8 h-8 mx-auto text-[#645e45] mb-2" />
              <p className="font-bold text-sm text-[#1e1b14]">No chronic conditions documented.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conditions.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-[#e9e2d5] bg-[#fdfbf7] space-y-1">
                  <h4 className="font-black text-xs text-[#1e1b14]">{c.name}</h4>
                  <p className="text-xs text-[#4a473d]">{c.notes || 'No specific notes'}</p>
                  <p className="text-[10px] text-[#7b776c] pt-1">Updated on {c.updated_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. ADD DIAGNOSIS MODAL */}
      {showAddDiagnosisModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">Record Clinical Diagnosis</h3>
              <button
                type="button"
                onClick={() => setShowAddDiagnosisModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDiagnosis} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Diagnosis Assessment *</label>
                <textarea
                  required
                  rows={3}
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="e.g. Stage IV Non-Small Cell Lung Carcinoma..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Diagnosed Date</label>
                <input
                  type="date"
                  value={diagnosisDate}
                  onChange={(e) => setDiagnosisDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowAddDiagnosisModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD ALLERGY MODAL */}
      {showAddAllergyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">Add Patient Allergy</h3>
              <button
                type="button"
                onClick={() => setShowAddAllergyModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAllergy} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Allergen Name *</label>
                <input
                  type="text"
                  required
                  value={allergyName}
                  onChange={(e) => setAllergyName(e.target.value)}
                  placeholder="e.g. Penicillin, Latex, Peanuts..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Severity Level</label>
                <select
                  value={allergySeverity}
                  onChange={(e) => setAllergySeverity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                >
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowAddAllergyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
                >
                  {isSubmitting ? 'Saving...' : 'Add Allergy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD CHRONIC CONDITION MODAL */}
      {showAddConditionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">Add Chronic Condition</h3>
              <button
                type="button"
                onClick={() => setShowAddConditionModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCondition} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Condition Name *</label>
                <input
                  type="text"
                  required
                  value={conditionName}
                  onChange={(e) => setConditionName(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes Mellitus, COPD..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Clinical Notes</label>
                <textarea
                  rows={3}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Notes on control, regimen, or staging..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowAddConditionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Condition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CREATE PRESCRIPTION VERSION MODAL */}
      {showCreateRxModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <div>
                <h3 className="font-black text-sm text-[#1e1b14]">Create New Prescription Version</h3>
                <p className="text-xs text-[#7b776c]">Atomic versioning will mark prior prescription as Superseded and create the next active version.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRxModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrescription} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#e9e2d5] bg-[#fdfbf7] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#645e45]">Item #{idx + 1}</span>
                      {rxItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRxItem(idx)}
                          className="text-red-600 hover:text-red-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="md:col-span-2 space-y-1">
                        <label className="font-bold text-[#1e1b14]">Medicine Name *</label>
                        <input
                          type="text"
                          required
                          value={item.medicine_name}
                          onChange={(e) => handleRxItemChange(idx, 'medicine_name', e.target.value)}
                          placeholder="e.g. Morphine, Paracetamol"
                          className="w-full p-2 rounded-lg border border-[#e9e2d5] bg-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#1e1b14]">Dosage</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => handleRxItemChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 10mg"
                          className="w-full p-2 rounded-lg border border-[#e9e2d5] bg-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#1e1b14]">Frequency</label>
                        <input
                          type="text"
                          value={item.frequency}
                          onChange={(e) => handleRxItemChange(idx, 'frequency', e.target.value)}
                          placeholder="e.g. TID, SOS"
                          className="w-full p-2 rounded-lg border border-[#e9e2d5] bg-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#1e1b14]">Change Type</label>
                        <select
                          value={item.change_type}
                          onChange={(e) => handleRxItemChange(idx, 'change_type', e.target.value)}
                          className="w-full p-2 rounded-lg border border-[#e9e2d5] bg-white text-xs"
                        >
                          <option value="New">New</option>
                          <option value="Continued">Continued</option>
                          <option value="DosageChanged">DosageChanged</option>
                          <option value="Discontinued">Discontinued</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddRxItem}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#e9e2d5] text-[#645e45] font-bold text-xs hover:bg-[#f4ede0] transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication Item</span>
              </button>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowCreateRxModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
                >
                  {isSubmitting ? 'Issuing Version...' : 'Issue Prescription Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. COMPARE PRESCRIPTIONS MODAL */}
      {showCompareRxModal && compareVersions.vA && compareVersions.vB && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <div>
                <h3 className="font-black text-sm text-[#1e1b14]">Side-by-Side Prescription Comparison</h3>
                <p className="text-xs text-[#7b776c]">Comparing Version {compareVersions.vA.version_number} vs Version {compareVersions.vB.version_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareRxModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Version A */}
              <div className="p-4 rounded-xl border border-[#e9e2d5] bg-[#fdfbf7] space-y-3">
                <div className="flex items-center justify-between border-b border-[#e9e2d5] pb-2">
                  <span className="font-black text-sm text-[#645e45]">Version {compareVersions.vA.version_number} ({compareVersions.vA.status})</span>
                  <span className="text-[11px] text-[#7b776c]">{compareVersions.vA.created_at}</span>
                </div>
                <div className="space-y-2">
                  {compareVersions.vA.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#e9e2d5] space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#1e1b14]">{it.medicine_name}</strong>
                        <span className="text-[10px] font-bold text-[#645e45]">{it.change_type}</span>
                      </div>
                      <p className="text-[#7b776c]">{it.dosage} • {it.frequency} • {it.duration_days ? `${it.duration_days}d` : 'Ongoing'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Version B */}
              <div className="p-4 rounded-xl border border-[#e9e2d5] bg-[#fdfbf7] space-y-3">
                <div className="flex items-center justify-between border-b border-[#e9e2d5] pb-2">
                  <span className="font-black text-sm text-[#645e45]">Version {compareVersions.vB.version_number} ({compareVersions.vB.status})</span>
                  <span className="text-[11px] text-[#7b776c]">{compareVersions.vB.created_at}</span>
                </div>
                <div className="space-y-2">
                  {compareVersions.vB.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#e9e2d5] space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#1e1b14]">{it.medicine_name}</strong>
                        <span className="text-[10px] font-bold text-[#645e45]">{it.change_type}</span>
                      </div>
                      <p className="text-[#7b776c]">{it.dosage} • {it.frequency} • {it.duration_days ? `${it.duration_days}d` : 'Ongoing'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#f2ece1]">
              <button
                type="button"
                onClick={() => setShowCompareRxModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CREATE NUTRITION PLAN MODAL */}
      {showCreateNutritionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <h3 className="font-black text-sm text-[#1e1b14]">Create New Nutrition Plan Version</h3>
              <button
                type="button"
                onClick={() => setShowCreateNutritionModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitNutrition} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Dietary Recommendations *</label>
                <textarea
                  required
                  rows={4}
                  value={dietaryRecs}
                  onChange={(e) => setDietaryRecs(e.target.value)}
                  placeholder="e.g. Soft pureed high calorie diet, small frequent meals..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Special Instructions / Restrictions</label>
                <textarea
                  rows={3}
                  value={specialInst}
                  onChange={(e) => setSpecialInst(e.target.value)}
                  placeholder="e.g. Fluid restriction 1.5L/day, low sodium..."
                  className="w-full p-2.5 rounded-xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowCreateNutritionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#645e45] text-white hover:bg-[#4d4835]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Plan Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. REVIEW LAB REPORT MODAL */}
      {showReviewLabModal && selectedLabReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#e9e2d5] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2ece1] pb-3">
              <div>
                <h3 className="font-black text-sm text-[#1e1b14]">Review Diagnostic Laboratory Report</h3>
                <p className="text-xs text-[#7b776c]">
                  Patient: <strong className="text-[#1e1b14]">{patient.name || 'Patient'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewLabModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#e9e2d5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#7b776c] uppercase">Investigation / Test</p>
                  <p className="font-black text-[#1e1b14] text-sm mt-0.5">
                    {selectedLabReport.investigation_name || 'Diagnostic Laboratory Report'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#7b776c] uppercase">Report Date</p>
                  <p className="font-extrabold text-[#645e45] mt-0.5">{selectedLabReport.report_date}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f0eae0] flex justify-between items-center">
                <span className="text-[11px] text-[#7b776c]">Uploaded On: {selectedLabReport.uploaded_at}</span>
                <a
                  href={`http://127.0.0.1:8000/api/auth/documents/view/?type=lab_report&id=${selectedLabReport.report_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#645e45] text-white font-extrabold text-xs hover:bg-[#4d4835] transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Original Document</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmitLabReview} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Doctor Clinical Remarks (Optional)</label>
                <textarea
                  rows={4}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Enter diagnostic evaluation, significant findings, recommendations, or leave blank if standard..."
                  className="w-full p-3 rounded-2xl border border-[#e9e2d5] text-xs focus:ring-2 focus:ring-[#645e45] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowReviewLabModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#645e45] text-white hover:bg-[#4d4835] shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Saving Review...' : 'Mark as Reviewed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. REJECT REGISTRATION MODAL */}
      {showRejectAppModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-red-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-red-100 pb-3">
              <h3 className="font-black text-sm text-red-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Reject Registration Application
              </h3>
              <button
                type="button"
                onClick={() => setShowRejectAppModal(false)}
                className="p-1 rounded-md text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRejectApplication} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#1e1b14]">Mandatory Rejection Reason *</label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the patient does not qualify or what additional clinical documents are needed..."
                  className="w-full p-2.5 rounded-xl border border-red-300 text-xs focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f2ece1]">
                <button
                  type="button"
                  onClick={() => setShowRejectAppModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700 text-white hover:bg-red-800"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
