import { useState, useMemo } from 'react';

interface DonutChartProps {
  estimatedMinutes: number;
  actualAvgMinutes: number;
  sessionCount: number;
  size?: number;
}

// Polar to Cartesian
function p2c(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// SVG path for a donut segment
function donutSegment(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  const outerStart = p2c(cx, cy, outerR, startAngle);
  const outerEnd = p2c(cx, cy, outerR, endAngle);
  const innerStart = p2c(cx, cy, innerR, startAngle);
  const innerEnd = p2c(cx, cy, innerR, endAngle);

  const large = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  estimatedMinutes,
  actualAvgMinutes,
  sessionCount,
  size = 220,
}: DonutChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<'estimated' | 'actual' | null>(null);

  const config = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.42;
    const innerR = size * 0.27;

    const total = estimatedMinutes + actualAvgMinutes;
    if (total === 0) return { cx, cy, outerR, innerR, segments: [] as any[] };

    // Two segments: estimated (green) and actual (amber/blue)
    const estPct = estimatedMinutes / total;
    const actPct = actualAvgMinutes / total;

    const estAngle = estPct * 360;
    const actAngle = actPct * 360;

    // Estimated: starts at 0, goes clockwise
    // Actual: starts where estimated ends
    const segments = [
      {
        key: 'estimated' as const,
        label: '预计阅读',
        value: estimatedMinutes,
        pct: estPct,
        startAngle: 0,
        endAngle: estAngle,
        color: '#5DAC81',
        hoverColor: '#3d8b65',
        unit: '分钟',
      },
      {
        key: 'actual' as const,
        label: '实际阅读',
        value: actualAvgMinutes,
        pct: actPct,
        startAngle: estAngle,
        endAngle: estAngle + actAngle,
        color: '#4a6cf7',
        hoverColor: '#3451d1',
        unit: '分钟',
      },
    ];

    // Midpoint angles for hover expansion direction
    const withMid = segments.map(s => ({
      ...s,
      midAngle: (s.startAngle + s.endAngle) / 2,
    }));

    return { cx, cy, outerR, innerR, segments: withMid, total };
  }, [estimatedMinutes, actualAvgMinutes, size]);

  const { cx, cy, outerR, innerR, segments, total = 0 } = config;

  if (segments.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.05]"
        style={{ width: size, height: size }}
      >
        <p className="text-xs text-gray-400">暂无阅读数据</p>
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
      >
        <defs>
          <filter id="donutGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={outerR}
          fill="none"
          className="stroke-black/[0.03] dark:stroke-white/[0.04]"
          strokeWidth={outerR - innerR}
        />

        {/* Segments */}
        {segments.map(seg => {
          const isHovered = hoveredSegment === seg.key;
          const isDimmed = hoveredSegment !== null && !isHovered;

          // Expand outward on hover — move toward midpoint angle
          const expandR = isHovered ? 6 : 0;
          const expand = p2c(0, 0, expandR, seg.midAngle);

          const path = donutSegment(cx, cy, innerR, outerR, seg.startAngle, seg.endAngle);

          return (
            <g
              key={seg.key}
              onMouseEnter={() => setHoveredSegment(seg.key)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{
                transform: `translate(${expand.x}px, ${expand.y}px)`,
                transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: isDimmed ? 0.4 : 1,
                cursor: 'pointer',
              }}
            >
              <path
                d={path}
                fill={isHovered ? seg.hoverColor : seg.color}
                filter={isHovered ? 'url(#donutGlow)' : undefined}
                style={{ transition: 'fill 250ms ease, filter 250ms ease' }}
              />
            </g>
          );
        })}

        {/* Center text */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          className="fill-text-primary dark:fill-white font-extrabold text-lg select-none"
        >
          {hoveredSegment
            ? segments.find(s => s.key === hoveredSegment)!.value.toFixed(1)
            : total.toFixed(1)}
        </text>
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          className="fill-gray-400 text-[11px] select-none"
        >
          {hoveredSegment
            ? (segments.find(s => s.key === hoveredSegment)!.unit)
            : '总分钟'}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {segments.map(seg => (
          <button
            key={seg.key}
            onMouseEnter={() => setHoveredSegment(seg.key)}
            onMouseLeave={() => setHoveredSegment(null)}
            className="flex items-center gap-1.5 text-xs group"
          >
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-transform duration-200"
              style={{
                backgroundColor: seg.color,
                transform: hoveredSegment === seg.key ? 'scale(1.4)' : 'scale(1)',
              }}
            />
            <span className="text-gray-400 group-hover:text-text-primary dark:group-hover:text-white/80 transition-colors">
              {seg.label} {seg.value.toFixed(1)}{seg.unit}
            </span>
          </button>
        ))}
      </div>

      {/* Session count */}
      {sessionCount > 0 && (
        <p className="text-[10px] text-gray-400 mt-1">
          {sessionCount} 次阅读记录
        </p>
      )}
    </div>
  );
}
