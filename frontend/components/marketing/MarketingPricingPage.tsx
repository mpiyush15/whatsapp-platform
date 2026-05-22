'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { PlanAgreementModal } from '@/components/PlanAgreementModal';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { PlanComparisonTable } from '@/components/pricing/PlanComparisonTable';
import {
  fetchPricingFeatureMatrix,
  PRODUCT_LINE_LABELS,
  type PricingFeatureMatrix,
  type ProductLine,
} from '@/lib/pricing/planCatalog';
import {
  signupUrl,
  fetchPublicPricingPlans,
  formatInr,
  planCardHighlights,
  planDisplayPrice,
  type BillingCycle,
  type PublicPricingPlan,
} from '@/lib/pricing/publicPlans';

const PRODUCT_TABS: { id: ProductLine; tagline: string }[] = [
  {
    id: 'whatsapp',
    tagline: 'Broadcasts, live chat, campaigns, and official WhatsApp API.',
  },
  {
    id: 'healthcare',
    tagline: 'Patients, appointments, prescriptions, billing, and clinic analytics.',
  },
];

export function MarketingPricingPage() {
  const [productLine, setProductLine] = useState<ProductLine>('whatsapp');
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [matrix, setMatrix] = useState<PricingFeatureMatrix | null>(null);
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
        const [planList, matrixData] = await Promise.all([
          fetchPublicPricingPlans(productLine),
          fetchPricingFeatureMatrix(productLine),
        ]);
        if (!cancelled) {
          setPlans(planList);
          setMatrix(matrixData);
        }
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
  }, [productLine]);

  const startCheckout = useCallback((plan: PublicPricingPlan) => {
    setSelectedPlan(plan);
    setAgreementOpen(true);
  }, []);

  const confirmCheckout = useCallback(() => {
    if (!selectedPlan) return;
    window.location.href = signupUrl(selectedPlan, billingCycle);
  }, [selectedPlan, billingCycle]);

  const billingNote =
    billingCycle === 'annual' ? 'Prices shown as monthly equivalent (annual billing)' : 'Billed monthly';

  return (
    <>
      <MarketingNavbar />
      <main className="marketing-hero-bg relative min-h-screen pt-20 sm:pt-24">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">Pricing</p>
            <h1 className="marketing-hero-title mt-3 text-balance text-[#111111]">
            
              
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">
              Pick a plan, sign up, and pay securely
            </p>

            <div className="mt-8 inline-flex border border-black/[0.12] bg-white">
              {PRODUCT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductLine(tab.id)}
                  className={`border-r border-black/[0.12] px-6 py-2.5 text-sm font-semibold transition last:border-r-0 ${
                    productLine === tab.id
                      ? 'bg-[#128c7e] text-white'
                      : 'bg-white text-[#52525b] hover:bg-[#fafafa]'
                  }`}
                >
                  {PRODUCT_LINE_LABELS[tab.id]}
                </button>
              ))}
            </div>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#71717a]">
              {PRODUCT_TABS.find((t) => t.id === productLine)?.tagline}
            </p>

            <div className="mt-6 inline-flex border border-black/[0.12] bg-white">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`border-r border-black/[0.12] px-5 py-2 text-sm font-semibold transition ${
                  billingCycle === 'monthly' ? 'bg-[#111111] text-white' : 'text-[#52525b] hover:bg-[#fafafa]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 text-sm font-semibold transition ${
                  billingCycle === 'annual' ? 'bg-[#111111] text-white' : 'text-[#52525b] hover:bg-[#fafafa]'
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
              <p className="text-sm">Loading {PRODUCT_LINE_LABELS[productLine]} plans…</p>
            </div>
          ) : null}

          {!loading && plans.length === 0 && !error ? (
            <p className="mt-16 text-center text-[#6d6c6b]">
              No public {PRODUCT_LINE_LABELS[productLine].toLowerCase()} plans yet. Check back soon.
            </p>
          ) : null}

          {!loading && plans.length > 0 ? (
            <>
              <div className="mx-auto mt-12 flex max-w-6xl flex-wrap justify-center gap-6">
                {plans.map((plan, i) => {
                  const price = planDisplayPrice(plan, billingCycle);
                  return (
                    <motion.article
                      key={plan._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative flex w-full max-w-[300px] flex-col items-center border bg-white p-6 text-center shadow-[0_8px_30px_rgba(17,17,17,0.06)] ${
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
                      </div>
                      <ul className="mt-4 w-full flex-1 space-y-2 text-left">
                        {planCardHighlights(plan, productLine).map((item) => (
                          <li key={item.label} className="flex justify-between gap-2 text-sm text-[#3f3f46]">
                            <span className="text-[#6d6c6b]">{item.label}</span>
                            <span className="font-semibold tabular-nums text-[#111111]">{item.value}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => startCheckout(plan)}
                        className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition ${
                          plan.isPopular ? 'marketing-cta-primary text-white' : 'marketing-cta-outline-wa'
                        }`}
                      >
                        Get started
                      </button>
                    </motion.article>
                  );
                })}
              </div>

              {matrix && matrix.plans.length > 0 && matrix.rows.length > 0 ? (
                <div className="mt-16 w-full">
                  <h2 className="mb-2 text-center text-lg font-bold text-[#111111]">
                    Full plan comparison
                  </h2>
                  <p className="mb-6 text-center text-sm text-[#71717a]">
                    Usage limits, every feature, and per-message Meta charges (INR) — billed in addition to
                    your subscription.
                  </p>
                  <PlanComparisonTable
                    matrix={matrix}
                    billingCycle={billingCycle}
                    billingLabel={billingNote}
                    onChoosePlan={(_id, name) => {
                      const plan = plans.find((p) => p.name === name);
                      if (plan) startCheckout(plan);
                    }}
                  />
                </div>
              ) : null}

              <p className="mt-10 text-center text-xs text-[#a1a1aa]">
                Subscription covers platform access. WhatsApp message charges follow Meta categories above
                and are billed based on outbound volume.
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
