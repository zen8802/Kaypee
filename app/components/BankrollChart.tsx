'use client';

import { BankrollSnapshot } from '../lib/types';
import { useMemo } from 'react';

interface Props {
  data: BankrollSnapshot[];
  height?: number;
}

export default function BankrollChart({ data, height = 200 }: Props) {
  const chartData = useMemo(() => {
    if (!data.length) return { points: '', areaPoints: '', min: 0, max: 0, labels: [] };

    const values = data.map((d) => d.value);
    const min = Math.min(...values) * 0.98;
    const max = Math.max(...values) * 1.02;
    const range = max - min;

    const width = 800;
    const h = height;
    const padding = 30;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = h - padding - ((d.value - min) / range) * (h - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const firstX = padding;
    const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - 2 * padding);
    const areaPoints = `${firstX},${h - padding} ${points} ${lastX},${h - padding}`;

    // Generate 5 labels
    const labelCount = 5;
    const labels = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (data.length - 1));
      const d = data[idx];
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      labels.push({ x, date: d.date, value: d.value });
    }

    // Y-axis labels
    const yLabels = [];
    for (let i = 0; i <= 4; i++) {
      const value = min + (i / 4) * range;
      const y = h - padding - (i / 4) * (h - 2 * padding);
      yLabels.push({ y, value: `$${(value / 1000).toFixed(1)}K` });
    }

    return { points, areaPoints, min, max, labels, yLabels, width, h, padding };
  }, [data, height]);

  if (!data.length) {
    return <div className="text-muted text-xs text-center py-8">No bankroll data</div>;
  }

  const startValue = data[0].value;
  const endValue = data[data.length - 1].value;
  const isPositive = endValue >= startValue;
  const strokeColor = isPositive ? '#00ff88' : '#ff4455';
  const fillColor = isPositive ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,85,0.08)';

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.h}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {chartData.yLabels?.map((label, i) => (
          <g key={i}>
            <line
              x1={chartData.padding}
              y1={label.y}
              x2={(chartData.width || 800) - chartData.padding!}
              y2={label.y}
              stroke="#1e1e2e"
              strokeWidth="1"
            />
            <text x={chartData.padding! - 5} y={label.y + 3} textAnchor="end" fill="#666680" fontSize="9">
              {label.value}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={chartData.areaPoints} fill={fillColor} />

        {/* Line */}
        <polyline
          points={chartData.points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {chartData.labels?.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={(chartData.h || height) - 8}
            textAnchor="middle"
            fill="#666680"
            fontSize="9"
          >
            {new Date(label.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>
    </div>
  );
}
