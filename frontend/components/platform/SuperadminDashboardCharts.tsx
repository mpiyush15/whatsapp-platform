'use client';

import { formatCount } from '@/components/platform/PlatformAnalyticsCharts';

export type DailyVolumePoint = {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
};

export type ChartItem = { label: string; value: number };

const VERTICAL_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#a855f7', '#818cf8'];

export function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/40 p-5 shadow-lg shadow-indigo-500/10 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}


export function MorphicAreaChart({
  data,
  height = 200,
}: {
  data: DailyVolumePoint[];
  height?: number;
}) {
  if (!data.length) return <p className="text-sm text-slate-500">No data</p>;

  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 400;
  const h = height;
  const step = w / Math.max(data.length - 1, 1);

  const outPts = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.outbound / max) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const outArea = `M0,${h} L${outPts.join(' L')} L${(data.length - 1) * step},${h} Z`;

  const inPts = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.inbound / max) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const inArea = `M0,${h} L${inPts.join(' L')} L${(data.length - 1) * step},${h} Z`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400" /> Received
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sa-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="sa-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={outArea} fill="url(#sa-out)" />
        <path d={inArea} fill="url(#sa-in)" />
        <polyline points={outPts.join(' ')} fill="none" stroke="#4f46e5" strokeWidth="2" />
        <polyline points={inPts.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}


export function MorphicGradientBars({
  data,
  height = 180,
}: {
  data: ChartItem[];
  height?: number;
}) {
  if (!data.length) return <p className="text-sm text-slate-500">No signups yet</p>;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label + i} className="group flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-h-[4px] rounded-t-md bg-gradient-to-t from-indigo-600 via-violet-500 to-blue-400 opacity-90 shadow-md shadow-indigo-300/40 transition-all group-hover:opacity-100"
              style={{ height: `${Math.max(pct, 4)}%` }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="truncate text-[9px] text-slate-400 max-w-full">{d.label.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}


export function MorphicDonutChart({
  items,
  size = 160,
}: {
  items: ChartItem[];
  size?: number;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return <p className="text-sm text-slate-500">No projects</p>;

  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const slices = items.map((item, i) => {
    const pct = item.value / total;
    const start = acc * 2 * Math.PI - Math.PI / 2;
    acc += pct;
    const end = acc * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = pct > 0.5 ? 1 : 0;
    const color = VERTICAL_COLORS[i % VERTICAL_COLORS.length];
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...item, d, color, pct };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
      <svg width={size} height={size} className="drop-shadow-md">
        {slices.map((s, i) => (
          <path key={s.label} d={s.d} fill={s.color} opacity={0.85} stroke="white" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" className="drop-shadow-inner" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-800 text-lg font-bold" fontSize="18">
          {formatCount(total)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500" fontSize="10">
          projects
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-700">{s.label}</span>
            <span className="ml-auto font-medium text-slate-900">{formatCount(s.value)}</span>
            <span className="text-xs text-slate-400">({Math.round(s.pct * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MorphicHorizontalBars({
  data,
  maxBars = 6,
}: {
  data: ChartItem[];
  maxBars?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);
  if (!sorted.length) return <p className="text-sm text-slate-500">No data</p>;
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {sorted.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate font-medium text-slate-700 max-w-[70%]">{d.label}</span>
            <span className="text-slate-500">{formatCount(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-indigo-100/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-sm"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
