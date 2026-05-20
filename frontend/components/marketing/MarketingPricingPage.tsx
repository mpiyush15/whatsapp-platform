'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Minus } from 'lucide-react';
import { PlanAgreementModal } from '@/components/PlanAgreementModal';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import {
  checkoutUrl,
  fetchPublicPricingPlans,
  formatInr,
  planDisplayPrice,
  type BillingCycle,
  type PublicPricingPlan,
} from '@/lib/pricing/publicPlans';

const LIMIT_LABELS: Record<string, string> = {
  messages: 'WhatsApp messages / mo',
  contacts: 'Contacts',
  campaigns: 'Campaigns',
  users: 'Team members',
  phoneNumbers: 'Business numbers',
  templates: 'Templates',
  apiCalls: 'API calls / mo',
  storageGB: 'Storage (GB)',
};

function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unlimited';
  return value.toLocaleString('en-IN');
}

export function MarketingPricingPage() {
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PublicPricingPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicPricingPlans();
        if (!cancelled) setPlans(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pricing');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const comparisonRows = useMemo(() => {
    const featureSet = new Set<string>();
    const limitKeys = new Set<string>();

    plans.forEach((plan) => {
      plan.featureList.forEach((f) => featureSet.add(f));
      Object.keys(plan.limits).forEach((k) => limitKeys.add(k));
    });

    const features = Array.from(featureSet);
    const limits = Array.from(limitKeys).filter((k) => LIMIT_LABELS[k]);

    return { features, limits };
  }, [plans]);

  const startCheckout = useCallback((plan: PublicPricingPlan) => {
    setSelectedPlan(plan);
    setAgreementOpen(true);
  }, []);

  const confirmCheckout = useCallback(() => {
    if (!selectedPlan) return;
    window.location.href = checkoutUrl(selectedPlan.name, billingCycle);
  }, [selectedPlan, billingCycle]);

  return (
    <>
      <MarketingNavbar />
      <main className="marketing-hero-bg relative min-h-screen pt-20 sm:pt-24">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">Pricing</p>
            <h1 className="marketing-hero-title mt-3 text-balance text-[#111111]">
              <span className="block">Simple plans.</span>
              <span className="text-gradient-marketing mt-1 block">Official WhatsApp API included.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">
              Pick a plan, agree to Meta onboarding requirements, then pay securely via Cashfree — same flow as always,
              now on the Replysys marketing site.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/90 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'monthly' ? 'bg-[#111111] text-white' : 'text-[#52525b] hover:text-[#111111]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'annual' ? 'bg-[#111111] text-white' : 'text-[#52525b] hover:text-[#111111]'
                }`}
              >
                Annual
                <span className="ml-1.5 text-[10px] font-bold text-emerald-600">Save more</span>
              </button>
            </div>
          </div>

          {error ? (
            <div className="mx-auto mt-10 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-16 flex flex-col items-center gap-3 text-[#6d6c6b]">
              <Loader2 className="h-8 w-8 animate-spin text-[#128c7e]" />
              <p className="text-sm">Loading plans…</p>
            </div>
          ) : null}

          {!loading && plans.length === 0 && !error ? (
            <p className="mt-16 text-center text-[#6d6c6b]">No public plans published yet. Check back soon.</p>
          ) : null}

          {!loading && plans.length > 0 ? (
            <>
              {/* Plan cards — mobile + top summary */}
              <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {plans.map((plan, i) => {
                  const price = planDisplayPrice(plan, billingCycle);
                  return (
                    <motion.article
                      key={plan._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_8px_30px_rgba(17,17,17,0.06)] ${
                        plan.isPopular ? 'border-[#128c7e]/40 ring-2 ring-[#25d366]/30' : 'border-black/[0.08]'
                      }`}
                    >
                      {plan.isPopular ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#128c7e] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Popular
                        </span>
                      ) : null}
                      <h2 className="text-xl font-bold text-[#111111]">{plan.name}</h2>
                      {plan.description ? (
                        <p className="mt-1 text-sm text-[#6d6c6b]">{plan.description}</p>
                      ) : null}
                      <div className="mt-5">
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-[#111111]">
                          {formatInr(price.main)}
                        </p>
                        <p className="text-xs text-[#71717a]">{price.sublabel}</p>
                        {price.yearlyTotal ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {formatInr(price.yearlyTotal)} billed yearly
                          </p>
                        ) : null}
                        {plan.setupFee > 0 ? (
                          <p className="mt-2 text-xs text-[#a1a1aa]">Setup fee {formatInr(plan.setupFee)}</p>
                        ) : null}
                      </div>
                      {(plan.signupCredits > 0 || plan.monthlyCredits > 0) && (
                        <ul className="mt-4 space-y-1 border-t border-black/[0.06] pt-4 text-xs text-[#52525b]">
                          {plan.signupCredits > 0 ? (
                            <li>₹{plan.signupCredits.toLocaleString('en-IN')} signup credits</li>
                          ) : null}
                          {plan.monthlyCredits > 0 ? (
                            <li>₹{plan.monthlyCredits.toLocaleString('en-IN')} / month platform credits</li>
                          ) : null}
                        </ul>
                      )}
                      <ul className="mt-4 flex-1 space-y-2">
                        {plan.featureList.slice(0, 5).map((f) => (
                          <li key={f} className="flex gap-2 text-sm text-[#3f3f46]">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#128c7e]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => startCheckout(plan)}
                        className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition ${
                          plan.isPopular
                            ? 'marketing-cta-primary text-white'
                            : 'marketing-cta-outline-wa'
                        }`}
                      >
                        Get started
                      </button>
                    </motion.article>
                  );
                })}
              </div>

              {/* Comparison table — desktop */}
              <div className="mt-16 hidden overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(17,17,17,0.06)] lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.08] bg-[#fafafa]">
                        <th className="w-[28%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a1a1aa]">
                          Compare plans
                        </th>
                        {plans.map((plan) => (
                          <th key={plan._id} className="px-4 py-4 text-center align-bottom">
                            <p className="text-base font-bold text-[#111111]">{plan.name}</p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-[#128c7e]">
                              {formatInr(planDisplayPrice(plan, billingCycle).main)}
                              <span className="text-xs font-normal text-[#71717a]">/mo</span>
                            </p>
                            <button
                              type="button"
                              onClick={() => startCheckout(plan)}
                              className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold ${
                                plan.isPopular ? 'marketing-cta-primary text-white' : 'marketing-cta-outline-wa'
                              }`}
                            >
                              Choose plan
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.limits.map((key) => (
                        <tr key={key} className="border-b border-black/[0.04]">
                          <td className="px-5 py-3 font-medium text-[#52525b]">{LIMIT_LABELS[key] ?? key}</td>
                          {plans.map((plan) => (
                            <td key={`${plan._id}-${key}`} className="px-4 py-3 text-center tabular-nums text-[#3f3f46]">
                              {formatLimit(plan.limits[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {comparisonRows.features.length > 0 ? (
                        <tr className="bg-[#fafafa]">
                          <td
                            colSpan={plans.length + 1}
                            className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a1aa]"
                          >
                            Features
                          </td>
                        </tr>
                      ) : null}
                      {comparisonRows.features.map((feature) => (
                        <tr key={feature} className="border-b border-black/[0.04]">
                          <td className="px-5 py-3 text-[#52525b]">{feature}</td>
                          {plans.map((plan) => {
                            const included = plan.featureList.includes(feature);
                            return (
                              <td key={`${plan._id}-${feature}`} className="px-4 py-3 text-center">
                                {included ? (
                                  <Check className="mx-auto h-4 w-4 text-[#128c7e]" />
                                ) : (
                                  <Minus className="mx-auto h-4 w-4 text-[#d4d4d8]" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-10 text-center text-xs text-[#a1a1aa]">
                Meta conversation fees are billed separately per category. Platform credits shown above apply to Replysys
                usage where configured.
              </p>
            </>
          ) : null}
        </section>
      </main>

      <PlanAgreementModal
        isOpen={agreementOpen}
        planName={selectedPlan?.name ?? ''}
        onClose={() => {
          setAgreementOpen(false);
          setSelectedPlan(null);
        }}
        onConfirm={confirmCheckout}
      />
    </>
  );
}
