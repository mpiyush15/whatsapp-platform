'use client';

import {
  normalizeVertical,
  verticalLabel,
  VERTICAL_BADGE_CLASS,
  type ProjectVertical,
} from '@/lib/projectVerticals';

export function VerticalBadge({
  vertical,
  count,
  compact,
}: {
  vertical: string;
  count?: number;
  compact?: boolean;
}) {
  const key = normalizeVertical(vertical);
  const label = verticalLabel(vertical);
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${VERTICAL_BADGE_CLASS[key]} ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      title={label}
    >
      {label}
      {count != null && count > 1 ? ` ×${count}` : ''}
    </span>
  );
}

export function VerticalBadgesFromCounts({
  projectsByVertical,
  compact,
}: {
  projectsByVertical?: Partial<Record<ProjectVertical, number>> | Record<string, number>;
  compact?: boolean;
}) {
  if (!projectsByVertical || Object.keys(projectsByVertical).length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const entries = Object.entries(projectsByVertical)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([vertical, count]) => (
        <VerticalBadge key={vertical} vertical={vertical} count={count} compact={compact} />
      ))}
    </div>
  );
}

export function VerticalBadgesList({
  verticals,
  compact,
}: {
  verticals?: string[];
  compact?: boolean;
}) {
  if (!verticals?.length) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {verticals.map((v) => (
        <VerticalBadge key={v} vertical={v} compact={compact} />
      ))}
    </div>
  );
}
