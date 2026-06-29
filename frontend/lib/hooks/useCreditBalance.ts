'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/config/api';
import { authService } from '@/lib/auth';

export type CreditBalanceState = {
  creditBalance: number;
  messagesQuotaExhausted: boolean;
  isInternal: boolean;
  loading: boolean;
  error: string | null;
};

const CREDITS_REFRESH_EVENT = 'credits:refresh';

export function emitCreditsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CREDITS_REFRESH_EVENT));
  }
}

export function useCreditBalance() {
  const [state, setState] = useState<CreditBalanceState>({
    creditBalance: 0,
    messagesQuotaExhausted: false,
    isInternal: false,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    const user = authService.getCurrentUser();
    if (!user?.accountId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    if (user.type === 'internal') {
      setState({
        creditBalance: 0,
        messagesQuotaExhausted: false,
        isInternal: true,
        loading: false,
        error: null,
      });
      return;
    }

    const token = authService.getToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false, error: 'Not signed in' }));
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [creditsRes, usageRes] = await Promise.all([
        fetch(`${API_URL}/subscriptions/credits?limit=1&offset=0`, { headers }),
        fetch(`${API_URL}/subscriptions/usage`, { headers }),
      ]);

      const creditsJson = await creditsRes.json();
      const usageJson = await usageRes.json();

      const balance = Number(creditsJson?.data?.creditBalance ?? creditsJson?.creditBalance ?? 0);
      const usage = usageJson?.data ?? usageJson;
      const messagesMetric = usage?.metrics?.messagesPerMonth || usage?.metrics?.messagesPerDay;
      const exhausted =
        usage?.messagesQuotaExhausted === true ||
        (messagesMetric?.exceeded === true && Number(messagesMetric?.limit) > 0);

      setState({
        creditBalance: balance,
        messagesQuotaExhausted: exhausted,
        isInternal: usage?.isInternal === true,
        loading: false,
        error: null,
      });
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Could not load credits',
      }));
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    const onRefresh = () => load();
    window.addEventListener(CREDITS_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(CREDITS_REFRESH_EVENT, onRefresh);
    };
  }, [load]);

  return { ...state, refresh: load };
}
