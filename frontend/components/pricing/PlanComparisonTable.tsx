'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import type { PricingFeatureMatrix } from '@/lib/pricing/planCatalog';
import { matrixCellKey } from '@/lib/pricing/planCatalog';
import { formatInr, type BillingCycle } from '@/lib/pricing/publicPlans';

type Props = {
  matrix: PricingFeatureMatrix;
  billingCycle?: BillingCycle;
  billingLabel?: string;
  onChoosePlan?: (planId: string, planName: string) => void;
  className?: string;
};

function formatCell(
  value: boolean | number | string | undefined,
  kind?: string
): React.ReactNode {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-[#128c7e]" aria-label="Included" />;
  }
  if (value === false) {
    return <Minus className="mx-auto h-4 w-4 text-[#d4d4d8]" aria-label="Not included" />;
  }
  if (value === 'unlimited' || value === null || value === undefined) {
    return <span className="text-[#3f3f46]">Unlimited</span>;
  }
  if (typeof value === 'number') {
    if (kind === 'message_charge') {
      return (
        <span className="tabular-nums font-medium text-[#3f3f46]">
          ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          <span className="text-[10px] font-normal text-[#a1a1aa]"> /msg</span>
        </span>
      );
    }
    return <span className="tabular-nums text-[#3f3f46]">{value.toLocaleString('en-IN')}</span>;
  }
  return <span className="text-[#3f3f46]">{String(value)}</span>;
}

export function PlanComparisonTable({
  matrix,
  billingCycle = 'monthly',
  billingLabel,
  onChoosePlan,
  className = '',
}: Props) {
  const { rows, plans } = matrix;
  if (!plans.length) return null;

  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <div
      className={`overflow-hidden border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(17,17,17,0.06)] ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.08] bg-[#fafafa]">
              <th className="w-[28%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a1a1aa]">
                Compare plans
              </th>
              {plans.map((plan) => (
                <th key={plan.planId || plan._id} className="px-4 py-4 text-center align-bottom">
                  <p className="text-base font-bold text-[#111111]">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[#128c7e]">
                    {formatInr(
                      billingCycle === 'annual' && plan.yearlyPrice > 0
                        ? Math.round(plan.yearlyPrice / 12)
                        : plan.monthlyPrice
                    )}
                    <span className="text-xs font-normal text-[#71717a]">/mo</span>
                  </p>
                  {billingLabel ? (
                    <p className="mt-0.5 text-[10px] text-[#a1a1aa]">{billingLabel}</p>
                  ) : null}
                  {onChoosePlan ? (
                    <button
                      type="button"
                      onClick={() => onChoosePlan(plan.planId || plan._id, plan.name)}
                      className={`mt-3 w-full px-3 py-2 text-xs font-semibold ${
                        plan.isPopular ? 'marketing-cta-primary text-white' : 'marketing-cta-outline-wa'
                      }`}
                    >
                      Choose plan
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const categoryRows = rows.filter((r) => r.category === category);
              if (!categoryRows.length) return null;
              return (
                <React.Fragment key={category}>
                  <tr className="bg-[#fafafa]">
                    <td
                      colSpan={plans.length + 1}
                      className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a1aa]"
                    >
                      {category}
                    </td>
                  </tr>
                  {categoryRows.map((row) => (
                    <tr key={row.key} className="border-b border-black/[0.04]">
                      <td className="px-5 py-3 font-medium text-[#52525b]">{row.label}</td>
                      {plans.map((plan) => (
                        <td
                          key={`${plan.planId}-${row.key}`}
                          className="px-4 py-3 text-center"
                        >
                          {formatCell(
                            plan.cells[matrixCellKey(row)] ?? plan.cells[row.key],
                            row.kind
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
