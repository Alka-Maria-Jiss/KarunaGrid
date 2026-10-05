import React, { useState } from 'react';
import { PieChart, ShieldCheck } from 'lucide-react';

export default function AdminAdministrativeChart({ donutData = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const defaultData = [
    { name: 'Caregiver Verifications', value: 4, color: '#645e45' }, // muted olive
    { name: 'Welfare Applications', value: 3, color: '#8a9a86' }, // sage green
    { name: 'Active Users', value: 6, color: '#b5ad8f' }, // warm beige/khaki
    { name: 'Equipment Allocation', value: 5, color: '#695e3d' }, // soft brown
  ];

  const data = donutData && donutData.length > 0 ? donutData : defaultData;
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0) || 1;

  // SVG Donut geometry
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const segments = data.map((item, idx) => {
    const fraction = (item.value || 0) / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += fraction;

    return {
      ...item,
      fraction,
      percentage: Math.round(fraction * 100),
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="pb-3 border-b border-[#f2ece1] flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base text-[#1e1b14]">
            Administrative Overview
          </h3>
          <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
            Phase 1 oversight & administrative activity distribution
          </p>
        </div>
        <span className="p-1.5 rounded-xl bg-[#f4ede0] text-[#645e45]">
          <PieChart className="w-4 h-4" />
        </span>
      </div>

      {/* Donut Chart with Center Total */}
      <div className="my-4 flex items-center justify-center relative">
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f4ede0"
              strokeWidth={strokeWidth}
            />

            {/* Colored Segments */}
            {segments.map((seg) => {
              const isHovered = hoveredIdx === seg.idx;
              return (
                <circle
                  key={seg.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(seg.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {hoveredIdx !== null ? (
              <>
                <span className="text-xl sm:text-2xl font-black text-[#1e1b14]">
                  {data[hoveredIdx].value}
                </span>
                <span className="text-[10px] font-extrabold text-[#645e45] uppercase tracking-wider px-2 truncate max-w-[120px]">
                  {data[hoveredIdx].name}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-black text-[#1e1b14] tracking-tight">
                  {total}
                </span>
                <span className="text-[10px] font-extrabold text-[#7b776c] uppercase tracking-wider">
                  Total Items
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="pt-3 border-t border-[#f2ece1] grid grid-cols-2 gap-2 text-xs">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              hoveredIdx === seg.idx
                ? 'bg-[#f4ede0] border-[#cbc6ba]'
                : 'bg-[#fdfbf7] border-[#f0eae0]'
            }`}
            onMouseEnter={() => setHoveredIdx(seg.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="font-extrabold text-[#1e1b14] truncate text-[11px]">
                {seg.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#7b776c] pl-4">
              <span>{seg.value} items</span>
              <span className="font-bold text-[#645e45]">{seg.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
