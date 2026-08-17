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
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminEquipmentManagement({
  equipment = {},
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('units');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [updatingUnit, setUpdatingUnit] = useState(null);
  const [newUnitStatus, setNewUnitStatus] = useState('Available');

  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [selectedTypeIdForUnit, setSelectedTypeIdForUnit] = useState('');
  const [unitSerial, setUnitSerial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const types = equipment.types || [];
  const units = equipment.units || [];

  const handleCreateType = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/equipment/types/', {
        name: newTypeName.trim(),
        description: newTypeDescription.trim(),
      });
      showSuccess('Equipment type created!');
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

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!selectedTypeIdForUnit) {
      showError('Please choose an equipment type.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/equipment/units/', {
        equipment_type_id: selectedTypeIdForUnit,
        serial_number: unitSerial.trim(),
      });
      showSuccess('Equipment physical unit registered!');
      setUnitSerial('');
      setSelectedTypeIdForUnit('');
      setShowAddUnitModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to register unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUnitStatus = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/admin/equipment/units/${updatingUnit.unit_id}/status/`, {
        status: newUnitStatus,
      });
      showSuccess(`Unit status updated to ${newUnitStatus}!`);
      setUpdatingUnit(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to update unit status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.equipment_type_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || u.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Equipment & Assistive Devices Management
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4f2e9] text-[#645e45] rounded-full border border-[#e2dec9]">
              {units.length} Units in Registry
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Administer physical palliative equipment inventory, serial tracking, and operational statuses
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

      {/* Tabs & Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Units' },
            { id: 'available', label: 'Available in Stock' },
            { id: 'allocated', label: 'Allocated' },
            { id: 'maintenance', label: 'Under Maintenance' },
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

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#7b776c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by device or serial number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Summary Cards by Device Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {types.map((t) => (
          <div
            key={t.equipment_type_id}
            className="bg-white rounded-2xl border border-[#e9e2d5] p-4 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <h4 className="font-extrabold text-sm text-[#1e1b14]">{t.name}</h4>
              <p className="text-[11px] text-[#7b776c] line-clamp-2 mt-0.5">{t.description}</p>
            </div>

            <div className="pt-3 mt-3 border-t border-[#f2ece1] flex items-center justify-between text-xs font-bold">
              <span className="text-[#4a473d]">{t.total_units} total</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {t.available} Available
                </span>
                <span className="text-[#645e45] bg-[#f4ede0] px-2 py-0.5 rounded-md border border-[#e0d9cc]">
                  {t.allocated} Allocated
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Physical Units Table */}
      <div className="bg-white rounded-2xl border border-[#e9e2d5] shadow-2xs overflow-hidden">
        {filteredUnits.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7b776c] font-bold">
            No equipment units found matching your search.
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
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : u.status === 'Allocated'
                            ? 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                            : u.status === 'Maintenance'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {u.status}
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
                          setNewUnitStatus(u.status || 'Available');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#645e45] bg-[#f4ede0] hover:bg-[#eee7da] rounded-xl transition-all cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Change Status</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EQUIPMENT TYPE MODAL */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateType}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
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
                  Equipment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Electric Suction Machine (Home Portable)"
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
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl"
              >
                {isSubmitting ? 'Saving...' : 'Add Equipment Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REGISTER PHYSICAL UNIT MODAL */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateUnit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
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
                  Equipment Type <span className="text-rose-500">*</span>
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
                  placeholder="e.g. KG-OXC-104"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl"
              >
                {isSubmitting ? 'Registering...' : 'Register Unit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {updatingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateUnitStatus}
            className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
              <h3 className="font-extrabold text-base text-[#1e1b14]">
                Update Unit Status
              </h3>
              <button
                type="button"
                onClick={() => setUpdatingUnit(null)}
                className="p-1 rounded-lg text-[#7b776c] hover:bg-[#f4ede0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p>
                <strong>Unit:</strong> {updatingUnit.equipment_type_name} ({updatingUnit.serial_number})
              </p>

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
                  <option value="Allocated">Allocated to Patient</option>
                  <option value="Maintenance">Under Maintenance / Repair</option>
                  <option value="Retired">Retired / Out of Service</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2ece1] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpdatingUnit(null)}
                className="px-4 py-2 text-xs font-bold text-[#7b776c]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl"
              >
                {isSubmitting ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
