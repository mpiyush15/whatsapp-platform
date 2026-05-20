import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Megaphone,
  MessageSquare,
  Plane,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Workflow,
  Zap,
} from 'lucide-react';

/** Copy for /marketing/solutions */

export const solutionsPageHeroCopy = {
  eyebrow: 'Solutions',
  titleLine1: 'WhatsApp that fits',
  titleHighlight: 'your team and your industry',
  subtitle:
    'Replysys on the official Meta Cloud API — proven playbooks for sales, support, and growth, plus vertical depth for clinics, institutes, and stores.',
  useCaseHeading: 'By use case',
  industryHeading: 'By industry',
  ctaBookDemo: 'Book demo',
  ctaExplore: 'Explore solutions',
  ctaExploreHref: '#use-cases',
} as const;

export type SolutionsHeroChip = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const solutionsHeroUseCases: SolutionsHeroChip[] = [
  {
    id: 'sales',
    label: 'Sales & outbound',
    href: '/marketing/solutions/sales',
    icon: Zap,
  },
  {
    id: 'support',
    label: 'Customer support',
    href: '/marketing/solutions/support',
    icon: MessageSquare,
  },
  {
    id: 'marketing',
    label: 'Marketing & growth',
    href: '/marketing/solutions/marketing',
    icon: Megaphone,
  },
  {
    id: 'agencies',
    label: 'Agencies & resellers',
    href: '/marketing/solutions/agencies',
    icon: Building2,
  },
];

export const solutionsHeroIndustries: SolutionsHeroChip[] = [
  {
    id: 'healthcare',
    label: 'Healthcare & clinics',
    href: '/solutions/healthcare',
    icon: HeartPulse,
  },
  {
    id: 'education',
    label: 'Education & edtech',
    href: '/solutions/education',
    icon: GraduationCap,
  },
  {
    id: 'ecommerce',
    label: 'E-commerce & D2C',
    href: '/solutions/ecommerce',
    icon: ShoppingBag,
  },
  {
    id: 'realestate',
    label: 'Real estate',
    href: '/solutions/realestate',
    icon: Home,
  },
  {
    id: 'food-beverage',
    label: 'Food & beverage',
    href: '/solutions/food-beverage',
    icon: UtensilsCrossed,
  },
  {
    id: 'financial-services',
    label: 'Financial services',
    href: '/solutions/financial-services',
    icon: Landmark,
  },
];

export const solutionsUseCasesSectionCopy = {
  eyebrow: 'Use cases',
  title: 'Outcomes your team',
  titleHighlight: 'can run on Replysys',
  subtitle:
    'Official WhatsApp Business API — pick your motion below and see how Replysys helps you win that use case.',
  replysysHelpsLabel: 'How Replysys helps',
} as const;

export type SolutionsUseCaseItem = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  replysysSolution: string;
  icon: LucideIcon;
};

export const solutionsUseCases: SolutionsUseCaseItem[] = [
  {
    id: 'solution-sales',
    title: 'Close more leads before they go cold',
    tagline: 'Sales & outbound',
    description:
      'Leads from wa.me links, ads, and campaigns need a fast owner — or they slip to a competitor’s chat.',
    replysysSolution:
      'Replysys puts every inbound lead in a shared inbox, assigns an owner, and lets your team follow up with Meta-approved templates and notes on one business number — so sales keeps the thread until close.',
    icon: Zap,
  },
  {
    id: 'solution-support',
    title: 'Answer faster with zero context loss',
    tagline: 'Customer support',
    description:
      'One phone, many agents, and repeat questions — without a system, customers wait and agents duplicate work.',
    replysysSolution:
      'Replysys routes chats by agent or tag, saves quick replies for common issues, and keeps full conversation history on the official API — so support resolves in one place, not on personal phones.',
    icon: MessageSquare,
  },
  {
    id: 'solution-marketing',
    title: 'Turn broadcasts into the next campaign',
    tagline: 'Marketing & growth',
    description:
      'Email open rates drop; you need a channel customers actually read — with opt-in and template rules intact.',
    replysysSolution:
      'Replysys sends scheduled template broadcasts to tagged segments, tracks delivered and read, and surfaces who replied — so marketing retargets on real signals, not guesses.',
    icon: Megaphone,
  },
  {
    id: 'solution-agencies',
    title: 'Scale client WhatsApp without inbox chaos',
    tagline: 'Agencies & resellers',
    description:
      'Juggling logins and numbers per client slows delivery and risks sending from the wrong brand.',
    replysysSolution:
      'Replysys gives agencies one login with separate projects per client — own numbers, templates, inboxes, and reporting — so you run more accounts without cross-client mistakes.',
    icon: Building2,
  },
];

export const solutionsTeamSizeSectionCopy = {
  eyebrow: 'By team size',
  title: 'Replysys scales',
  titleHighlight: 'with your stage',
  subtitle: 'Same platform from first number to multi-project ops — pick the plan that matches your team.',
  replysysHelpsLabel: 'How Replysys helps',
} as const;

export type SolutionsSimpleItem = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  replysysSolution: string;
  icon: LucideIcon;
  href: string;
  linkLabel: string;
};

export const solutionsTeamSizeItems: SolutionsSimpleItem[] = [
  {
    id: 'team-startups',
    title: 'Go live on WhatsApp without heavy setup',
    tagline: 'Startups',
    description: 'You need official API access and a real inbox — not weeks of integration before the first send.',
    replysysSolution:
      'Replysys onboards you on Meta’s Cloud API with a shared inbox, templates, and flows so a small team can start talking to customers on day one.',
    icon: Zap,
    href: '/pricing',
    linkLabel: 'See startup plans',
  },
  {
    id: 'team-growing',
    title: 'Add agents and campaigns without losing control',
    tagline: 'Growing teams',
    description: 'More people, more sends, more segments — spreadsheets and one phone stop working.',
    replysysSolution:
      'Replysys adds roles, projects, tags, campaign analytics, and multi-agent routing on one business number as you scale.',
    icon: Users,
    href: '/pricing',
    linkLabel: 'See growing team plans',
  },
  {
    id: 'team-enterprise',
    title: 'Run multi-brand WhatsApp with guardrails',
    tagline: 'Enterprise',
    description: 'Multiple units or brands need isolated numbers, usage visibility, and consistent compliance.',
    replysysSolution:
      'Replysys supports multi-project organizations, transparent Meta spend in INR, and centralized ops so enterprise teams stay audit-ready.',
    icon: Building2,
    href: '/pricing',
    linkLabel: 'Talk to sales',
  },
];

export const solutionsPlatformSectionCopy = {
  eyebrow: 'Platform',
  title: 'Everything runs on',
  titleHighlight: 'official WhatsApp infrastructure',
  subtitle: 'API, templates, and billing — the foundation behind every Replysys solution above.',
  replysysHelpsLabel: 'What you get',
} as const;

export const solutionsPlatformItems: SolutionsSimpleItem[] = [
  {
    id: 'platform-api',
    title: 'Connect on Meta’s Cloud API the right way',
    tagline: 'WhatsApp Cloud API',
    description: 'Business verification, WABA setup, and number registration need a guided path — not guesswork.',
    replysysSolution:
      'Replysys walks your team through Meta Business Manager, template approval, and go-live on a verified business number.',
    icon: MessageSquare,
    href: '/marketing#api',
    linkLabel: 'Learn about the API',
  },
  {
    id: 'platform-templates',
    title: 'Send messages customers can actually receive',
    tagline: 'Templates & compliance',
    description: 'Marketing and utility sends must use approved templates — or Meta blocks delivery.',
    replysysSolution:
      'Replysys syncs approved templates, quick replies, and session rules so agents and campaigns stay compliant by default.',
    icon: Workflow,
    href: '/marketing/features',
    linkLabel: 'Explore features',
  },
  {
    id: 'platform-billing',
    title: 'See spend before the invoice surprises you',
    tagline: 'Credits & billing',
    description: 'Per-conversation Meta fees plus platform usage should be visible in one place.',
    replysysSolution:
      'Replysys shows category spend in INR, credits, invoices, and top-ups so finance and ops share one view.',
    icon: BarChart3,
    href: '/pricing',
    linkLabel: 'View pricing',
  },
];

export const solutionsIndustriesSectionCopy = {
  eyebrow: 'By industry',
  title: 'Vertical playbooks',
  titleHighlight: 'on Replysys',
  subtitle: 'Core WhatsApp for every industry — deeper modules where your business needs them.',
  replysysHelpsLabel: 'How Replysys helps',
} as const;

export const solutionsIndustryItems: SolutionsSimpleItem[] = [
  {
    id: 'industry-healthcare',
    title: 'Patient journeys on WhatsApp, not spreadsheets',
    tagline: 'Healthcare & clinics',
    description: 'Clinics need appointments, reminders, and care team messaging on one trusted number.',
    replysysSolution:
      'Replysys adds a healthcare module — patients, appointments, prescriptions, and billing on the same inbox and campaigns you already use.',
    icon: HeartPulse,
    href: '/solutions/healthcare',
    linkLabel: 'Healthcare solutions',
  },
  {
    id: 'industry-education',
    title: 'Keep parents and students in the loop',
    tagline: 'Education & edtech',
    description: 'Institutes juggle admissions, fees, and class updates across channels parents ignore.',
    replysysSolution:
      'Replysys runs admissions follow-up, parent broadcasts, and fee reminders on core inbox, flows, and campaigns.',
    icon: GraduationCap,
    href: '/solutions/education',
    linkLabel: 'Education solutions',
  },
  {
    id: 'industry-ecommerce',
    title: 'Orders and support in the channel customers open',
    tagline: 'E-commerce & D2C',
    description: 'Cart updates and support chats split across tools — customers miss messages.',
    replysysSolution:
      'Replysys combines order updates, recovery sends, and agent support on one WhatsApp business number.',
    icon: ShoppingBag,
    href: '/solutions/ecommerce',
    linkLabel: 'E-commerce solutions',
  },
  {
    id: 'industry-realestate',
    title: 'Nurture leads until site visit and close',
    tagline: 'Real estate',
    description: 'Brokers lose deals when inquiry follow-up lives on personal phones.',
    replysysSolution:
      'Replysys centralizes lead capture, agent assignment, and template follow-ups so every prospect stays in one thread.',
    icon: Home,
    href: '/solutions/realestate',
    linkLabel: 'Real estate solutions',
  },
  {
    id: 'industry-food',
    title: 'Orders and loyalty on the channel customers open',
    tagline: 'Food & beverage',
    description: 'Delivery updates and promos scatter across SMS and apps customers ignore.',
    replysysSolution:
      'Replysys runs order status, pickup alerts, and opt-in offers on one WhatsApp business number with template compliance.',
    icon: UtensilsCrossed,
    href: '/solutions/food-beverage',
    linkLabel: 'Food & beverage solutions',
  },
  {
    id: 'industry-finance',
    title: 'Service updates without crossing compliance lines',
    tagline: 'Financial services',
    description: 'Alerts and KYC nudges need audit-friendly templates and clear consent.',
    replysysSolution:
      'Replysys keeps utility and authentication templates organized per project with spend visibility for ops and finance.',
    icon: Landmark,
    href: '/solutions/financial-services',
    linkLabel: 'Financial services solutions',
  },
  {
    id: 'industry-travel',
    title: 'Keep travelers informed end to end',
    tagline: 'Travel & tourism',
    description: 'Itinerary changes and vouchers need to land before customers hit the call center.',
    replysysSolution:
      'Replysys sends booking confirmations, travel-day updates, and loyalty offers with template compliance on one business number.',
    icon: Plane,
    href: '/solutions/travel-tourism',
    linkLabel: 'Travel solutions',
  },
  {
    id: 'industry-saas',
    title: 'Onboarding and renewals where buyers reply',
    tagline: 'SaaS & technology',
    description: 'Trials stall and churn hides when lifecycle email is the only channel.',
    replysysSolution:
      'Replysys runs onboarding checklists, renewal nudges, and CS inbox handoffs on WhatsApp with clear ownership.',
    icon: Zap,
    href: '/solutions/saas-tech',
    linkLabel: 'SaaS solutions',
  },
];

/** Hub page at /solutions — all vertical cards */
export const solutionsIndustryHubItems: SolutionsSimpleItem[] = solutionsIndustryItems;

export const solutionsIndustriesHubCopy = {
  title: 'Industry playbooks',
  titleHighlight: 'on Replysys',
  subtitle:
    'Eight verticals you already built content for — now on the same modern layout as sales, support, and marketing solutions. Pick yours and see how inbox, templates, flows, and campaigns fit.',
  ctaDemo: 'Book a walkthrough',
  ctaStart: 'Get started',
  gridEyebrow: 'All industries',
  gridTitle: 'Vertical playbooks',
  gridTitleHighlight: 'ready to explore',
  gridSubtitle: 'Each link opens a full industry page with pains, modules, workflow, and honest shipped vs roadmap notes.',
  replysysHelpsLabel: 'How Replysys helps',
  steps: [
    {
      title: 'Choose your vertical',
      body: 'Healthcare, education, commerce, property, F&B, finance, travel, or SaaS — start with the closest match.',
    },
    {
      title: 'Review the playbook',
      body: 'See problems, how Replysys helps, product proof, and what is shipped today versus roadmap.',
    },
    {
      title: 'Book or start',
      body: 'Book a demo for your team or register and connect WhatsApp Cloud API when you are ready.',
    },
    {
      title: 'Scale on one stack',
      body: 'Same inbox, templates, and campaigns as our use-case solutions — no separate tool per vertical.',
    },
  ],
} as const;

export const solutionsCtaCopy = {
  title: 'Pick your Replysys',
  titleHighlight: 'solution today',
  subtitle: 'Book a walkthrough or start with inbox and campaigns — we’ll match setup to your use case and industry.',
  primary: 'Book a demo',
  secondary: 'See plans',
  secondaryHref: '/pricing',
  tertiary: 'Get started free',
  tertiaryHref: '/auth/register',
} as const;
