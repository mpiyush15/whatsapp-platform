import { API_URL } from '@/lib/config/api';
import type { BillingCycle } from '@/lib/pricing/publicPlans';

export type CreateSubscriptionOrderInput = {
  plan: string;
  billingCycle: BillingCycle | 'quarterly';
};

export type CreateSubscriptionOrderResult = {
  ok: boolean;
  message?: string;
  paymentSessionId?: string;
  orderId?: string;
  amount?: number;
};

export async function createSubscriptionOrder(
  input: CreateSubscriptionOrderInput,
  token: string
): Promise<CreateSubscriptionOrderResult> {
  const res = await fetch(`${API_URL}/subscriptions/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      plan: input.plan,
      billingCycle: input.billingCycle,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    return { ok: false, message: json.message || 'Failed to create payment order' };
  }

  const data = json.data ?? json;
  return {
    ok: true,
    paymentSessionId: data.paymentSessionId,
    orderId: data.orderId,
    amount: data.amount,
  };
}
