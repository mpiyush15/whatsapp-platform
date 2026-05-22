declare global {
  interface Window {
    Cashfree?: (opts: { mode: string }) => Promise<{
      checkout: (opts: {
        paymentSessionId: string;
        redirectTarget?: string;
      }) => Promise<{ paymentDetails?: unknown; error?: { message?: string } }>;
    }>;
  }
}

const CASHFREE_SDK = 'https://sdk.cashfree.com/js/v3/cashfree.js';

function cashfreeMode(): string {
  if (process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production') return 'production';
  if (process.env.NEXT_PUBLIC_CASHFREE_MODE === 'sandbox') return 'sandbox';
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

export async function loadCashfreeSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cashfree is only available in the browser');
  }
  if (window.Cashfree) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CASHFREE_SDK}"]`);
    if (existing) {
      const poll = () => {
        if (window.Cashfree) resolve();
        else setTimeout(poll, 100);
      };
      poll();
      setTimeout(() => reject(new Error('Cashfree SDK timeout')), 8000);
      return;
    }

    const script = document.createElement('script');
    script.src = CASHFREE_SDK;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    script.onload = () => {
      const poll = () => {
        if (window.Cashfree) resolve();
        else setTimeout(poll, 100);
      };
      poll();
      setTimeout(() => reject(new Error('Cashfree SDK timeout')), 8000);
    };
    document.body.appendChild(script);
  });
}

export type CashfreeCheckoutResult = {
  paid: boolean;
  error?: string;
};

export async function openCashfreeCheckout(paymentSessionId: string): Promise<CashfreeCheckoutResult> {
  await loadCashfreeSdk();
  if (!window.Cashfree) {
    return { paid: false, error: 'Payment gateway not available' };
  }

  const cashfree = await window.Cashfree({ mode: cashfreeMode() });
  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_modal',
  });

  if (result.error) {
    return { paid: false, error: result.error.message || 'Payment failed' };
  }

  if (result.paymentDetails) {
    return { paid: true };
  }

  return { paid: false, error: 'Payment was not completed' };
}
