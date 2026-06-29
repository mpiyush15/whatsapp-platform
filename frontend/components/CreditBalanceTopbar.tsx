'use client';

import Link from 'next/link';
import { Wallet, AlertTriangle } from 'lucide-react';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';

type Props = {
  projectId?: string;
  className?: string;
};

export default function CreditBalanceTopbar({ projectId, className = '' }: Props) {
  const { creditBalance, messagesQuotaExhausted, isInternal, loading, error } = useCreditBalance();

  if (isInternal) return null;

  const billingHref = projectId
    ? `/projects/${projectId}/billing`
    : '/dashboard/features/billing';

  const isZero = creditBalance <= 0;
  const isLow = creditBalance > 0 && creditBalance < 50;
  const blocked = messagesQuotaExhausted && isZero;

  let tone = 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
  if (blocked) {
    tone = 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100';
  } else if (isLow || (messagesQuotaExhausted && isLow)) {
    tone = 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100';
  } else if (messagesQuotaExhausted) {
    tone = 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100';
  }

  const title = blocked
    ? 'Monthly quota used — add credits to send messages'
    : messagesQuotaExhausted
      ? 'Sending uses credits (plan messages used up)'
      : 'Replysys messaging credits';

  return (
    <Link
      href={billingHref}
      title={title}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${tone} ${className}`}
    >
      {blocked ? (
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline text-xs font-medium opacity-80">Credits</span>
      <span className="tabular-nums">
        {loading ? '…' : error ? '—' : creditBalance.toLocaleString('en-IN')}
      </span>
      {blocked && (
        <span className="hidden md:inline text-xs font-bold uppercase tracking-wide">Top up</span>
      )}
    </Link>
  );
}
