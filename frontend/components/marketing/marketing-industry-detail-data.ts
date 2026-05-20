'use client';

import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  ShoppingBag,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import type { SolutionDetailPageData, SolutionDetailProofMock } from '@/components/marketing/marketing-solution-detail-data';

type IndustryBuildInput = {
  slug: string;
  icon: LucideIcon;
  proofMock: SolutionDetailProofMock;
  hero: Omit<SolutionDetailPageData['hero'], 'ctaBookDemo' | 'ctaGetStarted'>;
  problem: SolutionDetailPageData['problem'];
  helps: SolutionDetailPageData['helps'];
  proof: SolutionDetailPageData['proof'];
  modules: SolutionDetailPageData['modules'];
  workflow: SolutionDetailPageData['workflow'];
  honesty: SolutionDetailPageData['honesty'];
  faq: SolutionDetailPageData['faq'];
  cta?: Partial<SolutionDetailPageData['cta']>;
  faqIntro?: SolutionDetailPageData['faqIntro'];
};

function buildIndustry(input: IndustryBuildInput): SolutionDetailPageData {
  return {
    slug: input.slug,
    icon: input.icon,
    hero: {
      ctaBookDemo: 'See it on a live walkthrough',
      ctaGetStarted: 'Get started on Replysys',
      hideBackLink: true,
      hideIcon: true,
      hideEyebrow: true,
      ...input.hero,
    },
    problem: input.problem,
    helps: input.helps,
    proofMock: input.proofMock,
    proof: input.proof,
    modules: input.modules,
    workflow: input.workflow,
    honesty: input.honesty,
    faq: input.faq,
    faqIntro: input.faqIntro ?? {
      eyebrow: 'FAQ',
      title: 'Common questions',
      titleHighlight: 'for this vertical',
      subtitle: 'Straight answers — no inflated stats.',
    },
    cta: {
      title: 'Ready to run this',
      titleHighlight: 'playbook on Replysys?',
      subtitle: 'Book a walkthrough for your team or start with inbox, templates, and campaigns on the official WhatsApp Cloud API.',
      primary: 'Book a walkthrough',
      secondary: 'See plans',
      secondaryHref: '/pricing',
      ...input.cta,
    },
  };
}

export const healthcareIndustryDetail = buildIndustry({
  slug: 'healthcare',
  icon: HeartPulse,
  proofMock: 'liveChat',
  hero: {
    eyebrow: 'Healthcare & clinics · WhatsApp Cloud API',
    kicker: 'Patient communication where families already respond — with clinic-grade workflows on one number.',
    title: 'Fewer no-shows,',
    titleHighlight: 'stronger patient follow-through',
    subtitle:
      'Replysys helps clinics run appointment reminders, prescription follow-ups, lab result nudges, and care-team inbox on Meta’s official stack — so front desk stops living on personal phones.',
    outcomeStrip: ['Appointment reminders', 'Digital Rx handoff', 'Lab result follow-ups', 'One clinic number'],
  },
  problem: {
    eyebrow: 'Clinic operations',
    title: 'Revenue and care suffer when',
    titleHighlight: 'WhatsApp is informal',
    subtitle: 'High no-show rates and missed follow-ups are often a communication problem, not a clinical one.',
    lead: 'Patients expect WhatsApp updates; without automation and ownership, clinics lose slots and repeat visits.',
    bullets: [
      'No-show rates spike when reminders are manual calls or easy-to-ignore SMS',
      'Prescriptions and lab results sit in email while patients message the front desk on personal numbers',
      'Staff hours burn on repetitive reminder calls instead of in-clinic care',
      'Leadership cannot see who answered which patient thread or what was promised',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps clinics',
    title: 'Patient journeys',
    titleHighlight: 'on one business number',
    subtitle: 'Automate the repetitive; keep humans in the loop for care decisions.',
    bullets: [
      {
        title: 'Appointment reminders that convert',
        angle: 'No-shows',
        body: '24h and 1h reminders with reschedule shortcuts — patients confirm or move slots without another phone tree.',
      },
      {
        title: 'Prescriptions & instructions in-thread',
        angle: 'Compliance',
        body: 'Send dosage, pharmacy links, and post-visit care notes on WhatsApp with audit-friendly history in Replysys.',
      },
      {
        title: 'Lab results → follow-up booking',
        angle: 'Revenue',
        body: 'Notify when results are ready, attach context, and route abnormal cases to a care coordinator immediately.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Team inbox built',
    titleHighlight: 'for patient conversations',
    subtitle: 'Assign threads to front desk or coordinators, use templates after session reset, and keep PHI-handling discipline your compliance team expects.',
  },
  modules: {
    eyebrow: 'Healthcare playbook',
    title: 'What clinics run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Appointment reminder flows & broadcast lists', shipped: true },
      { label: 'Multi-agent inbox with assignment & notes', shipped: true },
      { label: 'Template library for utility & follow-up messages', shipped: true },
      { label: 'Patient segments for recall & wellness campaigns', shipped: true },
      { label: 'Deeper EMR sync & billing automations', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Clinic motion',
    title: 'From booking',
    titleHighlight: 'to follow-up revenue',
    steps: [
      { title: 'Capture the visit', body: 'Booking confirmations land in Replysys with patient context — not scattered chats.' },
      { title: 'Remind automatically', body: 'Scheduled templates reduce no-shows; reschedules update your team in one thread.' },
      { title: 'Deliver care instructions', body: 'Rx, prep, and post-op guidance sent in-session with read receipts your staff can trust.' },
      { title: 'Close the loop', body: 'Lab-ready pings and follow-up offers route to the right coordinator before the patient goes elsewhere.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    subtitle: 'We would rather you buy for shipped workflows than slide decks.',
    shipped: [
      'Official WhatsApp Cloud API onboarding',
      'Shared inbox, templates, flows, and broadcasts',
      'Healthcare-oriented reminder & follow-up playbooks',
    ],
    roadmap: ['Deeper clinic EMR connectors', 'Prescription PDF vault with retention policies'],
  },
  faq: [
    {
      q: 'Can we send appointment and lab updates on WhatsApp?',
      a: 'Yes — with approved utility templates and in-session messages. Replysys helps you categorize templates and stay inside Meta policy.',
    },
    {
      q: 'How do multiple front-desk agents share one clinic number?',
      a: 'Replysys routes inbound messages to a shared inbox with assignment, internal notes, and visibility for supervisors.',
    },
    {
      q: 'Is this only for large hospital chains?',
      a: 'No — single-location clinics and multi-branch groups both start on the same core inbox; scale agents and projects as you grow.',
    },
  ],
});

export const educationIndustryDetail = buildIndustry({
  slug: 'education',
  icon: GraduationCap,
  proofMock: 'broadcast',
  hero: {
    eyebrow: 'Education & edtech · WhatsApp Cloud API',
    kicker: 'Parents read WhatsApp — not another portal login.',
    title: 'Fees, admissions, and',
    titleHighlight: 'class updates that land',
    subtitle:
      'Replysys helps schools and edtech teams run fee reminders, admission follow-up, exam alerts, and parent broadcasts on one verified business number.',
    outcomeStrip: ['Fee reminders', 'Admission nurture', 'Parent broadcasts', 'Class announcements'],
  },
  problem: {
    eyebrow: 'Institution pressure',
    title: 'Revenue and trust leak when',
    titleHighlight: 'parents are out of the loop',
    subtitle: 'Email and paper notices do not match how families actually communicate.',
    bullets: [
      'Fee defaults climb when reminders are easy to miss or arrive too late',
      'Admission inquiries go cold without structured follow-up on WhatsApp',
      'Exam and attendance updates never reach parents at the right moment',
      'Staff spend hours on manual announcement calls and duplicate messages',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps institutes',
    title: 'Parent engagement',
    titleHighlight: 'without another app',
    subtitle: 'Meet families on the channel they already check dozens of times a day.',
    bullets: [
      {
        title: 'Smart fee reminders',
        angle: 'Collections',
        body: 'Automated nudges before due dates with payment links — fewer defaults without aggressive call centers.',
      },
      {
        title: 'Admission funnel on WhatsApp',
        angle: 'Growth',
        body: 'Instant replies to inquiries, campus tour scheduling, and template follow-ups when leads go quiet.',
      },
      {
        title: 'Class & exam broadcasts',
        angle: 'Engagement',
        body: 'Segment by grade or batch; confirm delivery with read receipts instead of hoping email was opened.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Broadcasts parents',
    titleHighlight: 'actually open',
    subtitle: 'Plan term-wide announcements, fee drives, and event invites with opt-in lists and template compliance baked in.',
  },
  modules: {
    eyebrow: 'Education playbook',
    title: 'What institutes run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Fee reminder campaigns & payment link templates', shipped: true },
      { label: 'Admission inquiry inbox with assignment', shipped: true },
      { label: 'Parent/student segments & broadcast lists', shipped: true },
      { label: 'Flows for FAQs, campus visits, and document collection', shipped: true },
      { label: 'Full SIS / LMS grade sync', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Institution motion',
    title: 'From inquiry',
    titleHighlight: 'to enrolled family',
    steps: [
      { title: 'Capture the lead', body: 'WhatsApp inquiries auto-tag source and grade interest for admissions.' },
      { title: 'Nurture with speed', body: 'Brochures, tour slots, and counselor handoff while the family is still comparing schools.' },
      { title: 'Onboard & inform', body: 'Welcome packs, fee schedules, and class channels on one business number.' },
      { title: 'Retain each term', body: 'Fee reminders, performance updates, and event invites without spamming personal phones.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Broadcasts, flows, and shared inbox for school ops',
      'Template sets for fees, admissions, and announcements',
      'Multi-project setup for groups with several campuses',
    ],
    roadmap: ['Native SIS mark sheets sync', 'Automated attendance → parent alerts from timetables'],
  },
  faq: [
    {
      q: 'Can we message parents who never opted in?',
      a: 'Meta requires opt-in for marketing-style messages. Replysys helps you collect consent and use the right template category for each send.',
    },
    {
      q: 'Does this work for coaching centers and edtech, not just schools?',
      a: 'Yes — same core inbox and campaigns; segments map to batches, courses, or cohorts however you run operations.',
    },
    {
      q: 'Can multiple campuses share one platform login?',
      a: 'Organizations can run separate projects per campus with shared templates and reporting at the org level.',
    },
  ],
});

export const ecommerceIndustryDetail = buildIndustry({
  slug: 'ecommerce',
  icon: ShoppingBag,
  proofMock: 'campaigns',
  hero: {
    eyebrow: 'E-commerce & D2C · WhatsApp Cloud API',
    kicker: 'Cart recovery and post-purchase support where open rates actually matter.',
    title: 'Recover carts and',
    titleHighlight: 'keep buyers coming back',
    subtitle:
      'Replysys connects order updates, abandoned-cart nudges, flash-sale broadcasts, and agent support on one WhatsApp business number — no more split between SMS, email, and DMs.',
    outcomeStrip: ['Cart recovery', 'Order status threads', 'Repeat-buyer campaigns', 'Agent support inbox'],
  },
  problem: {
    eyebrow: 'D2C friction',
    title: 'Margin disappears when',
    titleHighlight: 'buyers ghost mid-funnel',
    subtitle: 'Email and push cannot match WhatsApp for urgency and trust in India.',
    bullets: [
      'Carts abandon because recovery messages arrive late or in the wrong channel',
      'Order status questions flood support inboxes with no link to the Shopify order',
      'Repeat purchase campaigns are either spammy or impossible to personalize at scale',
      'Inventory and delivery surprises create chargebacks when updates are not instant',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps brands',
    title: 'Commerce loops',
    titleHighlight: 'on WhatsApp',
    subtitle: 'Treat WhatsApp as a revenue channel, not a support afterthought.',
    bullets: [
      {
        title: 'Cart recovery that feels human',
        angle: 'Conversion',
        body: 'Timed template nudges with product context and checkout links while intent is still warm.',
      },
      {
        title: 'Order lifecycle in one thread',
        angle: 'Support',
        body: 'Shipped, out-for-delivery, and delivered updates tied to the same conversation your agent sees.',
      },
      {
        title: 'Segments that buy again',
        angle: 'LTV',
        body: 'Opt-in lists for launches, back-in-stock, and VIP offers with engagement signals for the next send.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Campaigns & catalog',
    titleHighlight: 'motions together',
    subtitle: 'See which product drops drove replies and hand hot threads to agents without exporting CSVs.',
  },
  modules: {
    eyebrow: 'Commerce playbook',
    title: 'What D2C teams run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Abandoned-cart & order-update template sets', shipped: true },
      { label: 'Broadcasts with segment tags (VIP, churn-risk)', shipped: true },
      { label: 'Agent inbox with order notes & quick replies', shipped: true },
      { label: 'Flows for WISMO, returns, and sizing FAQs', shipped: true },
      { label: 'Deep Shopify two-way sync', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Store motion',
    title: 'From browse',
    titleHighlight: 'to repeat order',
    steps: [
      { title: 'Capture intent', body: 'Click-to-WhatsApp ads and on-site widgets drop shoppers into tagged threads.' },
      { title: 'Recover & convert', body: 'Cart sequences and agent takeover for high-AOV baskets.' },
      { title: 'Deliver transparency', body: 'Proactive shipping updates reduce “where is my order?” tickets.' },
      { title: 'Drive the next buy', body: 'Post-delivery review asks and launch broadcasts to opted-in buyers.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Campaigns, flows, inbox, and template governance',
      'Commerce-oriented playbook templates',
      'Webhook-friendly integrations for order events',
    ],
    roadmap: ['Native Shopify app with live inventory sync', 'COD confirmation flows with payment links'],
  },
  faq: [
    {
      q: 'Can we send cart recovery without getting blocked?',
      a: 'Use approved marketing templates to opted-in users. Replysys tracks consent and template status so ops does not guess.',
    },
    {
      q: 'Do agents see order history in the inbox?',
      a: 'Teams attach order IDs and notes in-thread today; deeper storefront sync is on the roadmap.',
    },
    {
      q: 'Does this replace email entirely?',
      a: 'No — WhatsApp complements email for high-intent moments. Most brands use both with WhatsApp owning urgency and support.',
    },
  ],
});

export const realestateIndustryDetail = buildIndustry({
  slug: 'realestate',
  icon: Home,
  proofMock: 'salesAnalytics',
  hero: {
    eyebrow: 'Real estate · WhatsApp Cloud API',
    kicker: 'Speed wins listings — WhatsApp is where Indian buyers expect answers first.',
    title: 'Qualify faster,',
    titleHighlight: 'close more site visits',
    subtitle:
      'Replysys centralizes property inquiries, broker assignment, brochure sends, and template follow-ups so no lead dies on a personal phone.',
    outcomeStrip: ['Instant lead routing', 'Brochure & site-visit flows', 'Broker accountability', 'Pipeline visibility'],
  },
  problem: {
    eyebrow: 'Brokerage friction',
    title: 'Deals slip when',
    titleHighlight: 'response is slow',
    subtitle: 'Buyers message five agents; the first credible reply often wins the visit.',
    bullets: [
      'Leads sit 24+ hours because inquiries land on individual phones without routing',
      'Brochures and floor plans get re-sent manually; version confusion slows decisions',
      'Site visits are hard to schedule without back-and-forth calls',
      'Sales heads cannot audit who followed up or which project lost the lead',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps brokerages',
    title: 'Lead discipline',
    titleHighlight: 'on one number',
    subtitle: 'Give every project a professional WhatsApp presence with broker accountability.',
    bullets: [
      {
        title: 'Sub-5-minute first response',
        angle: 'Speed',
        body: 'Round-robin or project-based assignment so the right broker owns the thread immediately.',
      },
      {
        title: 'Rich property shares in-thread',
        angle: 'Collateral',
        body: 'Send brochures, videos, and location pins; reuse approved template packs per township.',
      },
      {
        title: 'Visit scheduling & nurture',
        angle: 'Pipeline',
        body: 'Flows capture budget and timeline; template nudges re-engage cold leads before they buy elsewhere.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Pipeline signals',
    titleHighlight: 'brokers can run',
    subtitle: 'See which projects get inbound volume, who is slow to respond, and which threads need a site-visit push.',
  },
  modules: {
    eyebrow: 'Real estate playbook',
    title: 'What brokerages run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Project-wise numbers & broker assignment', shipped: true },
      { label: 'Lead capture flows (budget, location, timeline)', shipped: true },
      { label: 'Template follow-ups after session reset', shipped: true },
      { label: 'Manager view of open threads & SLAs', shipped: true },
      { label: 'MLS / CRM auto-sync', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Broker motion',
    title: 'From portal lead',
    titleHighlight: 'to registered visit',
    steps: [
      { title: 'Ingest the inquiry', body: '99acres, MagicBricks, or site widgets create a tagged thread in Replysys.' },
      { title: 'Qualify in minutes', body: 'Flows ask budget and possession timeline; hot leads ping the assigned broker.' },
      { title: 'Send proof & schedule', body: 'Brochures and visit slots in one conversation — no email black hole.' },
      { title: 'Nurture until close', body: 'Template sequences for payment-plan launches and construction updates.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Multi-broker inbox with assignment rules',
      'Template packs for site visits and follow-ups',
      'Broadcasts for new tower / phase launches',
    ],
    roadmap: ['CRM listing sync', 'Document collection flows for booking forms'],
  },
  faq: [
    {
      q: 'Can each project have its own WhatsApp number?',
      a: 'Yes — run separate projects or numbers per township while leadership keeps org-level visibility.',
    },
    {
      q: 'How do we stop brokers from taking leads offline?',
      a: 'Shared business numbers with assignment and audit history make handoffs visible to managers.',
    },
    {
      q: 'Does this work for rental and commercial teams too?',
      a: 'Same playbook — adjust flows for lease terms, fit-outs, or co-working tours.',
    },
  ],
});

export const foodBeverageIndustryDetail = buildIndustry({
  slug: 'food-beverage',
  icon: UtensilsCrossed,
  proofMock: 'broadcast',
  hero: {
    eyebrow: 'Food & beverage · WhatsApp Cloud API',
    kicker: 'Orders, pickup alerts, and loyalty on the app customers already use daily.',
    title: 'More orders,',
    titleHighlight: 'fewer missed pickups',
    subtitle:
      'Replysys helps restaurants and QSR chains send order status, pickup windows, table-ready pings, and opt-in offers on one compliant business number.',
    outcomeStrip: ['Order status updates', 'Pickup & table-ready alerts', 'Loyalty broadcasts', 'Outlet-level inbox'],
  },
  problem: {
    eyebrow: 'Restaurant ops',
    title: 'Kitchen margin leaks when',
    titleHighlight: 'updates are chaotic',
    subtitle: 'SMS costs add up; aggregator apps own the customer relationship.',
    bullets: [
      'Customers no-show for pickup because confirmations live in email or missed calls',
      'Promo blasts violate consent rules or get sent from personal staff phones',
      'Franchise outlets answer the same “where is my order?” question hundreds of times',
      'Loyalty programs fail when rewards are not delivered on a channel people open',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps F&B',
    title: 'Own the guest',
    titleHighlight: 'relationship',
    subtitle: 'Drive direct orders and repeat visits without fighting aggregator inboxes.',
    bullets: [
      {
        title: 'Order & pickup transparency',
        angle: 'Ops',
        body: 'Confirmed → preparing → ready messages cut support calls and wasted food from no-shows.',
      },
      {
        title: 'Location-based offers',
        angle: 'Growth',
        body: 'Opt-in broadcasts for slow hours, new menu drops, and festival combos per outlet.',
      },
      {
        title: 'Franchise-ready inbox',
        angle: 'Scale',
        body: 'Each outlet or city routes to the right team while brand marketing stays centralized.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Outlet campaigns',
    titleHighlight: 'with control',
    subtitle: 'Launch city-wide offers or hyper-local slow-hour pushes with template approval and spend visibility.',
  },
  modules: {
    eyebrow: 'F&B playbook',
    title: 'What brands run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Order status & pickup template packs', shipped: true },
      { label: 'Opt-in loyalty broadcast lists', shipped: true },
      { label: 'Per-outlet routing & quick replies', shipped: true },
      { label: 'Flows for menu FAQs and feedback', shipped: true },
      { label: 'POS auto-triggers for every ticket', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Guest motion',
    title: 'From craving',
    titleHighlight: 'to repeat visit',
    steps: [
      { title: 'Capture direct demand', body: 'QR menus and Instagram CTAs open WhatsApp threads tagged to the outlet.' },
      { title: 'Confirm & prepare', body: 'Automated status updates while the ticket moves through kitchen stages.' },
      { title: 'Delight at handoff', body: 'Pickup-ready ping with map pin; collect feedback in-session.' },
      { title: 'Win the next visit', body: 'Opt-in offer within 24h rules; segment VIPs for early access drops.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Template sets for order lifecycle messages',
      'Broadcasts with outlet-level segments',
      'Shared inbox for guest questions',
    ],
    roadmap: ['POS/KDS event webhooks', 'Table reservation flows with deposits'],
  },
  faq: [
    {
      q: 'Can aggregators and direct orders use the same number?',
      a: 'Best practice is separate numbers or projects per channel so reporting stays clean; we help you structure it.',
    },
    {
      q: 'How do franchisees get limited access?',
      a: 'Project-scoped agents see only their outlet threads while marketing keeps brand-wide templates.',
    },
    {
      q: 'Are promotional broadcasts allowed?',
      a: 'Only to users who opted in, via approved marketing templates. Replysys tracks categories and consent.',
    },
  ],
});

export const financialServicesIndustryDetail = buildIndustry({
  slug: 'financial-services',
  icon: Landmark,
  proofMock: 'liveChat',
  hero: {
    eyebrow: 'Financial services · WhatsApp Cloud API',
    kicker: 'Service updates and KYC nudges with template discipline finance teams demand.',
    title: 'Compliant alerts,',
    titleHighlight: 'human support when it matters',
    subtitle:
      'Replysys helps NBFCs, insurers, and wealth teams send authentication and utility templates, route service chats, and show WhatsApp spend to ops and finance.',
    outcomeStrip: ['Auth & utility templates', 'KYC nudge flows', 'Auditable inbox', 'Spend visibility'],
  },
  problem: {
    eyebrow: 'Regulated comms',
    title: 'Growth slows when',
    titleHighlight: 'every send feels risky',
    subtitle: 'Teams avoid WhatsApp altogether — or worse, use personal numbers outside audit reach.',
    bullets: [
      'Payment and statement alerts need the right template category or Meta rejects the send',
      'KYC document collection happens over unsecured personal chats',
      'Support queues lack ownership when customers ping multiple relationship managers',
      'Finance cannot reconcile WhatsApp conversation costs per product line',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps finance',
    title: 'Trustworthy',
    titleHighlight: 'customer messaging',
    subtitle: 'Move service updates to WhatsApp without losing compliance guardrails.',
    bullets: [
      {
        title: 'Template governance by product',
        angle: 'Compliance',
        body: 'Organize authentication, utility, and marketing templates per project with approval status visible.',
      },
      {
        title: 'Secure KYC collection flows',
        angle: 'Onboarding',
        body: 'Guide customers through document upload steps with agent escalation when OCR or review fails.',
      },
      {
        title: 'Service desk with audit trail',
        angle: 'Ops',
        body: 'Assigned threads, internal notes, and export-friendly history for disputes and QA sampling.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Service desk',
    titleHighlight: 'finance can audit',
    subtitle: 'Relationship managers work from one inbox; compliance sees template usage and conversation billing in one place.',
  },
  modules: {
    eyebrow: 'Finance playbook',
    title: 'What teams run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Authentication & utility template library', shipped: true },
      { label: 'KYC / document collection flows', shipped: true },
      { label: 'RM inbox with assignment & notes', shipped: true },
      { label: 'Conversation cost reporting', shipped: true },
      { label: 'Core banking real-time event triggers', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Customer motion',
    title: 'From application',
    titleHighlight: 'to serviced account',
    steps: [
      { title: 'Start with consent', body: 'Capture opt-in during application; tag product and risk segment.' },
      { title: 'Authenticate & verify', body: 'OTP and document flows use approved authentication templates.' },
      { title: 'Service in-thread', body: 'Payment reminders and statement ready pings with human takeover for disputes.' },
      { title: 'Retain responsibly', body: 'Cross-sell only to opted-in segments with marketing templates and clear audit logs.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Template category management',
      'Multi-RM inbox with supervisor view',
      'Billing visibility for WhatsApp conversation charges',
    ],
    roadmap: ['Live core-banking triggers', 'Regulatory archive connectors'],
  },
  faq: [
    {
      q: 'Can we send OTPs on WhatsApp?',
      a: 'Yes via authentication templates. Replysys tracks approval status and fallbacks if Meta rejects a variant.',
    },
    {
      q: 'Is WhatsApp okay for loan collection messages?',
      a: 'Utility templates for payment reminders are common; marketing pressure must follow opt-in rules — we help you classify sends.',
    },
    {
      q: 'How do auditors review conversations?',
      a: 'Thread history and export options support sampling; deeper archival integrations are planned.',
    },
  ],
});

export const travelTourismIndustryDetail = buildIndustry({
  slug: 'travel-tourism',
  icon: Plane,
  proofMock: 'broadcast',
  hero: {
    eyebrow: 'Travel & tourism · WhatsApp Cloud API',
    kicker: 'Itineraries, vouchers, and upsells in the channel travelers check at the airport.',
    title: 'Fewer cancellations,',
    titleHighlight: 'more repeat bookings',
    subtitle:
      'Replysys helps OTAs, DMCs, and hotels send booking confirmations, travel-day updates, cancellation saves, and loyalty offers on one business number.',
    outcomeStrip: ['Booking confirmations', 'Travel-day updates', 'Cancellation saves', 'Loyalty campaigns'],
  },
  problem: {
    eyebrow: 'Travel ops',
    title: 'Bookings unravel when',
    titleHighlight: 'updates arrive late',
    subtitle: 'Travelers stress about gate changes and vouchers; silence breeds chargebacks and bad reviews.',
    bullets: [
      'Last-minute itinerary changes do not reach customers stuck on email',
      'Cancellation windows close before agents finish phone tag',
      'Upsell (meals, upgrades, tours) is manual and inconsistent across agents',
      'Repeat booking campaigns are expensive on paid ads without a owned WhatsApp list',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps travel',
    title: 'Journey messaging',
    titleHighlight: 'end to end',
    subtitle: 'Keep travelers informed from booking to post-trip review.',
    bullets: [
      {
        title: 'Booking & voucher delivery',
        angle: 'Confidence',
        body: 'Confirm PNR, send e-tickets and hotel vouchers in-thread with read receipts.',
      },
      {
        title: 'Travel-day proactive updates',
        angle: 'Support',
        body: 'Gate, delay, and pickup changes push before customers flood the call center.',
      },
      {
        title: 'Save & upsell moments',
        angle: 'Revenue',
        body: 'Cancellation-save offers and ancillary upsells via templates to opted-in travelers.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Campaigns for',
    titleHighlight: 'seasonal demand',
    subtitle: 'Launch festival sales, long-weekend packages, and loyalty segments with template compliance built in.',
  },
  modules: {
    eyebrow: 'Travel playbook',
    title: 'What operators run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Booking confirmation & voucher templates', shipped: true },
      { label: 'Travel-day utility update packs', shipped: true },
      { label: 'Agent inbox for changes & disputes', shipped: true },
      { label: 'Opt-in loyalty broadcasts', shipped: true },
      { label: 'GDS / PMS live booking sync', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'Traveler motion',
    title: 'From search',
    titleHighlight: 'to rebook',
    steps: [
      { title: 'Convert the inquiry', body: 'WhatsApp quotes with hold timers beat email for international itineraries.' },
      { title: 'Confirm & document', body: 'Payment link + voucher delivery in one thread.' },
      { title: 'Serve the trip', body: 'Day-of updates and on-ground coordinator handoff.' },
      { title: 'Earn the return', body: 'Post-trip review ask and segmented offer for the next holiday window.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Template packs for booking and travel-day messages',
      'Broadcasts for seasonal promos',
      'Shared inbox for change requests',
    ],
    roadmap: ['Live PMS/GDS triggers', 'Automated visa/document checklists'],
  },
  faq: [
    {
      q: 'Can we message international travelers?',
      a: 'Yes — respect Meta pricing and template rules per country. Replysys helps you manage template locales.',
    },
    {
      q: 'How do we handle flight delay spikes?',
      a: 'Use utility templates for disruptions and route replies to pooled agents with priority tags.',
    },
    {
      q: 'Does this replace our booking app notifications?',
      a: 'It complements push/email for moments travelers want two-way chat — changes, upsells, and support.',
    },
  ],
});

export const saasTechIndustryDetail = buildIndustry({
  slug: 'saas-tech',
  icon: Zap,
  proofMock: 'salesAnalytics',
  hero: {
    eyebrow: 'SaaS & technology · WhatsApp Cloud API',
    kicker: 'Onboarding, expansion, and support on the channel product teams underestimate.',
    title: 'Reduce churn,',
    titleHighlight: 'grow expansion revenue',
    subtitle:
      'Replysys helps SaaS vendors run onboarding checklists, renewal nudges, NPS follow-ups, and human support when bots hit a wall — on WhatsApp with template discipline.',
    outcomeStrip: ['Onboarding flows', 'Renewal nudges', 'Support inbox', 'Expansion campaigns'],
  },
  problem: {
    eyebrow: 'SaaS lifecycle',
    title: 'NDR suffers when',
    titleHighlight: 'customers go quiet',
    subtitle: 'Email onboarding sequences underperform for APAC buyers; support tickets lag in chat apps.',
    bullets: [
      'Trial users stall without timely nudges on a channel they actually read',
      'CSMs copy-paste onboarding steps across personal WhatsApp chats',
      'Renewal risk is discovered late because usage drops are not paired with outreach',
      'Support and sales use different tools — context is lost when accounts expand',
    ],
  },
  helps: {
    eyebrow: 'How Replysys helps SaaS',
    title: 'Lifecycle',
    titleHighlight: 'on WhatsApp',
    subtitle: 'Pair product-led growth with high-touch moments where a human or template makes the difference.',
    bullets: [
      {
        title: 'Onboarding that finishes',
        angle: 'Activation',
        body: 'Checklist flows for setup steps with agent escalation when integrations fail.',
      },
      {
        title: 'Renewal & health outreach',
        angle: 'Retention',
        body: 'Template nudges before renewal windows; tag at-risk accounts for CSM takeover.',
      },
      {
        title: 'Support with context',
        angle: 'CS',
        body: 'One inbox for implementation and support — notes visible to sales when expansion talks start.',
      },
    ],
  },
  proof: {
    eyebrow: 'In the product',
    title: 'Signals for',
    titleHighlight: 'customer success',
    subtitle: 'See response times, open threads, and which accounts need a CSM ping before churn shows up in billing.',
  },
  modules: {
    eyebrow: 'SaaS playbook',
    title: 'What vendors run',
    titleHighlight: 'on Replysys today',
    items: [
      { label: 'Onboarding & renewal template packs', shipped: true },
      { label: 'CSM/shared inbox with assignment', shipped: true },
      { label: 'Flows for trial activation steps', shipped: true },
      { label: 'Opt-in webinar & feature launch broadcasts', shipped: true },
      { label: 'Product usage-triggered messages', shipped: false },
    ],
  },
  workflow: {
    eyebrow: 'PLG + CS motion',
    title: 'From trial',
    titleHighlight: 'to expanded ARR',
    steps: [
      { title: 'Activate quickly', body: 'Signup triggers WhatsApp checklist; bot handles FAQs, humans handle blockers.' },
      { title: 'Prove value', body: 'Usage tips and office-hour invites via broadcasts to engaged admins.' },
      { title: 'Secure renewal', body: '90/30/7-day renewal sequences with CSM override for enterprise accounts.' },
      { title: 'Expand the footprint', body: 'Target power users with add-on campaigns once health scores green.' },
    ],
  },
  honesty: {
    eyebrow: 'Straight talk',
    title: 'What is live',
    titleHighlight: 'vs what is next',
    shipped: [
      'Flows + inbox for onboarding and support',
      'Template governance for lifecycle messaging',
      'Broadcasts for launches and webinars',
    ],
    roadmap: ['Usage-based triggers from your product analytics', 'SSO-aware agent routing'],
  },
  faq: [
    {
      q: 'Is WhatsApp professional enough for B2B SaaS?',
      a: 'In APAC and MENA, decision-makers prefer it for speed. Pair with email for contracts; use WhatsApp for momentum.',
    },
    {
      q: 'Can we integrate trial events from our app?',
      a: 'Webhooks today; deeper product analytics triggers are on the roadmap.',
    },
    {
      q: 'How do we avoid CSMs using personal numbers?',
      a: 'Give each CSM access to the shared business inbox with assignment — history stays when people rotate accounts.',
    },
  ],
});

export type IndustrySlug =
  | 'healthcare'
  | 'education'
  | 'ecommerce'
  | 'realestate'
  | 'food-beverage'
  | 'financial-services'
  | 'travel-tourism'
  | 'saas-tech';

export const industryDetailBySlug: Record<IndustrySlug, SolutionDetailPageData> = {
  healthcare: healthcareIndustryDetail,
  education: educationIndustryDetail,
  ecommerce: ecommerceIndustryDetail,
  realestate: realestateIndustryDetail,
  'food-beverage': foodBeverageIndustryDetail,
  'financial-services': financialServicesIndustryDetail,
  'travel-tourism': travelTourismIndustryDetail,
  'saas-tech': saasTechIndustryDetail,
};
