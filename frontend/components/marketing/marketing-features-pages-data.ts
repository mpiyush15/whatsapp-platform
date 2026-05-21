import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  HeartPulse,
  LineChart,
  Megaphone,
  MessageSquare,
  Receipt,
  Stethoscope,
  UserPlus,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

/** Copy for /marketing/features */

export const featuresPageHeroCopy = {
  eyebrow: 'What you get',
  titleLine1: 'Everything your team needs',
  titleHighlight: 'on one WhatsApp number',
  subtitle:
    'Team inbox, bulk messages, auto-replies, ready-made message formats, and simple reports — on official WhatsApp Business. Extra tools for clinics when you need them.',
  ctaBookDemo: 'Book demo',
  ctaGetStarted: 'Get started',
} as const;

export type FeatureCardCategory = 'Chats' | 'Marketing' | 'Reports';

export type FeatureCardStatus = 'shipped' | 'partial';

export type MarketingFeatureCardItem = {
  id: string;
  category: FeatureCardCategory;
  title: string;
  description: string;
  icon: LucideIcon;
  status: FeatureCardStatus;
};

export const featuresGridSectionCopy = {
  eyebrow: 'What you get',
  title: 'WhatsApp tools',
  titleHighlight: 'built for your team',
  subtitle:
    'Inbox, bulk messages, auto-replies, and reports on official WhatsApp — everything works together on one business number.',
} as const;

export const marketingFeatureCards: MarketingFeatureCardItem[] = [
  {
    id: 'live-inbox',
    category: 'Chats',
    title: 'Team WhatsApp inbox',
    description: 'Shared WhatsApp inbox with assignment, tags, notes, and real-time updates for every agent.',
    icon: MessageSquare,
    status: 'shipped',
  },
  {
    id: 'templates',
    category: 'Chats',
    title: 'Ready-made messages & quick replies',
    description: 'Sync Meta-approved templates and save quick replies your team uses every day.',
    icon: Workflow,
    status: 'shipped',
  },
  {
    id: 'multi-agent',
    category: 'Chats',
    title: 'Several staff, one number',
    description: 'Route conversations to the right person with assignments and internal notes on each chat.',
    icon: Users,
    status: 'shipped',
  },
  {
    id: 'campaigns',
    category: 'Marketing',
    title: 'Bulk message campaigns',
    description: 'Schedule template sends to tagged segments and track delivered, read, and replied.',
    icon: Megaphone,
    status: 'shipped',
  },
  {
    id: 'flows',
    category: 'Marketing',
    title: 'Auto-replies & menus',
    description: 'Set up automatic answers for FAQs, capture leads, and hand off to a person when needed.',
    icon: Bot,
    status: 'shipped',
  },
  {
    id: 'contacts',
    category: 'Marketing',
    title: 'Customer list & history',
    description: 'Contact lists, tags, segments, and full conversation history in one place.',
    icon: Users,
    status: 'shipped',
  },
  {
    id: 'analytics',
    category: 'Reports',
    title: 'Reports & message stats',
    description: 'Message volume, campaign performance, and Meta category spend — transparent in INR.',
    icon: BarChart3,
    status: 'shipped',
  },
  {
    id: 'healthcare',
    category: 'Reports',
    title: 'Clinics & hospitals tools',
    description: 'Patients, appointments, prescriptions, billing, and consent-aware WhatsApp reminders.',
    icon: HeartPulse,
    status: 'shipped',
  },
  {
    id: 'api',
    category: 'Reports',
    title: 'Connect other software',
    description: 'Link Replysys to tools you already use — send messages and sync contacts automatically.',
    icon: Zap,
    status: 'shipped',
  },
];

export type FeaturesPillarAccent = 'messaging' | 'growth' | 'intelligence';

export type MarketingFeaturesPillarItem = {
  id: string;
  index: string;
  accent: FeaturesPillarAccent;
  label: string;
  title: string;
  description: string;
  bullets: readonly string[];
  icon: LucideIcon;
};

export const featuresPillarsSectionCopy = {
  eyebrow: 'How it fits together',
  title: 'Three parts',
  titleHighlight: 'one WhatsApp setup',
  subtitle:
    'Handle chats, send promotions, and see what’s working — without juggling different apps or phone numbers.',
} as const;

export const marketingFeaturesPillars: MarketingFeaturesPillarItem[] = [
  {
    id: 'messaging',
    index: '01',
    accent: 'messaging',
    label: 'Chats',
    title: 'Run the inbox as a team',
    description:
      'One business number, everyone on the same page. Pass chats between staff, use approved message formats, and keep full history.',
    bullets: ['Shared team inbox', 'Approved messages & quick replies', 'Handoffs, labels & private notes'],
    icon: MessageSquare,
  },
  {
    id: 'growth',
    index: '02',
    accent: 'growth',
    label: 'Marketing',
    title: 'Send offers and stay organized',
    description:
      'Message customer groups on a schedule, set up auto-replies for common questions, and keep your customer list tidy.',
    bullets: ['Scheduled bulk messages', 'Auto-replies & simple menus', 'Customer groups & labels'],
    icon: Megaphone,
  },
  {
    id: 'intelligence',
    index: '03',
    accent: 'intelligence',
    label: 'Reports',
    title: 'See results, add clinic tools, connect apps',
    description:
      'Check delivery and costs in rupees, use clinic-specific tools when you need them, and connect other software as you grow.',
    bullets: ['Campaign & inbox reports', 'Patients & appointments for clinics', 'Connect to your other tools'],
    icon: LineChart,
  },
];

export type FeaturesVerticalModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type FeaturesVerticalCalloutTheme = {
  variant: 'healthcare' | 'edtech';
  tagPill: string;
  badge: string;
  bulletDot: string;
  iconBox: string;
  moduleHover: string;
  panel: string;
};

export type FeaturesVerticalCalloutConfig = {
  section: {
    id: string;
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
  };
  tagLabel: string;
  badge: string;
  body: string;
  bullets: readonly string[];
  cta: string;
  ctaHref: string;
  modulePanelLabel: string;
  modules: readonly FeaturesVerticalModule[];
  theme: FeaturesVerticalCalloutTheme;
};

const healthcareTheme: FeaturesVerticalCalloutTheme = {
  variant: 'healthcare',
  tagPill: 'border-violet-200/80 bg-violet-50 text-violet-900',
  badge: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  bulletDot: 'bg-violet-500',
  iconBox: 'border-violet-200/60 bg-violet-50 text-violet-800',
  moduleHover: 'hover:border-violet-200/60',
  panel: 'bg-gradient-to-br from-violet-50/80 via-white to-[#f4f3ef]',
};

const edtechTheme: FeaturesVerticalCalloutTheme = {
  variant: 'edtech',
  tagPill: 'border-indigo-200/80 bg-indigo-50 text-indigo-900',
  badge: 'border-sky-200/80 bg-sky-50 text-sky-800',
  bulletDot: 'bg-indigo-500',
  iconBox: 'border-indigo-200/60 bg-indigo-50 text-indigo-800',
  moduleHover: 'hover:border-indigo-200/60',
  panel: 'bg-gradient-to-br from-indigo-50/80 via-white to-[#f4f3ef]',
};

export const featuresHealthcareVerticalCallout: FeaturesVerticalCalloutConfig = {
  section: {
    id: 'healthcare-callout',
    eyebrow: 'Healthcare',
    title: 'Clinics get',
    titleHighlight: 'dedicated product depth',
    subtitle:
      'Patients, appointments, prescriptions, and billing on the same WhatsApp number as inbox and campaigns — built for clinics, not a generic contact list.',
  },
  tagLabel: 'Clinic workflows',
  badge: 'Shipped today',
  body:
    'Other businesses use the standard inbox and bulk messages. Healthcare adds dedicated tools when you need patient records and appointments, not spreadsheets beside chat.',
  bullets: [
    'Same business number for care team and front desk',
    'Appointment reminders and follow-ups over WhatsApp',
    'Consent-aware messaging for patient communications',
  ],
  cta: 'Explore healthcare solutions',
  ctaHref: '/solutions/healthcare',
  modulePanelLabel: 'Healthcare module',
  modules: [
    {
      id: 'patients',
      title: 'Patients & records',
      description: 'Profiles, history, and consent-aware messaging.',
      icon: Users,
    },
    {
      id: 'appointments',
      title: 'Appointments',
      description: 'Scheduling, reminders, and no-show reduction.',
      icon: Calendar,
    },
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      description: 'Share and track scripts over WhatsApp.',
      icon: Stethoscope,
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Invoices and payment follow-ups in-thread.',
      icon: Receipt,
    },
  ],
  theme: healthcareTheme,
};

export const featuresEdtechVerticalCallout: FeaturesVerticalCalloutConfig = {
  section: {
    id: 'edtech-callout',
    eyebrow: 'Education & edtech',
    title: 'Manage and automate',
    titleHighlight: 'your institute on WhatsApp',
    subtitle:
      'Admissions, parent updates, fee reminders, and class announcements — auto-replies, bulk messages, and inbox on one school number.',
  },
  tagLabel: 'Institute workflows',
  badge: 'Core platform',
  body:
    'Schools, colleges, and coaching centers run on Replysys core — segment parents and students, automate reminders, and keep admissions conversations in one shared inbox.',
  bullets: [
    'Admission inquiry flows with counselor handoff',
    'Parent broadcasts for results, events, and notices',
    'Fee reminder campaigns to tagged guardians',
    'One number for admin, counselors, and front office',
  ],
  cta: 'Explore education solutions',
  ctaHref: '/solutions/education',
  modulePanelLabel: 'Institute automation',
  modules: [
    {
      id: 'admissions',
      title: 'Admissions & leads',
      description: 'Capture inquiries, qualify, and follow up in-thread.',
      icon: UserPlus,
    },
    {
      id: 'parents',
      title: 'Parent messaging',
      description: 'Broadcasts and two-way updates families actually read.',
      icon: Users,
    },
    {
      id: 'fees',
      title: 'Fee reminders',
      description: 'Scheduled nudges to tagged guardians and students.',
      icon: Bell,
    },
    {
      id: 'classes',
      title: 'Class & exam updates',
      description: 'Timetables, results, and notices via flows or campaigns.',
      icon: BookOpen,
    },
  ],
  theme: edtechTheme,
};

export const featuresCompareSectionCopy = {
  eyebrow: 'Transparency',
  title: 'What ships today',
  titleHighlight: 'vs what’s next',
  subtitle: 'No fake checkmarks — here’s what you can use on day one and what we’re actively building.',
} as const;

export const featuresIncludedToday = [
  'Live team inbox with assignments, tags, and notes',
  'Template broadcasts with scheduling and delivery stats',
  'Auto-replies and menus for common questions',
  'Contacts, tags, segments, and conversation history',
  'Campaign and inbox analytics with Meta spend in INR',
  'Healthcare module — patients, appointments, prescriptions, billing',
  'Connect to other software you already use',
  'Multi-project workspaces for agencies (client switching)',
] as const;

export const featuresRoadmap = [
  {
    id: 'drip',
    title: 'Drip campaign sequences',
    description: 'Multi-step template series over days — beyond one-shot broadcasts.',
  },
  {
    id: 'ai',
    title: 'AI-assisted replies',
    description: 'Smarter suggestions on top of today’s rule-based flows — not a black-box bot.',
  },
  {
    id: 'qr',
    title: 'QR & click-to-chat tools',
    description: 'Generate wa.me links and QR assets for ads, print, and storefronts.',
  },
  {
    id: 'agency-billing',
    title: 'Agency reseller billing',
    description: 'White-label invoicing and consolidated billing across client projects.',
  },
] as const;

export const featuresCtaCopy = {
  title: 'Ready to run WhatsApp',
  titleHighlight: 'like an operations team?',
  subtitle: 'Book a walkthrough with our team or start from inbox and campaigns — add automation when you’re ready.',
  primary: 'Book a demo',
  secondary: 'See plans',
  secondaryHref: '/pricing',
  tertiary: 'Get started free',
  tertiaryHref: '/auth/register',
} as const;
