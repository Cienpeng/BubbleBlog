import { useState, useMemo } from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export default function BarChart({ data, height = 300 }: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { max, chartW, chartH, barW, gap, margin } = useMemo(() => {
    const margin = { top: 40, right: 20, bottom: 44, left: 48 };
    const chartW = 800 - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const max = Math.max(...data.map(d => d.value), 1);
    const count = data.length;
    const totalGap = chartW * 0.18;
    const gap = count > 1 ? totalGap / (count - 1) : 0;
    const barW = Math.min((chartW - totalGap) / count, 64);
    return { max, chartW, chartH, barW, gap, margin };
  }, [data, height]);

  const yTicks = useMemo(() => {
    const step = max > 5 ? Math.ceil(max / 5) : 1;
    return Array.from({ length: 6 }, (_, i) => i * step);
  }, [max]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.05]"
        style={{ height }}
      >
        <p className="text-sm text-gray-400">暂无访问数据</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 800 ${height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5DAC81" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#5DAC81" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d8b65" stopOpacity="1" />
            <stop offset="100%" stopColor="#5DAC81" stopOpacity="0.85" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tick => {
          const y = margin.top + chartH - (tick / max) * chartH;
          return (
            <g key={`grid-${tick}`}>
              <line
                x1={margin.left} y1={y}
                x2={margin.left + chartW} y2={y}
                stroke="currentColor"
                className="text-black/[0.04] dark:text-white/[0.04]"
                strokeWidth="1"
              />
              <text
                x={margin.left - 10} y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[10px] font-mono select-none"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={margin.left} y1={margin.top + chartH}
          x2={margin.left + chartW} y2={margin.top + chartH}
          className="stroke-black/10 dark:stroke-white/[0.08]"
          strokeWidth="1.5"
        />

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = Math.max((d.value / max) * chartH, d.value > 0 ? 4 : 0);
          const x = margin.left + i * (barW + gap);
          const baseY = margin.top + chartH;
          const y = baseY - barHeight;
          const isHovered = hoveredIdx === i;
          const isDimmed = hoveredIdx !== null && !isHovered;

          return (
            <g key={i} className="cursor-pointer">
              {/* Transparent hit area (larger) */}
              <rect
                x={x - 3} y={margin.top}
                width={barW + 6} height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Bar group with animation */}
              <g
                style={{
                  transform: isHovered
                    ? 'translateY(-6px)'
                    : isDimmed
                      ? 'translateY(3px)'
                      : 'translateY(0px)',
                  transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  opacity: isDimmed ? 0.38 : 1,
                }}
              >
                <rect
                  x={x} y={y}
                  width={barW} height={barHeight}
                  rx={4}
                  fill={isHovered ? 'url(#barGradHover)' : 'url(#barGrad)'}
                  filter={isHovered ? 'url(#glow)' : undefined}
                  style={{
                    transition: 'fill 250ms ease, filter 250ms ease',
                  }}
                />
                {/* Hover value label */}
                {isHovered && (
                  <text
                    x={x + barW / 2}
                    y={y - 12}
                    textAnchor="middle"
                    className="fill-text-primary dark:fill-white font-extrabold text-sm select-none"
                    style={{ transition: 'opacity 200ms ease' }}
                  >
                    {d.value}
                  </text>
                )}
              </g>
              {/* X label */}
              <text
                x={x + barW / 2}
                y={baseY + 20}
                textAnchor="middle"
                className="fill-gray-400 text-[10px] select-none"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
