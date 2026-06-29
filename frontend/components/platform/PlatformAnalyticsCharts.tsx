'use client';

export type DailyVolumePoint = {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
};

export function formatCount(n: number) {
  return Number(n || 0).toLocaleString('en-IN');
}

export function PlatformDailyVolumeChart({ data }: { data: DailyVolumePoint[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const showEvery = data.length > 14 ? Math.ceil(data.length / 8) : 1;
  const chartHeight = 200;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          Outbound (sent)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
          Inbound (received)
        </span>
      </div>

      <div className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 pt-6">
        <div
          className="pointer-events-none absolute left-4 right-4 top-4 flex flex-col justify-between text-[10px] text-slate-300"
          style={{ height: chartHeight }}
        >
          <span>{formatCount(max)}</span>
          <span>{formatCount(Math.round(max / 2))}</span>
          <span>0</span>
        </div>

        <div
          className="relative flex items-end gap-px sm:gap-0.5"
          style={{ height: chartHeight }}
        >
          {data.map((point, i) => {
            const outH = max ? (point.outbound / max) * chartHeight : 0;
            const inH = max ? (point.inbound / max) * chartHeight : 0;
            const showLabel = i % showEvery === 0 || i === data.length - 1;

            return (
              <div
                key={point.date}
                className="group relative flex flex-1 flex-col items-center justify-end"
              >
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block"
                >
                  <p className="font-medium">{point.date}</p>
                  <p>Total: {formatCount(point.total)}</p>
                  <p className="text-green-300">Sent: {formatCount(point.outbound)}</p>
                  <p className="text-slate-300">In: {formatCount(point.inbound)}</p>
                </div>

                <div className="flex w-full max-w-[24px] flex-col justify-end gap-px">
                  <div
                    className="w-full rounded-t bg-green-500 transition-colors group-hover:bg-green-600"
                    style={{ height: Math.max(point.outbound ? 2 : 0, outH) }}
                  />
                  <div
                    className="w-full rounded-t bg-slate-300 transition-colors group-hover:bg-slate-400"
                    style={{ height: Math.max(point.inbound ? 2 : 0, inH) }}
                  />
                </div>

                {showLabel ? (
                  <span className="mt-2 max-w-full truncate text-[9px] text-slate-500 sm:text-[10px]">
                    {point.date.slice(5)}
                  </span>
                ) : (
                  <span className="mt-2 h-3" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlatformTrendLine({ data }: { data: DailyVolumePoint[] }) {
  if (data.length < 2) return null;

  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 100;
  const h = 48;
  const step = w / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = h - (d.total / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full text-green-600" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function HorizontalBarChart({
  items,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No data in this period.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-500">
              {formatCount(item.value)} · {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color || 'bg-green-500'}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
