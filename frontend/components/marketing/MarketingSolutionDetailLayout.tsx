'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, type LucideIcon } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import { MarketingBroadcastDashboardMock } from '@/components/marketing/MarketingBroadcastDashboardMock';
import { MarketingCampaignsDashboardMock } from '@/components/marketing/MarketingCampaignsDashboardMock';
import { MarketingLiveChatDashboardMock } from '@/components/marketing/MarketingLiveChatDashboardMock';
import { MarketingSalesAnalyticsDashboardMock } from '@/components/marketing/MarketingSalesAnalyticsDashboardMock';
import { MarketingAgenciesDashboardMock } from '@/components/marketing/MarketingAgenciesDashboardMock';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

export type SolutionSectionVisualId =
  | 'hero'
  | 'problem'
  | 'helps'
  | 'proof'
  | 'modules'
  | 'workflow'
  | 'honesty';

type MarketingSolutionDetailLayoutProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
  /** Override default “All solutions” back link (e.g. industry hub) */
  backLink?: { href: string; label: string };
  /** Replace default centered hero (e.g. ecommerce split + illustration) */
  heroOverride?: ReactNode;
  /** Replace default modules checklist + visuals (e.g. ecommerce playbook split) */
  modulesOverride?: ReactNode;
  /** Cropped UI cards per section (e.g. education industry page) */
  sectionVisuals?: Partial<Record<SolutionSectionVisualId, ReactNode>>;
};

function ProofMock({ type }: { type: SolutionDetailPageData['proofMock'] }) {
  if (type === 'broadcast') return <MarketingBroadcastDashboardMock />;
  if (type === 'liveChat') return <MarketingLiveChatDashboardMock />;
  if (type === 'salesAnalytics') return <MarketingSalesAnalyticsDashboardMock />;
  if (type === 'agencyPortfolio') return <MarketingAgenciesDashboardMock />;
  return <MarketingCampaignsDashboardMock />;
}

function SolutionHeroIconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="marketing-icon-wa inline-flex h-12 w-12 items-center justify-center rounded-xl border border-black/[0.06] bg-white/80 shadow-sm">
      <Icon className="h-6 w-6" strokeWidth={1.75} />
    </span>
  );
}

export function MarketingSolutionDetailLayout({
  page,
  onBookDemo,
  backLink,
  heroOverride,
  modulesOverride,
  sectionVisuals,
}: MarketingSolutionDetailLayoutProps) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const showBack = !page.hero.hideBackLink;
  const showHeroIcon = !page.hero.hideIcon;
  const showEyebrow = !page.hero.hideEyebrow;
  const compactHeroTop = page.hero.hideBackLink && page.hero.hideIcon && page.hero.hideEyebrow;
  const backHref = backLink?.href ?? '/marketing/solutions';
  const backLabel = backLink?.label ?? 'All solutions';

  return (
    <>
      {heroOverride ?? (
      <main className="marketing-hero-bg relative flex flex-col pt-20 sm:pt-24">
        <section
          className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:max-w-6xl sm:px-8 ${
            compactHeroTop ? 'py-8 sm:py-10' : 'py-10 sm:py-14'
          }`}
        >
          {showBack ? (
            <Link
              href={backHref}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#6d6c6b] transition hover:text-[#111111]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`flex flex-col items-center ${compactHeroTop ? 'gap-5 sm:gap-6' : 'gap-8'}`}
          >
            {showHeroIcon ? <SolutionHeroIconTile icon={page.icon} /> : null}

            {showEyebrow ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 py-2 text-[11px] font-medium tracking-[0.12em] shadow-sm">
                <span className="marketing-badge-dot--wa h-2 w-2 rounded-full" aria-hidden />
                <span className="marketing-text-wa uppercase">{page.hero.eyebrow}</span>
              </div>
            ) : null}

            {page.hero.kicker ? (
              <p className="max-w-xl text-sm font-medium italic leading-relaxed text-[#52525b] sm:text-[1.05rem]">
                {page.hero.kicker}
              </p>
            ) : null}

            <h1 className="marketing-hero-title marketing-hero-title--solutions w-full text-balance text-[#111111]">
              <span className="block">{page.hero.title}</span>
              <span className="text-gradient-marketing mt-1.5 block">{page.hero.titleHighlight}</span>
            </h1>

            <p className="max-w-3xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">{page.hero.subtitle}</p>

            {page.hero.outcomeStrip && page.hero.outcomeStrip.length > 0 ? (
              <div className="flex max-w-3xl flex-wrap justify-center gap-2">
                {page.hero.outcomeStrip.map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-black/[0.08] bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#52525b] shadow-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onBookDemo}
                className="marketing-cta-primary h-12 w-full rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {page.hero.ctaBookDemo}
              </button>
              <Link
                href="/auth/register"
                className="marketing-cta-outline-wa flex h-12 w-full items-center justify-center rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {page.hero.ctaGetStarted}
              </Link>
            </div>
          </motion.div>
          {sectionVisuals?.hero ? (
            <div className="w-full max-w-5xl px-0">{sectionVisuals.hero}</div>
          ) : null}
        </section>
      </main>
      )}

      <MarketingSection
        id="problem"
        eyebrow={page.problem.eyebrow}
        title={page.problem.title}
        titleHighlight={page.problem.titleHighlight}
        subtitle={page.problem.subtitle}
        tone="whisper"
      >
        {page.problem.lead ? (
          <p className="mx-auto mb-8 max-w-2xl text-center text-base font-medium leading-relaxed text-[#3f3f46]">
            {page.problem.lead}
          </p>
        ) : null}
        <ul className="mx-auto max-w-2xl space-y-4 text-left">
          {page.problem.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-[#52525b] sm:text-base">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ea580c]" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
        {sectionVisuals?.problem}
      </MarketingSection>

      <MarketingSection
        id="how-replysys-helps"
        eyebrow={page.helps.eyebrow}
        title={page.helps.title}
        titleHighlight={page.helps.titleHighlight}
        subtitle={page.helps.subtitle}
        tone="light"
        accent="whatsapp"
      >
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {page.helps.bullets.map((item, i) => {
            const border =
              i === 0 ? 'border-l-orange-500' : i === 1 ? 'border-l-sky-500' : 'border-l-violet-500';
            return (
              <div key={item.title} className={`border-l-4 ${border} pl-5 text-left`}>
                {item.angle ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a1a1aa]">{item.angle}</p>
                ) : null}
                <p className="mt-1 text-base font-semibold text-[#111111]">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6d6c6b]">{item.body}</p>
              </div>
            );
          })}
        </div>
        {sectionVisuals?.helps}
      </MarketingSection>

      <section className="bg-[#f4f3ef] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {page.proof ? (
            <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-10 lg:gap-y-0 xl:gap-x-12">
              <div className="text-left lg:col-span-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">{page.proof.eyebrow}</p>
                <h2 className="marketing-hero-title mt-3 text-[1.65rem] text-[#111111] sm:text-[1.85rem] lg:text-[1.75rem] xl:text-3xl">
                  <span className="block">{page.proof.title}</span>
                  <span className="text-gradient-marketing mt-2 block">{page.proof.titleHighlight}</span>
                </h2>
                {page.proof.subtitle ? (
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6d6c6b] sm:text-base">{page.proof.subtitle}</p>
                ) : null}
              </div>
              <div className="min-w-0 lg:col-span-7">
                {sectionVisuals?.proof ?? <ProofMock type={page.proofMock} />}
              </div>
            </div>
          ) : sectionVisuals?.proof ? (
            sectionVisuals.proof
          ) : (
            <>
              <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">
                Replysys in action
              </p>
              <div className="mx-auto max-w-3xl">
                <ProofMock type={page.proofMock} />
              </div>
            </>
          )}
        </div>
      </section>

      <MarketingSection
        id="modules"
        eyebrow={page.modules.eyebrow}
        title={page.modules.title}
        titleHighlight={page.modules.titleHighlight}
        tone="whisper"
        accent="whatsapp"
      >
        {modulesOverride ?? (
          <>
            <ul className="mx-auto flex max-w-xl flex-col gap-3">
              {page.modules.items.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-[#3f3f46] sm:text-base">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {item.label}
                  {!item.shipped ? (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-amber-700">Soon</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {sectionVisuals?.modules}
          </>
        )}
      </MarketingSection>

      <MarketingSection
        id="workflow"
        eyebrow={page.workflow.eyebrow}
        title={page.workflow.title}
        titleHighlight={page.workflow.titleHighlight}
        subtitle={page.workflow.subtitle}
        tone="light"
      >
        <ol className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {page.workflow.steps.map((step, i) => (
            <li key={step.title} className="relative text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-violet-100 text-xs font-bold text-[#27272a] ring-1 ring-black/[0.06]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-[#111111]">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6d6c6b]">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {sectionVisuals?.workflow}
      </MarketingSection>

      <MarketingSection
        id="honesty"
        eyebrow={page.honesty.eyebrow}
        title={page.honesty.title}
        titleHighlight={page.honesty.titleHighlight}
        subtitle={page.honesty.subtitle}
        tone="whisper"
      >
        <div className="mx-auto grid max-w-3xl gap-10 sm:grid-cols-2 sm:gap-12">
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Shipped today</p>
            <ul className="mt-4 space-y-2">
              {page.honesty.shipped.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-[#52525b]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {page.honesty.roadmap.length > 0 ? (
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">On the roadmap</p>
              <ul className="mt-4 space-y-2">
                {page.honesty.roadmap.map((item) => (
                  <li key={item} className="text-sm text-[#6d6c6b]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {sectionVisuals?.honesty}
      </MarketingSection>

      <MarketingSection
        id="faq"
        eyebrow={page.faqIntro?.eyebrow ?? 'FAQ'}
        title={page.faqIntro?.title ?? 'Common questions'}
        titleHighlight={page.faqIntro?.titleHighlight ?? 'for this motion'}
        subtitle={page.faqIntro?.subtitle}
        tone="light"
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {page.faq.map((item, i) => {
            const open = faqOpen === i;
            return (
              <div key={item.q} className="marketing-faq-item overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => setFaqOpen(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className="font-semibold text-[#111111]">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-black/[0.06] px-5 pb-4 pt-2 text-sm leading-relaxed text-[#6d6c6b]">
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </MarketingSection>

      <section id="solution-cta" className="border-t border-black/[0.06] bg-white py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <WhatsAppIcon className="marketing-icon-wa mx-auto h-10 w-10" />
          <h2 className="marketing-hero-title mt-5 text-[2rem] text-[#111111] sm:text-4xl">
            <span className="block">{page.cta.title}</span>
            <span className="text-gradient-marketing mt-1.5 block">{page.cta.titleHighlight}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#6d6c6b]">{page.cta.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onBookDemo}
              className="marketing-cta-primary h-12 rounded-xl px-8 text-sm font-semibold"
            >
              {page.cta.primary}
            </button>
            <Link
              href={page.cta.secondaryHref}
              className="marketing-cta-outline-wa flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold"
            >
              {page.cta.secondary}
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
