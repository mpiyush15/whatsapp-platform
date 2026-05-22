import { API_URL } from '@/lib/config/api';

export type ProductLine = 'whatsapp' | 'healthcare';

export type CatalogLimit = {
  key: string;
  label: string;
  productLine: ProductLine;
  unit: string;
};

export type CatalogFeature = {
  key: string;
  label: string;
  productLine: ProductLine;
  category: string;
};

export type PlanCatalog = {
  productLine: ProductLine;
  limits: CatalogLimit[];
  features: CatalogFeature[];
  messageCharges?: MessageChargeField[];
  defaultMessageCharges?: Record<string, number>;
};

export type PricingMatrixRow = {
  kind: 'limit' | 'feature' | 'message_charge';
  key: string;
  label: string;
  category: string;
};

export type MessageChargeField = {
  key: string;
  label: string;
  category: string;
};

export type PricingMatrixPlan = {
  planId: string;
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isPopular?: boolean;
  setupFee?: number;
  signupCredits?: number;
  monthlyCredits?: number;
  cells: Record<string, boolean | number | string>;
};

export type PricingFeatureMatrix = {
  productLine: ProductLine;
  rows: PricingMatrixRow[];
  plans: PricingMatrixPlan[];
  catalog?: PlanCatalog;
};

function unwrapData<T>(json: Record<string, unknown>): T {
  const data = json.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  return json as T;
}

export async function fetchPricingFeatureMatrix(
  productLine: ProductLine
): Promise<PricingFeatureMatrix> {
  const res = await fetch(
    `${API_URL}/pricing/plans/feature-matrix?productLine=${productLine}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(`Could not load comparison (${res.status})`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const payload = unwrapData<PricingFeatureMatrix>(json);
  return {
    productLine: payload.productLine || productLine,
    rows: payload.rows || [],
    plans: payload.plans || [],
    catalog: payload.catalog,
  };
}

export async function fetchPlanCatalog(
  productLine: ProductLine,
  token: string
): Promise<PlanCatalog> {
  const res = await fetch(
    `${API_URL}/pricing/admin/catalog?productLine=${productLine}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Could not load catalog (${res.status})`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  return unwrapData<PlanCatalog>(json);
}

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  whatsapp: 'WhatsApp Platform',
  healthcare: 'Healthcare',
};

export function matrixCellKey(row: Pick<PricingMatrixRow, 'kind' | 'key'>): string {
  return `${row.kind}:${row.key}`;
}
