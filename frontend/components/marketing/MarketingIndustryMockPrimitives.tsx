'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const MOCK_EXAMPLE_WORKSPACE_LABEL = 'Example workspace';

/** Tiny disclaimer on illustrative KPI / pipeline numbers in marketing mocks */
export function MockExampleWorkspaceLabel({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[8px] font-normal italic leading-none text-slate-400/95 sm:text-[9px] ${className}`.trim()}
      aria-label="Demonstration workspace data"
    >
      {MOCK_EXAMPLE_WORKSPACE_LABEL}
    </p>
  );
}

export type IndustrySectionVisualId =
  | 'hero'
  | 'problem'
  | 'helps'
  | 'proof'
  | 'modules'
  | 'workflow'
  | 'honesty';

export function CroppedFrame({
  label,
  children,
  className = '',
  exampleWorkspace = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  exampleWorkspace?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_10px_36px_rgba(17,17,17,0.07)] ring-1 ring-black/[0.04] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fafaf9] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#71717a]">{label}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#25d366]" aria-hidden />
      </div>
      <div className="p-3 sm:p-3.5">
        {children}
        {exampleWorkspace ? <MockExampleWorkspaceLabel className="mt-2 text-right" /> : null}
      </div>
    </div>
  );
}

export function MiniBars({ heights, accent = 'bg-[#128c7e]' }: { heights: number[]; accent?: string }) {
  const max = Math.max(...heights);
  return (
    <div className="flex h-14 items-end justify-between gap-1 pt-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-full max-w-[10px] rounded-t-sm ${accent}`}
          style={{
            height: `${Math.round((h / max) * 100)}%`,
            minHeight: 4,
            opacity: i === heights.length - 1 ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone?: 'emerald' | 'violet' | 'sky' | 'amber' | 'rose';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200/80',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200/80',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/80',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200/80',
  };
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${tones[tone]}`}>
          <Icon className="h-3 w-3" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-[9px] text-slate-500">{sub}</p>
    </div>
  );
}

export function SectionVisualGrid({
  children,
  cols = 3,
  className = '',
  exampleWorkspace = false,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
  exampleWorkspace?: boolean;
}) {
  const grid =
    cols === 2
      ? 'sm:grid-cols-2'
      : cols === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`mx-auto mt-8 max-w-5xl ${className}`.trim()}>
      <div className={`grid gap-3.5 ${grid}`}>{children}</div>
      {exampleWorkspace ? (
        <MockExampleWorkspaceLabel className="mt-2 text-right sm:pr-0.5" />
      ) : null}
    </div>
  );
}

export function ProgressRows({
  rows,
  accent = 'bg-sky-500',
  exampleWorkspace = true,
}: {
  rows: { stage: string; pct: number }[];
  accent?: string;
  exampleWorkspace?: boolean;
}) {
  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.stage} className="flex items-center gap-2">
            <span className="w-[4.5rem] shrink-0 text-[9px] text-slate-600">{row.stage}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${accent}`} style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      {exampleWorkspace ? <MockExampleWorkspaceLabel className="mt-1.5" /> : null}
    </div>
  );
}
