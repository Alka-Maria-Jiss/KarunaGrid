import React from 'react';
import { Boxes, CheckCircle2, PackageCheck, Wrench, ArrowRight } from 'lucide-react';

export default function AdminEquipmentOverview({ equipment = {}, onNavigate }) {
  const total = equipment.total_units || 0;
  const available = equipment.available || 0;
  const allocated = equipment.allocated || 0;
  const maintenance = equipment.maintenance || 0;

  const items = [
    {
      label: 'Available in Stock',
      count: available,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Allocated to Patients',
      count: allocated,
      icon: PackageCheck,
      color: 'text-[#645e45] bg-[#f4f2e9] border-[#e2dec9]',
    },
    {
      label: 'Under Maintenance',
      count: maintenance,
      icon: Wrench,
      color: 'text-amber-800 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[#f2ece1]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1e1b14]">
              Equipment Inventory Status
            </h3>
            <p className="text-[11px] text-[#7b776c] font-medium">
              Medical palliative assistive devices & allocation overview
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('equipment')}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#645e45] hover:text-[#4c472f] hover:underline cursor-pointer"
        >
          <span>Manage Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Total Units */}
        <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#e9e2d5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
              Total Units
            </span>
            <p className="text-xl font-black text-[#1e1b14] mt-0.5">{total}</p>
          </div>
          <span className="text-xs font-extrabold px-2 py-1 bg-white rounded-lg border border-[#e0d9cc] text-[#4a473d]">
            Total
          </span>
        </div>

        {/* Dynamic status breakdowns */}
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between ${it.color}`}
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                  {it.label}
                </span>
                <p className="text-xl font-black mt-0.5">{it.count}</p>
              </div>
              <Icon className="w-5 h-5 opacity-80" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
