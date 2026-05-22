import { API_URL } from '@/lib/config/api';

export type BillingCycle = 'monthly' | 'annual';

export type PublicPricingPlan = {
  _id: string;
  planId?: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  setupFee: number;
  currency: string;
  monthlyDiscount: number;
  yearlyDiscount: number;
  signupCredits: number;
  monthlyCredits: number;
  isPopular: boolean;
  isActive: boolean;
  limits: Record<string, number | null | undefined>;
  featureList: string[];
};

function normalizeFeatures(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((f) => (typeof f === 'string' ? f : (f as { name?: string }).name)).filter(Boolean) as string[];
  }
  if (typeof raw === 'object' && raw !== null && 'included' in raw) {
    const included = (raw as { included?: string[] }).included;
    return Array.isArray(included) ? included : [];
  }
  return [];
}

function normalizePlan(plan: Record<string, unknown>): PublicPricingPlan {
  const limits =
    plan.limits && typeof plan.limits === 'object' && !Array.isArray(plan.limits)
      ? (plan.limits as Record<string, number | null | undefined>)
      : {};

  return {
    _id: String(plan._id ?? plan.planId ?? plan.name),
    planId: plan.planId as string | undefined,
    name: String(plan.name ?? 'Plan'),
    description: plan.description as string | undefined,
    monthlyPrice: Number(plan.monthlyPrice ?? 0),
    yearlyPrice: Number(plan.yearlyPrice ?? 0),
    setupFee: Number(plan.setupFee ?? 0),
    currency: String(plan.currency ?? 'INR'),
    monthlyDiscount: Number(plan.monthlyDiscount ?? 0),
    yearlyDiscount: Number(plan.yearlyDiscount ?? plan.annualDiscount ?? 0),
    signupCredits: Number(plan.signupCredits ?? 0),
    monthlyCredits: Number(plan.monthlyCredits ?? 0),
    isPopular: Boolean(plan.isPopular),
    isActive: plan.isActive !== false,
    limits,
    featureList: normalizeFeatures(plan.features),
  };
}

export function parsePublicPlansResponse(payload: unknown): PublicPricingPlan[] {
  const root = payload as Record<string, unknown>;
  const data = root?.data;
  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    list = (data as { data: unknown[] }).data;
  } else if (Array.isArray(root)) {
    list = root;
  }

  return list
    .filter((p) => p && typeof p === 'object')
    .map((p) => normalizePlan(p as Record<string, unknown>))
    .filter((p) => p.isActive);
}

export type ProductLine = 'whatsapp' | 'healthcare';

export async function fetchPublicPricingPlans(
  productLine: ProductLine = 'whatsapp'
): Promise<PublicPricingPlan[]> {
  const res = await fetch(
    `${API_URL}/pricing/plans/public?productLine=${productLine}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(`Could not load plans (${res.status})`);
  }
  const json = await res.json();
  return parsePublicPlansResponse(json);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function planDisplayPrice(plan: PublicPricingPlan, cycle: BillingCycle): {
  main: number;
  sublabel: string;
  yearlyTotal?: number;
} {
  if (cycle === 'annual') {
    const monthlyEquiv = plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
    return {
      main: monthlyEquiv,
      sublabel: 'per month, billed annually',
      yearlyTotal: plan.yearlyPrice,
    };
  }
  return {
    main: plan.monthlyPrice,
    sublabel: 'per month',
  };
}

/** Total amount charged at checkout (matches backend create-order). */
export function planCheckoutTotal(plan: PublicPricingPlan, cycle: BillingCycle): number {
  return cycle === 'annual' ? plan.yearlyPrice : plan.monthlyPrice;
}

export function planCheckoutDisplay(
  plan: PublicPricingPlan,
  cycle: BillingCycle
): { amountLabel: string; periodLabel: string; total: number } {
  if (cycle === 'annual') {
    return {
      amountLabel: formatInr(plan.yearlyPrice),
      periodLabel: 'billed annually',
      total: plan.yearlyPrice,
    };
  }
  return {
    amountLabel: formatInr(plan.monthlyPrice),
    periodLabel: 'per month',
    total: plan.monthlyPrice,
  };
}

export function formatPlanLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unlimited';
  return Number(value).toLocaleString('en-IN');
}

export type PlanCardHighlight = { label: string; value: string };

export function planCardHighlights(
  plan: PublicPricingPlan,
  productLine: 'whatsapp' | 'healthcare' = 'whatsapp'
): PlanCardHighlight[] {
  const { limits } = plan;
  if (productLine === 'healthcare') {
    return [
      { label: 'Patients', value: formatPlanLimit(limits.patients) },
      { label: 'Appointments / mo', value: formatPlanLimit(limits.appointments) },
      { label: 'Campaigns / mo', value: formatPlanLimit(limits.campaigns) },
      { label: 'WhatsApp messages / mo', value: formatPlanLimit(limits.messages) },
      { label: 'Business numbers', value: formatPlanLimit(limits.phoneNumbers) },
    ];
  }
  return [
    { label: 'Messages / mo', value: formatPlanLimit(limits.messages) },
    { label: 'Campaigns / mo', value: formatPlanLimit(limits.campaigns) },
    { label: 'Contacts', value: formatPlanLimit(limits.contacts) },
    { label: 'Business numbers', value: formatPlanLimit(limits.phoneNumbers) },
    { label: 'Team members', value: formatPlanLimit(limits.users) },
  ];
}

export function normalizeCheckoutCycle(
  value: string | null | undefined
): BillingCycle {
  return value === 'annual' ? 'annual' : 'monthly';
}

function planUrlKey(plan: PublicPricingPlan | string): string {
  if (typeof plan === 'string') return plan.toLowerCase();
  return (plan.planId || plan.name).toLowerCase();
}

/** New clients: pricing → signup → Cashfree → project wizard */
export function signupUrl(plan: PublicPricingPlan | string, cycle: BillingCycle): string {
  const params = new URLSearchParams({
    plan: planUrlKey(plan),
    cycle: cycle === 'annual' ? 'annual' : 'monthly',
  });
  return `/auth/register?${params.toString()}`;
}

/** Logged-in users upgrading or paying from billing */
export function checkoutUrl(planName: string, cycle: BillingCycle): string {
  const params = new URLSearchParams({
    plan: planName.toLowerCase(),
    cycle: cycle === 'annual' ? 'annual' : 'monthly',
  });
  return `/checkout?${params.toString()}`;
}
