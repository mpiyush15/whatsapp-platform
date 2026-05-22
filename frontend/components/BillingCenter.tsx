"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, FileText, IndianRupee, RefreshCw, Wallet } from "lucide-react";
import { BuyCreditModal } from "@/components/BuyCreditModal";
import { emitCreditsRefresh } from "@/lib/hooks/useCreditBalance";

type Subscription = {
  _id: string;
  planName?: string;
  billingCycle?: string;
  status?: string;
  renewalDate?: string;
  amount?: number;
  currency?: string;
};

type Payment = {
  _id: string;
  amount: number;
  planName?: string;
  billingCycle?: string;
  status?: string;
  orderId?: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  createdAt?: string;
};

type CreditLedgerEntry = {
  _id: string;
  entryType: string;
  amount: number;
  signedAmount?: number;
  balanceAfter?: number;
  note?: string;
  referenceId?: string;
  status?: string;
  createdAt?: string;
};

type CreditPayload = {
  creditBalance: number;
  ledger: CreditLedgerEntry[];
};

type UsageMetric = {
  resource: string;
  used: number;
  limit: number | null;
  usagePercentage: number;
  remaining: number | null;
  exceeded: boolean;
  nearLimit: boolean;
};

type UsagePayload = {
  isInternal: boolean;
  creditBalance?: number | null;
  messagesQuotaExhausted?: boolean;
  billingHint?: string | null;
  metrics: {
    messagesPerDay: UsageMetric;
    messagesPerMonth?: UsageMetric;
    contacts: UsageMetric;
    phoneNumbers: UsageMetric;
  };
  cta?: {
    upgrade?: string;
    topup?: string;
  };
};

type Props = {
  projectId?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

function formatCurrency(value?: number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function normalizeCycle(value?: string) {
  if (!value) return "monthly";
  const v = value.toLowerCase();
  if (v === "annual") return "yearly";
  return v;
}

export default function BillingCenter({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState<CreditPayload>({ creditBalance: 0, ledger: [] });
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [buyCreditModalOpen, setBuyCreditModalOpen] = useState(false);

  const checkoutHref = projectId ? `/checkout?projectId=${projectId}` : "/checkout";
  const subscriptionHref = projectId ? `/projects/${projectId}/subscriptions` : "/dashboard/features/subscriptions";
  const isInternal = usage?.isInternal === true;
  const messagesMetric = usage?.metrics?.messagesPerMonth || usage?.metrics?.messagesPerDay;
  const messagesQuotaExhausted = usage?.messagesQuotaExhausted === true || messagesMetric?.exceeded === true;

  const invoices = useMemo(() => {
    return payments
      .filter((payment) => payment.status !== "pending")
      .map((payment, index) => ({
        id: payment._id,
        invoiceNumber: payment.invoiceNumber || `INV-${String(index + 1).padStart(5, "0")}`,
        amount: payment.amount,
        date: payment.createdAt,
        status: payment.status,
        orderId: payment.orderId,
      }));
  }, [payments]);

  async function fetchApi(path: string) {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();
    if (!response.ok || !json?.success) {
      throw new Error(json?.error || json?.message || `Failed request: ${path}`);
    }

    return json?.data;
  }

  async function loadBillingData() {
    setLoading(true);
    setError(null);

    try {
      const [subscriptionRes, paymentRes, creditsRes, usageRes] = await Promise.all([
        fetchApi("/subscriptions/my-subscriptions"),
        fetchApi("/subscriptions/payments?status=completed"),
        fetchApi("/subscriptions/credits?limit=20&offset=0"),
        fetchApi("/subscriptions/usage"),
      ]);

      const subscriptions = Array.isArray(subscriptionRes?.subscriptions)
        ? subscriptionRes.subscriptions
        : [];

      setSubscription(subscriptions[0] || null);
      setPayments(Array.isArray(paymentRes?.payments) ? paymentRes.payments : []);
      setCredits({
        creditBalance: Number(creditsRes?.creditBalance || 0),
        ledger: Array.isArray(creditsRes?.ledger) ? creditsRes.ledger : [],
      });
      setUsage(usageRes || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Billing Center</h1>
            <p className="text-sm text-slate-600">Subscription, payments, invoices, and credit ledger in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadBillingData}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {!isInternal && (
              <button
                onClick={() => setBuyCreditModalOpen(true)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Top Up Credits
              </button>
            )}
            {!isInternal && (
              <Link href={checkoutHref} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {isInternal && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
            <Building2 className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Internal account — billing not applicable</p>
              <p className="text-xs text-indigo-700 mt-0.5">This organisation is marked as internal. All limits are unlimited and payment actions are disabled.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Current Plan</div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <CreditCard className="h-5 w-5 text-blue-600" />
              {subscription?.planName || "No active plan"}
            </div>
            <div className="mt-1 text-sm text-slate-600 capitalize">
              {normalizeCycle(subscription?.billingCycle)} • {subscription?.status || "inactive"}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Next Renewal</div>
            <div className="text-lg font-bold text-slate-900">{formatDate(subscription?.renewalDate)}</div>
            <div className="mt-1 text-sm text-slate-600">Auto-managed by billing lifecycle</div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Credit Balance</div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Wallet className="h-5 w-5 text-emerald-600" />
              {credits.creditBalance}
            </div>
            <div className="mt-1 text-sm text-slate-600">{credits.ledger.length} recent ledger entries</div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices</div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileText className="h-5 w-5 text-violet-600" />
              {invoices.length}
            </div>
            <div className="mt-1 text-sm text-slate-600">Derived from successful payments</div>
          </div>
        </div>

        {usage?.metrics ? (
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Usage Limits</h2>
              <span className="text-xs text-slate-500">Auto-refreshed from subscription quota</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: "Messages / month (included)", data: messagesMetric || usage.metrics.messagesPerDay },
                { label: "Contacts", data: usage.metrics.contacts },
                { label: "Phone numbers", data: usage.metrics.phoneNumbers },
              ].map(({ label, data }) => (
                <div key={label} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {data.used}
                    {data.limit === null ? " / Unlimited" : ` / ${data.limit}`}
                  </div>
                  {data.limit !== null ? (
                    <>
                      <div className="mt-2 h-2 w-full rounded bg-slate-100">
                        <div
                          className={`h-2 rounded ${data.exceeded ? "bg-red-500" : data.nearLimit ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, data.usagePercentage)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{data.usagePercentage}% used</div>
                    </>
                  ) : (
                    <div className="mt-2 text-xs text-emerald-600">Internal account (unlimited)</div>
                  )}
                </div>
              ))}
            </div>

            {(messagesMetric?.nearLimit || usage.metrics.contacts.nearLimit || usage.metrics.phoneNumbers.nearLimit) && !messagesQuotaExhausted ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                You are nearing one or more plan limits. 
                <Link href={usage.cta?.upgrade || '/dashboard/features/billing'} className="ml-1 font-semibold underline">
                  Upgrade plan
                </Link>
                <span className="mx-1">or</span>
                <button type="button" onClick={() => setBuyCreditModalOpen(true)} className="font-semibold underline">
                  top up credits
                </button>
                .
              </div>
            ) : null}
          </div>
        ) : null}

        {!isInternal && <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <section className="rounded-xl border bg-white">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No payment records found.</td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment._id} className="border-t">
                          <td className="px-4 py-3">{formatDate(payment.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{payment.orderId || "-"}</td>
                          <td className="px-4 py-3 capitalize">{payment.planName || "-"} ({normalizeCycle(payment.billingCycle)})</td>
                          <td className="px-4 py-3">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold capitalize text-emerald-700">
                              {payment.status || "completed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border bg-white">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Invoice List</h2>
              </div>
              <div className="divide-y">
                {invoices.length === 0 && !loading ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">No invoices available yet.</div>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-slate-500">Order: {invoice.orderId || "-"} • {formatDate(invoice.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</div>
                        <div className="text-xs capitalize text-slate-500">{invoice.status || "paid"}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Credit Ledger</h2>
            </div>
            <div className="max-h-[680px] divide-y overflow-auto">
              {credits.ledger.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No ledger entries found.</div>
              ) : (
                credits.ledger.map((entry) => {
                  const delta = Number(entry.signedAmount ?? entry.amount ?? 0);
                  const isPositive = delta >= 0;

                  return (
                    <div key={entry._id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium capitalize text-slate-900">{entry.entryType.replace(/_/g, " ")}</div>
                          <div className="text-xs text-slate-500">{formatDate(entry.createdAt)} • {entry.status || "posted"}</div>
                          {entry.note ? <div className="mt-1 text-xs text-slate-600">{entry.note}</div> : null}
                        </div>
                        <div className={`text-sm font-semibold ${isPositive ? "text-emerald-700" : "text-red-700"}`}>
                          {isPositive ? "+" : ""}{delta}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Ref: {entry.referenceId || "-"}</span>
                        <span>Balance: {entry.balanceAfter ?? "-"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>}

        {!isInternal && (
          <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Need plan controls?</span>{" "}
            <Link href={subscriptionHref} className="font-medium text-blue-600 hover:text-blue-700">
              Open subscription management
            </Link>
            <span> or </span>
            <Link href={checkoutHref} className="font-medium text-blue-600 hover:text-blue-700">
              start a new checkout
            </Link>
            .
          </div>
        )}

        <BuyCreditModal
          isOpen={buyCreditModalOpen}
          onClose={() => setBuyCreditModalOpen(false)}
          currentCredits={credits.creditBalance}
          projectId={projectId}
          onSuccess={() => {
            emitCreditsRefresh();
            loadBillingData();
            setTimeout(() => {
              emitCreditsRefresh();
              loadBillingData();
            }, 3000);
          }}
        />
      </div>
    </div>
  );
}
