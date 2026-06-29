import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  Layers,
  MessageSquareOff,
  Split,
} from 'lucide-react';
import {
  MARKETING_PROBLEM_ACCOUNT_BAN_URL,
  MARKETING_PROBLEM_CONSENT_OPTIN_URL,
  MARKETING_PROBLEM_TEMPLATE_COMPLIANCE_URL,
  MARKETING_PROBLEM_TOO_MANY_TOOLS_URL,
  MARKETING_PROBLEM_MANUAL_FOLLOWUPS_URL,
} from '@/lib/marketing/assets';

export const whatsAppApiVideoSectionCopy = {
  eyebrow: 'Watch & learn',
  title: 'What is the WhatsApp',
  titleHighlight: 'Business API?',
  subtitle:
    'The official way businesses message customers at scale — verified identity, approved templates, and opt-in rules that keep broadcasts compliant and trusted.',
  videoTitle: 'WhatsApp Business API explained',
  placeholderHint: 'Your explainer video goes here',
  highlights: [
    {
      id: 'official',
      title: 'Official Meta Cloud API',
      body: 'Not grey routes or personal WhatsApp — your brand sends through Meta’s infrastructure with business verification.',
    },
    {
      id: 'secure',
      title: 'Built for trust & compliance',
      body: 'End-to-end encryption on WhatsApp, opt-in for marketing, and template review before you reach thousands of customers.',
    },
    {
      id: 'scale',
      title: 'Market & broadcast at scale',
      body: 'Schedule template campaigns, track delivered and read, and retarget — one dashboard for your whole team.',
    },
  ],
} as const;

export const heroSectionCopy = {
  eyebrow: 'WhatsApp Business API',
  titleLine1: 'Turn WhatsApp into',
  titleHighlight: 'your growth channel',
  subtitle:
    'Customers already live on WhatsApp — 98% open rates, replies in minutes, and conversations that convert. Replysys connects you to the official Cloud API with one inbox, campaigns, and automation for your whole team.',
  benefits: [
    '98% open rates vs email',
    'Reach people where they already chat',
    'Official Meta Cloud API — scale safely',
  ],
  ctaBookDemo: 'Book demo',
  ctaSeePlans: 'See plans',
} as const;

/** Marquee perks — honest claims; each links to pricing or features */
export type TrustMarqueeItem = {
  label: string;
  href: string;
};

export const trustMarqueeItems: TrustMarqueeItem[] = [
  { label: 'Official WhatsApp Cloud API on every plan', href: '/pricing' },
  { label: 'Guided Meta onboarding support', href: '/pricing' },
  { label: 'Website widget & wa.me links', href: '/marketing/features' },
  { label: 'Compare plans before you subscribe', href: '/pricing' },
];

export const whyReplysysCopy = {
  eyebrow: 'Why Replysys',
  title: 'Not another chat app.',
  titleHighlight: 'A WhatsApp ops platform.',
  subtitle:
    'Three common paths — and where teams hit a wall. Replysys is built for official API scale, compliance, and industry playbooks.',
  rows: [
    {
      id: 'app',
      vs: 'WhatsApp Business app',
      them: 'One phone, no Cloud API — no shared team inbox, template governance, or campaign reporting at scale.',
      themTone: 'bg-slate-100 text-slate-600 ring-slate-200/90',
      us: 'One verified business number with a real team inbox, assignments, approved templates, and broadcast analytics.',
      usBullets: ['Multi-agent inbox', 'Template + session rules', 'Campaigns with delivery stats'],
    },
    {
      id: 'bulk',
      vs: 'Bulk & unofficial tools',
      them: 'Cold lists and grey routes — spam flags, blocks, and number bans when Meta catches up.',
      themTone: 'bg-rose-50 text-rose-700 ring-rose-200/80',
      us: 'Opt-in audiences, Meta-reviewed templates, and quality-rated sending on the official stack.',
      usBullets: ['Consent-aware lists', 'Template categories that pass review', 'Account health you can monitor'],
    },
    {
      id: 'bsp',
      vs: 'Typical BSPs',
      them: 'Generic “send messages” tooling — you stitch playbooks for clinics, stores, and sales yourself.',
      themTone: 'bg-violet-50 text-violet-700 ring-violet-200/80',
      us: 'Shared inbox plus vertical playbooks for healthcare, ecommerce, education, and more — with honest shipped vs roadmap labels.',
      usBullets: ['Industry-ready modules', 'Shipped today vs Soon on every page', 'One platform for inbox + campaigns + flows'],
    },
  ],
} as const;

export const customerSpotlightCopy = {
  eyebrow: 'Customer story',
  company: 'Vaibhav Biotech',
  brand: 'Plant in Garden',
  brandHint: 'D2C plants & garden supplies',
  headline: 'Ecommerce brand on official WhatsApp API',
  quote:
    'Replysys manages our WhatsApp well — order updates, reminders, and campaigns run from one business number instead of scattered personal chats.',
  attribution: 'Vaibhav Biotech · ecommerce operations',
  outcomes: ['Order & delivery updates', 'One team inbox', 'Template-safe campaigns'],
} as const;

export type MarketingProblem = {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional card image — drop assets in /public/marketing/problems/ */
  imageSrc?: string;
};

export const marketingProblems: MarketingProblem[] = [
  {
    label: 'Account risk',
    title: 'Using the wrong channel puts your number at risk.',
    description:
      'Personal WhatsApp and unofficial bulk tools trigger spam flags — restrictions and bans follow.',
    icon: Ban,
    imageSrc: MARKETING_PROBLEM_ACCOUNT_BAN_URL,
  },
  {
    label: 'Consent',
    title: 'Messaging without opt-in destroys delivery.',
    description:
      'Cold lists lead to blocks, complaints, and campaigns that never reach the inbox.',
    icon: MessageSquareOff,
    imageSrc: MARKETING_PROBLEM_CONSENT_OPTIN_URL,
  },
  {
    label: 'Compliance',
    title: 'Templates matter more than most teams think.',
    description:
      'Marketing outside Meta’s approved categories fails review or hits quality limits fast.',
    icon: AlertTriangle,
    imageSrc: MARKETING_PROBLEM_TEMPLATE_COMPLIANCE_URL,
  },
  {
    label: 'Operations',
    title: 'Your team is split across too many tools.',
    description:
      'Inbox on phones, campaigns elsewhere, leads in spreadsheets — no single source of truth.',
    icon: Split,
    imageSrc: MARKETING_PROBLEM_TOO_MANY_TOOLS_URL,
  },
  {
    label: 'Scale',
    title: 'Manual follow-ups do not scale.',
    description:
      'Appointment reminders, fee nudges, and order updates repeated by hand — errors and delays pile up.',
    icon: Layers,
    imageSrc: MARKETING_PROBLEM_MANUAL_FOLLOWUPS_URL,
  },
];

export type ApiFlowPath = 'app' | 'api';

export const apiFlowBoardCopy = {
  eyebrow: 'The solution',
  titleMain: 'Most businesses use the',
  titleHighlight: 'wrong WhatsApp',
  subtitle:
    'The problems above do not go away with the mobile Business app. You need WhatsApp Business API and a platform built for scale — that is where Replysys fits.',
  toggleApp: 'Wrong: mobile app',
  toggleApi: 'Right: Cloud API',
  boardLabel: 'Signal path',
  inputLabel: 'Your business',
  inputSublabel: 'Needs scale',
  appNodeLabel: 'WA Business App',
  appNodeSublabel: 'Phone only',
  bulkNodeLabel: 'Bulk / cold lists',
  bulkNodeSublabel: 'No opt-in',
  banNodeLabel: 'Number banned',
  banNodeSublabel: 'Restrictions · lost reach',
  apiNodeLabel: 'Cloud API',
  apiNodeSublabel: 'Meta official',
  platformLabel: 'Replysys',
  platformSublabel: 'Your OS layer',
  outputAppLabel: 'Stops here',
  outputAppSublabel: 'No API · no teams',
  outputApiLabel: 'Works at scale',
  outputApiSublabel: 'Inbox · flows · templates',
  liveSignal: 'Green — connected',
  deadSignal: 'Red — blocked',
  footerApi:
    'Green path: Meta Cloud API → Replysys runs inbox, campaigns, automation, and compliance for your whole team.',
  footerApp:
    'Red tree: bulk messaging on the Business app triggers spam flags — many businesses lose their number. No official API means teams never scale.',
  treeForkLabel: 'What happens next',
} as const;

/** Icon keys resolved in MarketingApiFlowBoard */
export type FlowTreeIconKey = 'cloud' | 'phone' | 'alert' | 'ban' | 'x' | 'layers' | 'check';

export type FlowTreeTone = 'neutral' | 'wrong' | 'right' | 'success';

export type FlowTreeNodeData = {
  id: string;
  label: string;
  sublabel: string;
  icon: FlowTreeIconKey;
  tone: FlowTreeTone;
  children?: FlowTreeNodeData[];
};

/** Wrong path — branches to bulk → ban vs dead-end */
export const appFlowTree: FlowTreeNodeData = {
  id: 'business',
  label: apiFlowBoardCopy.inputLabel,
  sublabel: apiFlowBoardCopy.inputSublabel,
  icon: 'cloud',
  tone: 'neutral',
  children: [
    {
      id: 'app',
      label: apiFlowBoardCopy.appNodeLabel,
      sublabel: apiFlowBoardCopy.appNodeSublabel,
      icon: 'phone',
      tone: 'wrong',
      children: [
        {
          id: 'bulk',
          label: apiFlowBoardCopy.bulkNodeLabel,
          sublabel: apiFlowBoardCopy.bulkNodeSublabel,
          icon: 'alert',
          tone: 'wrong',
          children: [
            {
              id: 'ban',
              label: apiFlowBoardCopy.banNodeLabel,
              sublabel: apiFlowBoardCopy.banNodeSublabel,
              icon: 'ban',
              tone: 'wrong',
            },
          ],
        },
        {
          id: 'stop',
          label: apiFlowBoardCopy.outputAppLabel,
          sublabel: apiFlowBoardCopy.outputAppSublabel,
          icon: 'x',
          tone: 'wrong',
        },
      ],
    },
  ],
};

/** Right path — single trunk, no ban branch */
export const apiFlowTree: FlowTreeNodeData = {
  id: 'business',
  label: apiFlowBoardCopy.inputLabel,
  sublabel: apiFlowBoardCopy.inputSublabel,
  icon: 'cloud',
  tone: 'neutral',
  children: [
    {
      id: 'api',
      label: apiFlowBoardCopy.apiNodeLabel,
      sublabel: apiFlowBoardCopy.apiNodeSublabel,
      icon: 'cloud',
      tone: 'right',
      children: [
        {
          id: 'platform',
          label: apiFlowBoardCopy.platformLabel,
          sublabel: apiFlowBoardCopy.platformSublabel,
          icon: 'layers',
          tone: 'right',
          children: [
            {
              id: 'success',
              label: apiFlowBoardCopy.outputApiLabel,
              sublabel: apiFlowBoardCopy.outputApiSublabel,
              icon: 'check',
              tone: 'success',
            },
          ],
        },
      ],
    },
  ],
};

export const problemsSectionCopy = {
  eyebrow: 'The real problem',
  titleMain: 'Why businesses struggle to manage',
  titleHighlight: 'WhatsApp at scale',
  subtitle:
    'It is not WhatsApp itself — it is how teams use it. Wrong tools and practices cost you reach, trust, and revenue.',
  calloutTitle: 'The sustainable path',
  calloutBody:
    'Replysys is built on Meta’s Cloud API with template workflows, opt-in contact lists, and automation you can audit — so clinics, institutes, and stores scale without gambling their number.',
} as const;

export const broadcastSectionCopy = {
  eyebrow: 'Official WhatsApp API',
  titleMain: 'Broadcast and automate on',
  titleHighlight: 'WhatsApp — the right way',
  subtitle:
    'Template messages, opt-in lists, and team inbox on Meta’s Cloud API — not risky bulk sends from a personal phone.',
  bullets: [
    {
      title: 'Approved template categories',
      body: 'Marketing, utility, and authentication flows that pass Meta review and protect your number quality.',
    },
    {
      title: 'CTAs that drive replies',
      body: 'Quick replies and buttons in templates so campaigns turn into conversations in your live inbox.',
    },
    {
      title: 'Schedule and segment',
      body: 'Plan broadcasts ahead, filter by tags, and retarget from real delivery and read analytics.',
    },
  ],
  cta: 'Explore campaigns',
  ctaHref: '/auth/register',
} as const;

export const pillarsSectionCopy = {
  eyebrow: 'Platform',
  titleMain: 'Everything your team needs',
  titleHighlight: 'in one WhatsApp OS',
  subtitle: 'Live chat, campaigns, flows, and reporting — built for clinics, institutes, stores, and ops teams.',
} as const;

export const marketingPillars = [
  {
    id: 'inbox',
    title: 'Live team inbox',
    description:
      'Multiple agents on one business number. Assign chats, use quick replies, and never lose context on a shared phone.',
    href: '/auth/register',
  },
  {
    id: 'campaigns',
    title: 'Campaigns & templates',
    description:
      'Import contacts, broadcast approved templates, and track delivered, read, and replied — from one dashboard.',
    href: '/auth/register',
  },
  {
    id: 'flows',
    title: 'Flow builder & automation',
    description:
      'Drag-and-drop chatbot journeys for FAQs, bookings, and handoff to humans when it matters.',
    href: '/auth/register',
  },
] as const;

export const whyWhatsAppCopy = {
  eyebrow: 'Why WhatsApp',
  titleMain: 'The channel customers',
  titleHighlight: 'already open',
  subtitle: 'High intent, high reach — when you use the official API and a real platform behind it.',
  stats: [
    { value: '98%', label: 'Average open rate' },
    { value: '45%+', label: 'Typical click-through' },
    { value: '2B+', label: 'Monthly active users' },
    { value: '7×', label: 'Vs email engagement' },
  ],
} as const;

export const capabilitiesSectionCopy = {
  eyebrow: 'Capabilities',
  titleMain: 'Built for teams that',
  titleHighlight: 'run on conversations',
  subtitle: 'From first template to scaled operations — without stitching five tools together.',
} as const;

export const marketingCapabilities = [
  {
    id: 'live-chat',
    mock: 'liveChat',
    title: 'Multi-agent live chat',
    body: 'Route chats by campaign, tag, or agent. One number, full team visibility.',
  },
  {
    id: 'analytics',
    mock: 'analytics',
    title: 'Real-time campaign analytics',
    body: 'See delivery, reads, and clicks as they happen — then retarget smartly.',
  },
  {
    id: 'flow-builder',
    mock: 'flowBuilder',
    title: 'No-code flow builder',
    body: 'Automate FAQs, capture leads, and escalate to humans in minutes.',
  },
  {
    id: 'contacts',
    mock: 'contacts',
    title: 'Contact lists & compliance',
    body: 'Opt-in imports, suppression, and template categories aligned with Meta rules.',
  },
] as const;

export const trustApiSectionCopy = {
  eyebrow: 'Meta Cloud API',
  titleMain: 'Official WhatsApp Business API',
  titleHighlight: 'without the headache',
  subtitle:
    'Get verified on Meta’s Cloud API in a few guided steps — we handle the setup so you can message customers faster.',
  verificationSteps: [
    {
      step: 1,
      title: 'Connect Meta Business',
      body: 'Link Business Manager and create your WhatsApp Business Account (WABA).',
    },
    {
      step: 2,
      title: 'Verify business & number',
      body: 'Complete Meta business verification and register your WhatsApp number.',
    },
    {
      step: 3,
      title: 'Approve templates',
      body: 'Submit utility or marketing templates — we help you pass Meta review.',
    },
    {
      step: 4,
      title: 'Go live on Replysys',
      body: 'Send campaigns, manage inbox, and automate follow-ups from one dashboard.',
    },
  ],
  cta: 'Get started',
  ctaHref: '/auth/register',
} as const;

export const marketingFaqItems = [
  {
    q: 'What does Replysys do?',
    a: 'Replysys is a WhatsApp operations platform: live inbox, template campaigns, automation flows, contact management, and analytics on the official WhatsApp Business API.',
  },
  {
    q: 'Is this the official WhatsApp API?',
    a: 'Yes. We build on Meta’s WhatsApp Cloud API. You connect your business account and send through approved templates and session rules.',
  },
  {
    q: 'Can I use my existing business number?',
    a: 'In most cases you can migrate or register a number for API use. Our setup flow walks you through Meta’s requirements.',
  },
  {
    q: 'How is pricing handled?',
    a: 'Meta charges per conversation category. Replysys adds platform plans for seats, features, and support — see Pricing for details.',
  },
  {
    q: 'Who is Replysys for?',
    a: 'Healthcare clinics, education institutes, ecommerce brands, and any team that needs structured WhatsApp at scale — not ad-hoc chats on personal phones.',
  },
] as const;

export const finalCtaCopy = {
  title: 'Ready to run WhatsApp like a growth channel?',
  subtitle: 'Start with live inbox and campaigns. Add automation when your team is ready.',
  primary: 'Get free trial',
  secondary: 'Talk to sales',
} as const;
