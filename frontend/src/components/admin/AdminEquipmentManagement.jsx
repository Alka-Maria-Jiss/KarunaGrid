import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  PackageCheck,
  Wrench,
  XCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
  ClipboardList,
  AlertCircle,
  Check,
  Edit3,
  Eye,
  Calendar,
  User,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminEquipmentManagement({
  equipment = {},
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [updatingUnit, setUpdatingUnit] = useState(null);
  const [newUnitStatus, setNewUnitStatus] = useState('Available');

  // Allocation modal state (State 2: Approved + Requested)
  const [allocatingRequest, setAllocatingRequest] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Edit / Reallocation / Delivery Status modal state (State 3 & 4: Approved + Allocated / Delivered)
  const [editingRequest, setEditingRequest] = useState(null);
  const [reassignUnitId, setReassignUnitId] = useState('');
  const [editDeliveryStatus, setEditDeliveryStatus] = useState('Allocated');

  // Read-only View Modal state (State 5: Approved + Returned)
  const [viewingRequest, setViewingRequest] = useState(null);

  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [selectedTypeIdForUnit, setSelectedTypeIdForUnit] = useState('');
  const [unitSerial, setUnitSerial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const types = equipment.types || [];
  const units = equipment.units || [];
  const requests = equipment.requests || [];

  // Create Equipment Type
  const handleCreateType = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/equipment/types/', {
        name: newTypeName.trim(),
        description: newTypeDescription.trim(),
      });
      showSuccess('Equipment type created successfully!');
      setNewTypeName('');
      setNewTypeDescription('');
      setShowAddTypeModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to create equipment type.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register Physical Unit
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!selectedTypeIdForUnit) {
      showError('Please choose an equipment category.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/equipment/units/', {
        equipment_type_id: selectedTypeIdForUnit,
        serial_number: unitSerial.trim(),
      });
      showSuccess('Equipment physical unit registered successfully!');
      setUnitSerial('');
      setSelectedTypeIdForUnit('');
      setShowAddUnitModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to register equipment unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Physical Unit Operational Status
  const handleUpdateUnitStatus = async (e) => {
    e.preventDefault();
    if (!updatingUnit) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/admin/equipment/units/${updatingUnit.unit_id}/status/`, {
        status: newUnitStatus,
      });
      showSuccess('Equipment status updated successfully.');
      setUpdatingUnit(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update equipment status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial Allocation of Physical Unit to Approved Request (State 2)
  const handleAllocateEquipment = async (e) => {
    e.preventDefault();
    if (!allocatingRequest) return;
    if (!selectedUnitId) {
      showError('Please select a physical equipment unit to allocate.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/admin/equipment/requests/${allocatingRequest.request_id}/allocate/`, {
        unit_id: parseInt(selectedUnitId, 10),
      });
      showSuccess(res.message || 'Equipment unit allocated successfully!');
      setAllocatingRequest(null);
      setSelectedUnitId('');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.status === 409) {
        showError('This equipment unit is no longer available. Please refresh and select another unit.');
      } else {
        showError(err.message || 'Failed to allocate equipment unit.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Existing Allocation / Reassign Unit / Update Delivery Status (States 3 & 4)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;
    setIsSubmitting(true);
    try {
      const payload = {
        delivery_status: editDeliveryStatus,
      };
      if (reassignUnitId) {
        payload.unit_id = parseInt(reassignUnitId, 10);
      }
      const res = await apiClient.patch(`/admin/equipment/requests/${editingRequest.request_id}/allocate/`, payload);
      showSuccess(res.message || 'Equipment allocation updated successfully!');
      setEditingRequest(null);
      setReassignUnitId('');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.status === 409) {
        showError('This equipment unit is no longer available. Please refresh and select another unit.');
      } else {
        showError(err.message || 'Failed to update equipment allocation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered physical units for inventory table
  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.equipment_type_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || u.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Available matching units for current allocation modal
  const matchingAvailableUnits = allocatingRequest
    ? units.filter(
        (u) =>
          u.equipment_type_id === allocatingRequest.equipment_type_id &&
          u.status === 'Available'
      )
    : [];

  // Available matching units for editing / reassigning modal
  const editMatchingAvailableUnits = editingRequest
    ? units.filter(
        (u) =>
          u.equipment_type_id === editingRequest.equipment_type_id &&
          u.status === 'Available'
      )
    : [];

  // Actions column rendering according to KarunaGrid Business Rules
  const renderActionButtons = (req) => {
    const isApproved = req.doctor_approval_status === 'Approved';
    const isPending = req.doctor_approval_status === 'Pending';
    const isRejected = req.doctor_approval_status === 'Rejected';

    // State 1: Pending Doctor Approval -> Show "—" with helper indicator
    if (isPending) {
      return (
        <div className="flex items-center justify-end gap-1 text-[#7b776c]">
          <span className="text-xs font-semibold px-2" title="Awaiting Doctor Approval">—</span>
        </div>
      );
    }

    // State 6: Rejected -> Show "—"
    if (isRejected) {
      return <span className="text-xs text-[#7b776c] font-semibold px-2">—</span>;
    }

    if (isApproved) {
      // State 2: Approved + Requested -> [Allocate]
      if (req.delivery_status === 'Requested') {
        return (
          <button
            type="button"
            onClick={() => {
              setAllocatingRequest(req);
              setSelectedUnitId('');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Allocate</span>
          </button>
        );
      }

      // State 3: Approved + Allocated -> [Edit]
      if (req.delivery_status === 'Allocated') {
        return (
          <button
            type="button"
            onClick={() => {
              setEditingRequest(req);
              setReassignUnitId('');
              setEditDeliveryStatus('Allocated');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#ede3d0] border border-[#e0d9cc] rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        );
      }

      // State 4: Approved + Delivered -> [View/Edit]
      if (req.delivery_status === 'Delivered') {
        return (
          <button
            type="button"
            onClick={() => {
              setEditingRequest(req);
              setReassignUnitId('');
              setEditDeliveryStatus('Delivered');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#fdfbf7] hover:bg-[#f4ede0] border border-[#e0d9cc] rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View/Edit</span>
          </button>
        );
      }

      // State 5: Approved + Returned -> [View]
      if (req.delivery_status === 'Returned') {
        return (
          <button
            type="button"
            onClick={() => setViewingRequest(req)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#7b776c] bg-[#f9f6ef] hover:bg-[#f2ece1] border border-[#e8e2d5] rounded-xl transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
        );
      }
    }

    return <span className="text-xs text-[#7b776c] font-semibold px-2">—</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#645e45]" />
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Equipment & Assistive Devices Management
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4f2e9] text-[#645e45] rounded-full border border-[#e2dec9]">
              {units.length} Physical Units
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Administer physical palliative equipment inventory, serial tracking, patient allocations, and unit lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTypeModal(true)}
            className="px-3 py-2 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
          >
            + Add Equipment Type
          </button>
          <button
            type="button"
            onClick={() => {
              if (types.length > 0) setSelectedTypeIdForUnit(types[0].equipment_type_id);
              setShowAddUnitModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            + Register Physical Unit
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EQUIPMENT CATEGORIES OVERVIEW                                  */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider">
            Equipment Categories & Stock Overview
          </h3>
          <span className="text-[11px] text-[#7b776c] font-medium">
            {types.length} Categories Registered
          </span>
        </div>

        {types.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#e9e2d5] text-center text-xs text-[#7b776c]">
            No equipment categories configured. Click "+ Add Equipment Type" to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((t) => (
              <div
                key={t.equipment_type_id}
                className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-[#1e1b14]">{t.name}</h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#fdfbf7] border border-[#e0d9cc] text-[#4a473d]">
                      {t.total_units} Total
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-[#7b776c] mt-1 leading-relaxed line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#f2ece1] text-center text-[10px]">
                  <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="block font-black text-emerald-900 text-xs">{t.available}</span>
                    <span className="font-bold text-emerald-700 text-[9px]">Available</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#f4f2e9] border border-[#e2dec9]">
                    <span className="block font-black text-[#645e45] text-xs">{t.allocated}</span>
                    <span className="font-bold text-[#645e45] text-[9px]">Allocated</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="block font-black text-amber-900 text-xs">{t.maintenance}</span>
                    <span className="font-bold text-amber-700 text-[9px]">Maint.</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="block font-black text-slate-800 text-xs">{t.retired}</span>
                    <span className="font-bold text-slate-600 text-[9px]">Retired</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PATIENT EQUIPMENT REQUESTS & ACTIONS TABLE                     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider">
              Patient Equipment Requests & Allocation Queue
            </h3>
            <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
              Doctor-reviewed equipment requests. Allocate physical units, reassign, or update delivery status.
            </p>
          </div>
          <span className="text-[11px] text-[#7b776c] font-medium">
            {requests.length} Requests Total
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-[#e9e2d5] text-center text-xs text-[#7b776c] space-y-1">
            <ClipboardList className="w-6 h-6 mx-auto text-[#7b776c] opacity-60 mb-2" />
            <p className="font-bold">No active equipment requests found.</p>
            <p>Patient requests reviewed by Doctors will appear here for physical allocation.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                    <th className="py-3 px-4 font-extrabold">Patient</th>
                    <th className="py-3 px-4 font-extrabold">Requested Equipment</th>
                    <th className="py-3 px-4 font-extrabold">Request Date</th>
                    <th className="py-3 px-4 font-extrabold">Clinical Approval</th>
                    <th className="py-3 px-4 font-extrabold">Admin Delivery Status</th>
                    <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1] text-[#1e1b14]">
                  {requests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-[#faf7f0] transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                        {req.patient_name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#4a473d]">
                        {req.equipment_type_name}
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                        {req.requested_at}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            req.doctor_approval_status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : req.doctor_approval_status === 'Rejected'
                              ? 'bg-[#faf0ec] text-[#ba1a1a] border-[#ebd4cc]'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {req.doctor_approval_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            req.delivery_status === 'Requested'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : req.delivery_status === 'Allocated'
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : req.delivery_status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {req.delivery_status}
                          {req.allocated_unit_serial && (
                            <span className="font-bold opacity-80">({req.allocated_unit_serial})</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {renderActionButtons(req)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PHYSICAL EQUIPMENT UNITS INVENTORY TABLE                       */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-[#1e1b14] uppercase tracking-wider">
            Physical Equipment Units Inventory
          </h3>
          <span className="text-[11px] text-[#7b776c] font-medium">
            {filteredUnits.length} of {units.length} Units Displayed
          </span>
        </div>

        {/* Filter Tabs & Search */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Units' },
              { id: 'available', label: 'Available' },
              { id: 'allocated', label: 'Allocated' },
              { id: 'maintenance', label: 'Maintenance' },
              { id: 'retired', label: 'Retired' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#645e45] text-white shadow-2xs'
                    : 'bg-[#fdfbf7] text-[#4a473d] hover:bg-[#f4ede0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search device name or serial..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
            />
          </div>
        </div>

        {/* Units Table */}
        <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
          {filteredUnits.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#7b776c] font-medium">
              No equipment units found matching your filter or search query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e9e2d5] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                    <th className="py-3 px-4 font-extrabold">Device Name</th>
                    <th className="py-3 px-4 font-extrabold">Serial Number</th>
                    <th className="py-3 px-4 font-extrabold">Operational Status</th>
                    <th className="py-3 px-4 font-extrabold">Last Updated</th>
                    <th className="py-3 px-4 font-extrabold text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1]">
                  {filteredUnits.map((u) => (
                    <tr key={u.unit_id} className="hover:bg-[#faf7f0] transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#1e1b14]">
                        {u.equipment_type_name}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-[#645e45]">
                        {u.serial_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            u.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : u.status === 'Allocated'
                              ? 'bg-[#f4f2e9] text-[#645e45] border-[#e2dec9]'
                              : u.status === 'Maintenance'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {u.status === 'Available' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {u.status === 'Allocated' && <PackageCheck className="w-3 h-3 text-[#645e45]" />}
                          {u.status === 'Maintenance' && <Wrench className="w-3 h-3 text-amber-700" />}
                          {u.status === 'Retired' && <XCircle className="w-3 h-3 text-slate-500" />}
                          <span>{u.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#7b776c] font-medium">
                        {u.updated_at}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setUpdatingUnit(u);
                            setNewUnitStatus(u.status);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-[#645e45] hover:bg-[#f4ede0] rounded-lg border border-[#e0d9cc] transition-all cursor-pointer"
                        >
                          Change Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ALLOCATION MODAL (State 2: Approved + Requested)                       */}
      {/* ========================================================================= */}
      {allocatingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAllocateEquipment}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#645e45]" />
                <h3 className="font-extrabold text-base text-[#1e1b14]">
                  Allocate Equipment Unit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAllocatingRequest(null);
                  setSelectedUnitId('');
                }}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Details Summary (Read-Only) */}
            <div className="bg-[#fdfbf7] p-3.5 rounded-2xl border border-[#e9e2d5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Patient</span>
                <span className="font-black text-[#1e1b14]">
                  {allocatingRequest.patient_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Requested Equipment</span>
                <span className="font-extrabold text-[#645e45]">
                  {allocatingRequest.equipment_type_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Clinical Approval</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Approved by Doctor</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Current Status</span>
                <span className="font-bold text-amber-900">Approved / Requested</span>
              </div>
            </div>

            {/* Available Physical Units Selection */}
            <div className="space-y-2 text-xs">
              <label className="block font-extrabold text-[#1e1b14]">
                Available Physical Units ({matchingAvailableUnits.length} in Stock) <span className="text-rose-500">*</span>
              </label>

              {matchingAvailableUnits.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                  <span>No available units for this equipment type in current stock. Please register new units or process returns first.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {matchingAvailableUnits.map((u) => (
                    <label
                      key={u.unit_id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedUnitId === String(u.unit_id)
                          ? 'bg-[#f4ede0] border-[#645e45] ring-1 ring-[#645e45]'
                          : 'bg-[#fdfbf7] border-[#e0d9cc] hover:bg-[#f9f6ef]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="selected_physical_unit"
                          value={u.unit_id}
                          checked={selectedUnitId === String(u.unit_id)}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className="w-4 h-4 accent-[#645e45]"
                        />
                        <div>
                          <p className="font-extrabold text-[#1e1b14]">{u.serial_number}</p>
                          <p className="text-[10px] text-[#7b776c]">Last updated: {u.updated_at}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 rounded-md border border-emerald-300">
                        Available
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAllocatingRequest(null);
                  setSelectedUnitId('');
                }}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || matchingAvailableUnits.length === 0 || !selectedUnitId}
                className="px-5 py-2 text-xs font-black text-white bg-[#645e45] hover:bg-[#4c472f] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Allocating...' : 'Allocate Equipment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT ALLOCATION & VIEW/EDIT MODAL (States 3 & 4)                       */}
      {/* ========================================================================= */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#645e45]" />
                <h3 className="font-extrabold text-base text-[#1e1b14]">
                  {editingRequest.delivery_status === 'Delivered'
                    ? 'Equipment Delivery & Allocation Details'
                    : 'Edit Equipment Allocation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRequest(null);
                  setReassignUnitId('');
                }}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comprehensive Detail View (Read-Only Medical Governance) */}
            <div className="bg-[#fdfbf7] p-3.5 rounded-2xl border border-[#e9e2d5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Patient</span>
                <span className="font-black text-[#1e1b14]">
                  {editingRequest.patient_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Equipment Type</span>
                <span className="font-extrabold text-[#645e45]">
                  {editingRequest.equipment_type_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Request Date</span>
                <span className="font-medium text-[#4a473d]">{editingRequest.requested_at}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Clinical Approval</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Approved {editingRequest.approved_by_doctor_name ? `by ${editingRequest.approved_by_doctor_name}` : ''}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Currently Allocated Unit</span>
                <span className="font-extrabold text-blue-900 px-2 py-0.5 bg-blue-50 rounded-md border border-blue-200">
                  {editingRequest.allocated_unit_serial || 'None'}
                </span>
              </div>
              {editingRequest.allocated_by_admin_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#7b776c]">Allocated By Admin</span>
                  <span className="font-medium text-[#4a473d]">{editingRequest.allocated_by_admin_name}</span>
                </div>
              )}
              {editingRequest.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#7b776c]">Last Updated</span>
                  <span className="font-medium text-[#7b776c]">{editingRequest.updated_at}</span>
                </div>
              )}
            </div>

            {/* Reassign Physical Unit (Optional) */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-extrabold text-[#1e1b14]">
                Reassign Physical Unit (Optional)
              </label>
              <select
                value={reassignUnitId}
                onChange={(e) => setReassignUnitId(e.target.value)}
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              >
                <option value="">
                  Keep Currently Allocated ({editingRequest.allocated_unit_serial || 'None'})
                </option>
                {editMatchingAvailableUnits.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    Reassign to: {u.serial_number} (Available in Stock)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#7b776c]">
                Selecting a new unit will automatically release the previous unit back to Available stock.
              </p>
            </div>

            {/* Delivery Status Dropdown */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-extrabold text-[#1e1b14]">
                Admin Delivery Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={editDeliveryStatus}
                onChange={(e) => setEditDeliveryStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
              >
                <option value="Allocated">Allocated (Unit assigned, preparing for dispatch)</option>
                <option value="Delivered">Delivered (Handed over / in patient possession)</option>
                <option value="Returned">Returned (Patient returned device, free unit to stock)</option>
              </select>
              {editDeliveryStatus === 'Returned' && (
                <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Marking as "Returned" will release the physical unit back to Available inventory stock.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingRequest(null);
                  setReassignUnitId('');
                }}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-[#645e45] hover:bg-[#4c472f] disabled:bg-gray-300 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. READ-ONLY VIEW MODAL (State 5: Approved + Returned)                     */}
      {/* ========================================================================= */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#645e45]" />
                <h3 className="font-extrabold text-base text-[#1e1b14]">
                  Returned Equipment Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#fdfbf7] p-3.5 rounded-2xl border border-[#e9e2d5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Patient</span>
                <span className="font-black text-[#1e1b14]">
                  {viewingRequest.patient_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Equipment Type</span>
                <span className="font-extrabold text-[#645e45]">{viewingRequest.equipment_type_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Physical Unit Code</span>
                <span className="font-bold text-[#4a473d]">{viewingRequest.allocated_unit_serial || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7b776c]">Delivery Status</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                  Returned
                </span>
              </div>
              {viewingRequest.returned_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#7b776c]">Returned At</span>
                  <span className="font-medium text-emerald-900">{viewingRequest.returned_at}</span>
                </div>
              )}
              {viewingRequest.approved_by_doctor_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#7b776c]">Approved By Doctor</span>
                  <span className="font-medium text-[#4a473d]">{viewingRequest.approved_by_doctor_name}</span>
                </div>
              )}
              {viewingRequest.allocated_by_admin_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#7b776c]">Managed By Admin</span>
                  <span className="font-medium text-[#4a473d]">{viewingRequest.allocated_by_admin_name}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>This physical equipment unit has been returned and restored to Available inventory stock.</span>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. UPDATE UNIT OPERATIONAL STATUS MODAL                                    */}
      {/* ========================================================================= */}
      {updatingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateUnitStatus}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#645e45]" />
                <h3 className="font-extrabold text-base text-[#1e1b14]">
                  Update Unit Status
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUpdatingUnit(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#fdfbf7] p-3 rounded-xl border border-[#e9e2d5]">
                <p className="text-[11px] text-[#7b776c] font-bold">Physical Unit</p>
                <p className="font-black text-[#1e1b14] text-xs">
                  {updatingUnit.equipment_type_name} ({updatingUnit.serial_number})
                </p>
                <p className="text-[10px] text-[#7b776c] mt-0.5">
                  Current Status:{' '}
                  <span className="font-bold text-[#645e45]">{updatingUnit.status}</span>
                </p>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Operational Status
                </label>
                <select
                  value={newUnitStatus}
                  onChange={(e) => setNewUnitStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  <option value="Available">Available in Stock</option>
                  <option value="Maintenance">Under Maintenance / Repair</option>
                  <option value="Retired">Retired / Out of Service</option>
                </select>
                <p className="text-[10px] text-[#7b776c] mt-1">
                  Note: Allocation to patients must be performed via approved equipment requests.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpdatingUnit(null)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] disabled:bg-gray-300 rounded-xl transition-all cursor-pointer"
              >
                {isSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CREATE EQUIPMENT TYPE MODAL                                            */}
      {/* ========================================================================= */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateType}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Add Equipment Category
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTypeModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Equipment Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Oxygen Concentrator, Hospital Bed, Wheelchair"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="Clinical specifications, power requirements, and accessories..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddTypeModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] disabled:bg-gray-300 rounded-xl transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Add Equipment Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REGISTER PHYSICAL UNIT MODAL                                           */}
      {/* ========================================================================= */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateUnit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Register Physical Equipment Unit
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Equipment Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTypeIdForUnit}
                  onChange={(e) => setSelectedTypeIdForUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                >
                  {types.map((t) => (
                    <option key={t.equipment_type_id} value={t.equipment_type_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#1e1b14] mb-1">
                  Unit Serial Number (Optional, auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={unitSerial}
                  onChange={(e) => setUnitSerial(e.target.value)}
                  placeholder="e.g. KG-OXY-101"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c] hover:bg-[#f4ede0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] disabled:bg-gray-300 rounded-xl transition-all cursor-pointer"
              >
                {isSubmitting ? 'Registering...' : 'Register Unit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
