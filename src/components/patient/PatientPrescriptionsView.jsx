import React, { useState } from 'react';
import { Pill, Printer, Search, CheckCircle2, History, Clock, FileText, ChevronDown } from 'lucide-react';

export default function PatientPrescriptionsView({
  prescriptions = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesStatus = statusFilter === 'all' || rx.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      rx.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.items?.some((i) => i.medicine_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              My Prescriptions & Regimens
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f5f1ea] text-[#695e3d] rounded-full border border-[#e7ded0]">
              {prescriptions.length} Records
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Active physician prescriptions, medicine dosages, instructions, and complete version histories
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#645e45] hover:bg-[#4c472f] rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Prescriptions</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All Versions' },
            { id: 'active', label: 'Active Prescriptions' },
            { id: 'superseded', label: 'Superseded (Past)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            placeholder="Search medicine or doctor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#645e45]"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <Pill className="w-10 h-10 text-[#695e3d] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Prescriptions Found
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            You currently have no prescriptions matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((rx) => {
            const isActive = rx.status === 'Active';

            return (
              <div
                key={rx.prescription_id}
                className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4"
              >
                {/* Prescription Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2ece1] gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-[#f4ede0] text-[#645e45] border-[#e0d9cc]'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-[#1e1b14]">
                          Prescription Version {rx.version_number}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#7b776c] font-medium mt-0.5">
                        Issued by Dr. {rx.doctor_name} on {rx.created_at}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medicines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#f2ece1] text-[#7b776c] uppercase text-[10px] tracking-wider bg-[#fdfbf7]">
                        <th className="py-2.5 px-3 font-extrabold">Medicine Name</th>
                        <th className="py-2.5 px-3 font-extrabold">Dosage</th>
                        <th className="py-2.5 px-3 font-extrabold">Frequency</th>
                        <th className="py-2.5 px-3 font-extrabold">Duration</th>
                        <th className="py-2.5 px-3 font-extrabold">Change Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2ece1]">
                      {rx.items && rx.items.length > 0 ? (
                        rx.items.map((item) => (
                          <tr key={item.item_id} className="hover:bg-[#fdfbf7]">
                            <td className="py-3 px-3 font-extrabold text-[#1e1b14]">
                              {item.medicine_name}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#4a473d]">
                              {item.dosage}
                            </td>
                            <td className="py-3 px-3 text-[#7b776c] font-medium">
                              {item.frequency}
                            </td>
                            <td className="py-3 px-3 text-[#7b776c] font-medium">
                              {item.duration_days ? `${item.duration_days} days` : 'Continuous'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#f4ede0] text-[#645e45]">
                                {item.change_type || 'New'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-[#7b776c]">
                            No specific medicine items listed in this prescription version.
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
  );
}
