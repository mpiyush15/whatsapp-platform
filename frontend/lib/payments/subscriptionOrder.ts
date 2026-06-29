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

export type ConfirmPaymentResult = {
  ok: boolean;
  message?: string;
  accountStatus?: string;
  redirectTo?: string;
  invoiceNumber?: string;
  kind?: 'subscription' | 'credits';
  creditBalance?: number;
  creditsGranted?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** After Cashfree modal success — activates subscription, invoice, emails (server-side). */
export async function confirmSubscriptionPayment(
  orderId: string,
  token: string,
  options?: { maxAttempts?: number; delayMs?: number }
): Promise<ConfirmPaymentResult> {
  const maxAttempts = options?.maxAttempts ?? 10;
  const delayMs = options?.delayMs ?? 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${API_URL}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const json = await res.json();
    const data = (json.data ?? json) as Record<string, unknown>;

    if (res.ok && json.success) {
      const processed = Boolean(data.processed || data.alreadyCompleted);
      const accountStatus = String(data.accountStatus || '');
      const creditsGranted = Number(data.creditsGranted || 0);
      const creditBalance = data.creditBalance !== undefined ? Number(data.creditBalance) : undefined;

      if (processed && (creditsGranted > 0 || creditBalance !== undefined)) {
        return {
          ok: true,
          kind: 'credits',
          creditsGranted,
          creditBalance,
        };
      }

      if (processed && (accountStatus === 'active' || data.alreadyCompleted)) {
        return {
          ok: true,
          kind: 'subscription',
          accountStatus,
          redirectTo: String(data.redirectTo || '/projects?setup=1'),
          invoiceNumber: data.invoiceNumber ? String(data.invoiceNumber) : undefined,
        };
      }
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    message:
      'Payment received but activation is still processing. Please wait a moment and refresh, or contact support with your order ID.',
  };
}

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
