import React, { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

const colorPalette = {
  'New Patients': '#4a6b4a', // soft sage green
  'Home Visits': '#645e45', // muted olive
  'Telemedicine': '#9e7b4f', // warm golden brown
  'Laboratory Reports': '#a85858', // muted rose/terracotta
};

export default function AdminOverviewChart({ chartData = {} }) {
  const [timeRange, setTimeRange] = useState('this_month');
  const [activeSeries, setActiveSeries] = useState({
    'New Patients': true,
    'Home Visits': true,
    'Telemedicine': true,
    'Laboratory Reports': true,
  });
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const currentDataset = chartData[timeRange] || {
    categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    series: [
      { name: 'New Patients', data: [3, 4, 6, 5] },
      { name: 'Home Visits', data: [12, 18, 15, 22] },
      { name: 'Telemedicine', data: [8, 14, 11, 16] },
      { name: 'Laboratory Reports', data: [5, 9, 7, 10] },
    ],
  };

  const categories = currentDataset.categories || [];
  const series = currentDataset.series || [];

  // Calculate maximum value for chart scale
  let maxValue = 10;
  series.forEach((s) => {
    if (activeSeries[s.name]) {
      s.data.forEach((val) => {
        if (val > maxValue) maxValue = val;
      });
    }
  });
  // Round up to nice number
  maxValue = Math.ceil(maxValue * 1.15) || 10;

  // Chart dimensions in viewBox coordinates
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index) => {
    if (categories.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (categories.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    return paddingTop + chartHeight - (val / maxValue) * chartHeight;
  };

  // Generate smooth SVG path (cubic bezier)
  const generateSmoothPath = (data) => {
    if (!data || data.length === 0) return '';
    const points = data.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  const toggleSeries = (name) => {
    setActiveSeries((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9e2d5] p-5 shadow-2xs flex flex-col justify-between">
      {/* Card Header & Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f2ece1]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[#1e1b14]">Overview Summary</h3>
            <span className="p-1 rounded-lg bg-[#edf3ec] text-[#426442]">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-[#7b776c] font-medium mt-0.5">
            Palliative clinical care, visits, and patient engagement activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#7b776c]" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs font-extrabold text-[#1e1b14] bg-[#fdfbf7] border border-[#e0d9cc] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#645e45] cursor-pointer"
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="my-4 relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-64 overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const yVal = paddingTop + chartHeight * (1 - ratio);
            const labelVal = Math.round(maxValue * ratio);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yVal}
                  x2={svgWidth - paddingRight}
                  y2={yVal}
                  stroke="#eee7da"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={yVal + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#8c877b"
                  fontWeight="600"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* X Axis Category Labels */}
          {categories.map((cat, idx) => {
            const xPos = getX(idx);
            return (
              <text
                key={idx}
                x={xPos}
                y={svgHeight - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#6e6a5f"
                fontWeight="700"
              >
                {cat}
              </text>
            );
          })}

          {/* Render Series Lines & Interactive Points */}
          {series.map((s) => {
            if (!activeSeries[s.name]) return null;
            const color = colorPalette[s.name] || '#645e45';
            const pathD = generateSmoothPath(s.data);

            return (
              <g key={s.name}>
                {/* Smooth Curve Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {s.data.map((val, idx) => {
                  const cx = getX(idx);
                  const cy = getY(val);
                  const isHovered =
                    hoveredPoint?.series === s.name && hoveredPoint?.index === idx;

                  return (
                    <g key={idx}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth="2.5"
                        className="transition-all cursor-pointer"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            series: s.name,
                            index: idx,
                            val,
                            category: categories[idx],
                            x: cx,
                            y: cy,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-[#1e1b14] text-white text-xs px-2.5 py-1.5 rounded-xl shadow-lg border border-[#4a473d] transform -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
            }}
          >
            <p className="text-[10px] font-bold text-[#cbc6ba]">{hoveredPoint.category}</p>
            <p className="font-extrabold">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: colorPalette[hoveredPoint.series] }}
              />
              {hoveredPoint.series}: {hoveredPoint.val}
            </p>
          </div>
        )}
      </div>

      {/* Interactive Legend with toggles */}
      <div className="pt-3 border-t border-[#f2ece1] flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        {series.map((s) => {
          const color = colorPalette[s.name] || '#645e45';
          const isActive = activeSeries[s.name];

          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggleSeries(s.name)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-opacity cursor-pointer ${
                isActive ? 'opacity-100' : 'opacity-35 line-through'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#4a473d]">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
