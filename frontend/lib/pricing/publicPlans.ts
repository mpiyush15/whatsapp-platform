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

export async function fetchPublicPricingPlans(): Promise<PublicPricingPlan[]> {
  const res = await fetch(`${API_URL}/pricing/plans/public`, { cache: 'no-store' });
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

export function checkoutUrl(planName: string, cycle: BillingCycle): string {
  const params = new URLSearchParams({
    plan: planName.toLowerCase(),
    cycle: cycle === 'annual' ? 'annual' : 'monthly',
  });
  return `/checkout?${params.toString()}`;
}
