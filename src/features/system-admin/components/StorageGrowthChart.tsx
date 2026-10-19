import React, { useState } from 'react';
import { STORAGE_GROWTH_DATA } from '@/data/sysAdminMockData';

export const StorageGrowthChart: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG dimensions & coordinate calculations
  const width = 640;
  const height = 220;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value for scaling
  const maxValue = 5.0; // 5 TB top ceiling
  const minValue = 0.5;

  const points = STORAGE_GROWTH_DATA.map((item, index) => {
    const x = paddingX + (index / (STORAGE_GROWTH_DATA.length - 1)) * chartWidth;
    const normalizedY = (item.value - minValue) / (maxValue - minValue);
    const y = height - paddingBottom - normalizedY * chartHeight;
    return { ...item, x, y };
  });

  // Create smooth SVG path string
  const createPath = () => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // Area path for subtle gradient fill
  const createAreaPath = () => {
    const linePath = createPath();
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${linePath} L ${lastPoint.x} ${height - paddingBottom} L ${firstPoint.x} ${height - paddingBottom} Z`;
  };

  // Horizontal grid lines
  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col justify-between h-full p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Global Storage Growth (TB)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            6-Month Historic Usage Trend
          </p>
        </div>
        <span className="text-xs font-bold text-blue-600 tracking-wide">
          +250% Growth
        </span>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative mt-4 w-full aspect-21/9 min-h-[190px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((ratio, i) => {
            const y = height - paddingBottom - ratio * chartHeight;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Area fill */}
          <path
            d={createAreaPath()}
            fill="url(#storageGradient)"
          />

          {/* Main trend line */}
          <path
            d={createPath()}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                {/* Invisible larger hit area for hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Visible dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={height - 12}
              textAnchor="middle"
              className={`text-[11px] font-medium transition-colors ${
                hoveredIndex === i ? 'fill-blue-600 font-bold' : 'fill-slate-500'
              }`}
            >
              {pt.month}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg shadow-lg text-xs"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
            }}
          >
            <div className="font-semibold">{points[hoveredIndex].month} 2024</div>
            <div className="text-blue-300 font-bold">{points[hoveredIndex].display}</div>
          </div>
        )}
      </div>
    </div>
  );
};
