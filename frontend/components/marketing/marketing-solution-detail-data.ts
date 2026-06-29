import type { LucideIcon } from 'lucide-react';
import { Building2, Megaphone, MessageSquare, Zap } from 'lucide-react';

export type HealthcarePainCard = {
  id: string;
  title: string;
  body: string;
  icon: 'calendar' | 'message' | 'users' | 'files';
  tone: 'rose' | 'amber' | 'violet' | 'sky';
};

export type SolutionDetailProofMock =
  | 'campaigns'
  | 'broadcast'
  | 'liveChat'
  | 'salesAnalytics'
  | 'agencyPortfolio';

export type SolutionDetailPageData = {
  slug: string;
  icon: LucideIcon;
  hero: {
    eyebrow: string;
    /** Optional one-liner under eyebrow (motion / market angle) */
    kicker?: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    /** Qualitative outcome badges — no fabricated stats */
    outcomeStrip?: readonly string[];
    /** Hide top “All solutions” link (e.g. cleaner hero) */
    hideBackLink?: boolean;
    /** Hide large icon tile above eyebrow */
    hideIcon?: boolean;
    /** Hide green industry / category pill at top of hero */
    hideEyebrow?: boolean;
    ctaBookDemo: string;
    ctaGetStarted: string;
    /** Small highlight line under hero CTAs (split layout) */
    ctaFootnote?: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    /** Short lead before bullets */
    lead?: string;
    bullets: readonly string[];
    /** `glass-row` = four glossy cards in one row (lg) */
    bulletLayout?: 'list' | 'glass-row';
    /** Full clinic-ops block: pain cards + before/after + stats */
    layout?: 'default' | 'healthcare-clinic-ops';
    painCards?: readonly HealthcarePainCard[];
  };
  helps: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    bullets: readonly { title: string; body: string; angle?: string }[];
    layout?: 'default' | 'sticky-notes';
  };
  proofMock: SolutionDetailProofMock;
  /** Headlines above the dashboard mock */
  proof?: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    /** `healthcare-product` = split headline + feature list + mock collage + journey bar */
    layout?: 'default' | 'healthcare-product';
    /** Mid-headline gradient phrase (healthcare-product) */
    titleGradient?: string;
    /** End headline accent phrase (healthcare-product) */
    titleAccent?: string;
    features?: readonly {
      title: string;
      body: string;
      icon: 'users' | 'message' | 'shield';
      tone: 'violet' | 'emerald' | 'sky';
    }[];
    staffActive?: number;
    journeySteps?: readonly {
      title: string;
      icon: 'calendar' | 'bell' | 'user' | 'document' | 'followup';
      tone: 'violet' | 'emerald' | 'sky' | 'orange';
    }[];
  };
  modules: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    items: readonly { label: string; shipped: boolean }[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle?: string;
    steps: readonly { title: string; body: string }[];
  };
  honesty: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle?: string;
    shipped: readonly string[];
    roadmap: readonly string[];
  };
  faq: readonly { q: string; a: string }[];
  /** Optional FAQ section headings (defaults otherwise) */
  faqIntro?: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle?: string;
  };
  cta: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    primary: string;
    secondary: string;
    secondaryHref: string;
  };
};

export const salesSolutionDetail: SolutionDetailPageData = {
  slug: 'sales',
  icon: Zap,
  hero: {
    eyebrow: 'Sales · WhatsApp Cloud API',
    kicker: 'Where your market already lives — turned into pipeline you can run and report on.',
    title: 'Turn replies into',
    titleHighlight: 'pipeline and revenue',
    subtitle:
      'Replysys connects sales to the official WhatsApp stack: one business number, owned threads, template follow-ups when the session resets, and campaigns for opted-in nurture — so momentum does not die in DMs.',
    outcomeStrip: [
      'Lead-to-owner clarity',
      'Faster conversation SLAs',
      'Template-safe outreach',
      'Repeatable revenue motions',
    ],
    hideBackLink: true,
    hideIcon: true,
    ctaBookDemo: 'See it on a live walkthrough',
    ctaGetStarted: 'Start closing on Replysys',
  },
  problem: {
    eyebrow: 'Revenue leak',
    title: 'Growth stalls when WhatsApp',
    titleHighlight: 'is treated as a chat app',
    subtitle: 'Sales needs a system, not another inbox tab.',
    lead:
      'Buyers expect instant answers on WhatsApp; without ownership, templates, and routing, teams leave money on the table every week.',
    bullets: [
      'High-intent leads bounce between personal phones — no single source of truth for the deal',
      'Revenue timing suffers when follow-up depends on “someone saw the message” instead of assigned owners',
      'After the Meta session window resets, teams either go silent or risk non-compliant sends',
      'Leadership lacks visibility into response discipline, pipeline hygiene, and WhatsApp spend in one place',
    ],
  },
  helps: {
    eyebrow: 'How Replysys lifts sales',
    title: 'Operational rigor',
    titleHighlight: 'for high-intent WhatsApp',
    subtitle:
      'Run the same motions you would demand in CRM — now on the channel that actually gets opened.',
    bullets: [
      {
        title: 'Pipeline you can trust',
        angle: 'Ownership',
        body: 'Every inbound thread lands in Replysys with assignment, tags, and notes — so AE and SDR roles know who owns the revenue conversation end to end.',
      },
      {
        title: 'Momentum when the clock matters',
        angle: 'SLA & session',
        body: 'Respond in-session for real-time selling; when the window resets, continue with approved Meta templates so outreach stays legal and consistent.',
      },
      {
        title: 'Market expansion without spray-and-pray',
        angle: 'Growth',
        body: 'Reach opted-in segments with broadcasts, read who engaged, and prioritize the next call or demo — built for teams that care about LTV, not blast volume.',
      },
    ],
  },
  proofMock: 'salesAnalytics',
  proof: {
    eyebrow: 'Product depth',
    title: 'Reply and pipeline',
    titleHighlight: 'analytics in one place',
    subtitle:
      'See inbound volume, response discipline, and which threads still need a rep — the sales signals you need for weekly reviews, without stitching exports.',
  },
  modules: {
    eyebrow: 'What ships today',
    title: 'Everything sales needs',
    titleHighlight: 'without bolting on tools',
    items: [
      { label: 'Leads & contacts — segment, tag, and revisit', shipped: true },
      { label: 'Live multi-agent inbox — clear ownership on one number', shipped: true },
      { label: 'Template sends & compliance guardrails', shipped: true },
      { label: 'Broadcasts & performance signals for nurture', shipped: true },
      { label: 'Flow builder — qualify, capture, escalate to human', shipped: true },
    ],
  },
  workflow: {
    eyebrow: 'Revenue motion',
    title: 'From intent',
    titleHighlight: 'to booked revenue',
    subtitle: 'Five minutes to understand. One platform to run it daily.',
    steps: [
      {
        title: 'Capture demand',
        body: 'Inbound wa.me, referral links, or reply to a campaign drops into Replysys with timestamps and context — no more “which phone has the lead?”.',
      },
      {
        title: 'Qualify with speed',
        body: 'Routing, quick replies, or a flow capture budget, timing, and objections while the buyer is still warm.',
      },
      {
        title: 'Accelerate the deal',
        body: 'Persisted threads + internal notes keep AE/SDR coordination tight; leadership sees who is waiting and for how long.',
      },
      {
        title: 'Grow the account',
        body: 'Reuse opted-in lists for updates, upsell, or renewals — with delivery and read visibility for the next play.',
      },
    ],
  },
  honesty: {
    eyebrow: 'What we promise',
    title: 'Replysys today',
    titleHighlight: 'vs what is next',
    subtitle: 'No vanity metrics — just the modules you can turn on now, and the automation we are building next.',
    shipped: [
      'Assignments, queues, templates, broadcasts, flows, analytics, and INR category visibility',
      'Multi-agent collaboration on verified Cloud API numbers',
      'Industry depth (e.g. healthcare) optional when clinics need CRM-grade workflows',
    ],
    roadmap: [
      'Drip sequencing for long-cycle nurture automation',
      'AI drafting on top of your approved templates — not a black-box bot',
    ],
  },
  faqIntro: {
    eyebrow: 'Sales FAQ',
    title: 'Pricing, pipeline,',
    titleHighlight: 'and compliance',
    subtitle: 'Straight answers for revenue and growth leaders evaluating WhatsApp as a revenue channel.',
  },
  faq: [
    {
      q: 'How do we protect WhatsApp ROI when Meta pricing changes?',
      a: 'Replysys surfaces Meta conversation categories and INR spend beside campaign performance — finance and growth review the same numbers, then adjust segmentation or cadence without losing pipeline visibility.',
    },
    {
      q: 'Can we migrate our existing WhatsApp Business number?',
      a: 'In most cases yes — Meta onboarding and verification are required. Replysys walks you through WABA linkage, templates, and go-live checkpoints.',
    },
    {
      q: 'Does marketing need opt-in lists before broadcasts?',
      a: 'Yes. Marketing-category templates demand consent. Replysys segmentation keeps nurture aligned with WhatsApp policies so Sales and Marketing stay aligned legally.',
    },
  ],
  cta: {
    title: 'Put WhatsApp revenue',
    titleHighlight: 'on your operating rhythm',
    subtitle:
      'Book a demo to map your funnel, SLA, and template strategy — or launch a project today and connect your Cloud API number.',
    primary: 'Book a revenue walkthrough',
    secondary: 'Create your Replysys workspace',
    secondaryHref: '/auth/register',
  },
};

export const supportSolutionDetail: SolutionDetailPageData = {
  slug: 'support',
  icon: MessageSquare,
  hero: {
    eyebrow: 'Support · WhatsApp Cloud API',
    kicker: 'One thread, full history — so agents stop re-asking and customers stop waiting.',
    title: 'Resolve faster with',
    titleHighlight: 'shared context and SLAs',
    subtitle:
      'Replysys brings every WhatsApp conversation into a multi-agent inbox on the official API: assignment, internal notes, quick replies, and visible handoffs — so support keeps pace without leaking chats to personal phones.',
    outcomeStrip: [
      'Clear ownership per thread',
      'Consistent answers at scale',
      'Session + template continuity',
      'Audit-friendly history',
    ],
    ctaBookDemo: 'See the inbox on a walkthrough',
    ctaGetStarted: 'Run support on Replysys',
  },
  problem: {
    eyebrow: 'Support debt',
    title: 'Volume wins when WhatsApp',
    titleHighlight: 'is scattered across people',
    subtitle: 'Customers expect instant help; teams need a system that scales beyond one device.',
    lead:
      'Without routing, saved replies, and a single record of the thread, every new agent rebuilds context — and every delay costs CSAT and repeat tickets.',
    bullets: [
      'Shared “company WhatsApp” on one phone becomes a bottleneck when volume spikes or shifts across time zones',
      'Handoffs break: the next agent does not see prior messages, tags, or internal notes',
      'After the session window closes, teams either ghost the customer or improvise sends outside template policy',
      'Leaders cannot see queue health, first-response discipline, or what is still waiting on a reply',
    ],
  },
  helps: {
    eyebrow: 'How Replysys lifts support',
    title: 'Operational calm',
    titleHighlight: 'for high-volume chat',
    subtitle:
      'Treat WhatsApp like the channel it is — with the same rigor you expect from a helpdesk stack.',
    bullets: [
      {
        title: 'Inbox that scales with your team',
        angle: 'Routing',
        body: 'Multiple agents on one verified number: assign conversations, see open vs resolved, and keep ownership visible so nothing sits unowned in peak hours.',
      },
      {
        title: 'Answers that stay on-brand',
        angle: 'Speed',
        body: 'Quick replies for repeat questions, templates when the Meta window resets, and persisted history so customers are not asked the same thing twice.',
      },
      {
        title: 'From ticket to closure',
        angle: 'Quality',
        body: 'Tags, notes, and full message context give QA and team leads a real picture of what was promised — without exporting screenshots from personal devices.',
      },
    ],
  },
  proofMock: 'liveChat',
  proof: {
    eyebrow: 'Product depth',
    title: 'Live chat your agents',
    titleHighlight: 'actually live in',
    subtitle: 'The same surface for real-time replies, handoffs, and reads — built on Cloud API, not a shadow app.',
  },
  modules: {
    eyebrow: 'What ships today',
    title: 'Support-ready',
    titleHighlight: 'out of the box',
    items: [
      { label: 'Multi-agent inbox with assignment and conversation list', shipped: true },
      { label: 'Customer profile + tags + internal notes', shipped: true },
      { label: 'Quick replies and template sends within policy', shipped: true },
      { label: 'Flows for deflection, capture, and escalate to human', shipped: true },
      { label: 'Organization projects for multi-brand or BPO-style ops', shipped: true },
    ],
  },
  workflow: {
    eyebrow: 'Support motion',
    title: 'From ping',
    titleHighlight: 'to resolved',
    subtitle: 'A straight path your team can repeat under load.',
    steps: [
      {
        title: 'Intake on one number',
        body: 'Inbound WhatsApp lands in Replysys with timestamps; routing rules or manual assign put a named owner on the thread immediately.',
      },
      {
        title: 'Resolve in-session',
        body: 'Agents use quick replies and full history; notes stay internal so the next shift picks up without a customer-visible mess.',
      },
      {
        title: 'Continue when the window resets',
        body: 'Approved templates re-open the line when policy requires it — no ad-hoc sends from unofficial tools.',
      },
      {
        title: 'Learn and tighten',
        body: 'Tags and conversation states show what repeats; leadership reviews queue behavior alongside Meta spend in one workspace.',
      },
    ],
  },
  honesty: {
    eyebrow: 'What we promise',
    title: 'Replysys today',
    titleHighlight: 'vs what is next',
    subtitle: 'Honest about what you can run now — and what we are still sharpening for advanced support programs.',
    shipped: [
      'Shared inbox, assignments, templates, flows, tags, and organization-level projects',
      'Live chat experience aligned with Cloud API messaging rules',
      'Visibility into conversation categories and INR usage for finance and ops reviews',
    ],
    roadmap: [
      'Deeper SLA clock and escalation automations for enterprise support contracts',
      'Ticketing system bidirectional sync where teams need a formal ticket ID',
    ],
  },
  faqIntro: {
    eyebrow: 'Support FAQ',
    title: 'Agents, compliance,',
    titleHighlight: 'and handoffs',
    subtitle: 'Common questions from CX leads moving WhatsApp off personal devices.',
  },
  faq: [
    {
      q: 'Can multiple agents use the same WhatsApp Business number?',
      a: 'Yes on the official Cloud API through Replysys: conversations appear in a shared inbox with assignment instead of one phone login.',
    },
    {
      q: 'What happens when the 24-hour customer care session ends?',
      a: 'You continue with Meta-approved templates for the right category, or wait for the customer to message again. Replysys keeps template sends inside policy so you are not guessing.',
    },
    {
      q: 'Do we lose history if an agent leaves?',
      a: 'Conversation history lives in the project, not on an individual device — new agents see the full thread, tags, and notes permitted by your roles.',
    },
  ],
  cta: {
    title: 'Make WhatsApp support',
    titleHighlight: 'measurable and safe',
    subtitle:
      'Book a demo to walk your queue, routing, and template strategy — or create a workspace and connect your Cloud API number.',
    primary: 'Book a support walkthrough',
    secondary: 'Create your Replysys workspace',
    secondaryHref: '/auth/register',
  },
};

export const marketingSolutionDetail: SolutionDetailPageData = {
  slug: 'marketing',
  icon: Megaphone,
  hero: {
    eyebrow: 'Marketing · WhatsApp Cloud API',
    kicker: 'Opt-in first, template-safe — so growth teams scale sends without gambling on policy.',
    title: 'Turn broadcasts into',
    titleHighlight: 'signal-led growth',
    subtitle:
      'Replysys runs marketing on the official stack: segment opted-in contacts, schedule template broadcasts, and see delivered, read, and reply — then double down on who actually engaged.',
    outcomeStrip: [
      'Consent-aware segments',
      'Template governance',
      'Read and reply visibility',
      'Retarget with context',
    ],
    ctaBookDemo: 'See broadcasts in a walkthrough',
    ctaGetStarted: 'Grow on Replysys',
  },
  problem: {
    eyebrow: 'Growth friction',
    title: 'Campaigns stall when WhatsApp',
    titleHighlight: 'is treated like email blast',
    subtitle: 'The channel works — until lists, templates, and measurement are improvised.',
    lead:
      'Without opt-in discipline and a single place to approve templates, marketing either under-sends or risks account health — and leadership still lacks honest engagement signals.',
    bullets: [
      'Broadcasts go out blind: who received, read, or replied is scattered across exports and screenshots',
      'Segments drift from real consent; teams mix promotional sends with care conversations and confuse categories',
      'Retargeting becomes guesswork when replies are not tied to tags, lists, or the next approved template',
      'Finance and growth rarely share one view of marketing-category spend next to campaign outcomes',
    ],
  },
  helps: {
    eyebrow: 'How Replysys lifts marketing',
    title: 'Measured reach',
    titleHighlight: 'on a channel people open',
    subtitle:
      'Run growth motions with the same compliance bar Meta enforces — inside one workspace.',
    bullets: [
      {
        title: 'Lists you can defend',
        angle: 'Opt-in',
        body: 'Tag and segment contacts with clear opt-in posture; keep nurture aligned with template category rules so promotional sends stay defendable in review.',
      },
      {
        title: 'Broadcasts with feedback',
        angle: 'Performance',
        body: 'Schedule template campaigns, watch delivery and reads, and prioritize follow-up for responders — not vanity volume.',
      },
      {
        title: 'From broadcast to conversation',
        angle: 'Lifecycle',
        body: 'When someone replies, the thread lives in the same inbox your team already uses — so marketing and sales see one history instead of siloed chats.',
      },
    ],
  },
  proofMock: 'broadcast',
  proof: {
    eyebrow: 'Product depth',
    title: 'Broadcast health',
    titleHighlight: 'growth leads trust',
    subtitle: 'Delivery, reads, and engagement in one dashboard — beside the Meta categories your finance team cares about.',
  },
  modules: {
    eyebrow: 'What ships today',
    title: 'Marketing essentials',
    titleHighlight: 'without duct tape',
    items: [
      { label: 'Contacts, tags, and segments for nurture', shipped: true },
      { label: 'Template library and compliant sends', shipped: true },
      { label: 'Broadcasts with delivery and read signals', shipped: true },
      { label: 'Campaign analytics and retarget workflows', shipped: true },
      { label: 'Flows for capture, qualification, and handoff', shipped: true },
    ],
  },
  workflow: {
    eyebrow: 'Growth motion',
    title: 'From audience',
    titleHighlight: 'to next best send',
    subtitle: 'Repeatable steps for teams that care about LTV, not one-off blasts.',
    steps: [
      {
        title: 'Build segments with consent',
        body: 'Import or collect opt-ins, tag by interest or lifecycle stage, and keep promotional lists distinct from transactional care traffic.',
      },
      {
        title: 'Ship approved templates',
        body: 'Work inside Meta-approved templates for marketing category sends; Replysys tracks what went out and to whom.',
      },
      {
        title: 'Read the room',
        body: 'Use delivery and read signals to trim fatigued lists and prioritize cohorts that still engage.',
      },
      {
        title: 'Convert replies',
        body: 'Inbound replies land in the shared inbox with full context — route to sales or support without losing the campaign story.',
      },
    ],
  },
  honesty: {
    eyebrow: 'What we promise',
    title: 'Replysys today',
    titleHighlight: 'vs what is next',
    subtitle: 'Straight about growth features you can use now — and automation we are still building.',
    shipped: [
      'Broadcasts, segments, templates, campaign reporting, and INR category visibility for finance reviews',
      'Official Cloud API sends with policy-aligned template workflows',
      'Shared inbox handoff when campaigns spark 1:1 conversations',
    ],
    roadmap: [
      'Drip sequences for long-cycle nurture after opt-in',
      'Deeper creative testing and holdout groups for broadcast programs',
    ],
  },
  faqIntro: {
    eyebrow: 'Marketing FAQ',
    title: 'Opt-in, templates,',
    titleHighlight: 'and measurement',
    subtitle: 'Questions growth and compliance leads ask before scaling WhatsApp programs.',
  },
  faq: [
    {
      q: 'Do we need explicit opt-in for marketing broadcasts?',
      a: 'Yes for healthy programs. Replysys helps you organize segments and template categories so promotional traffic stays consistent with WhatsApp and your own policy.',
    },
    {
      q: 'Can we see reads and replies in one place?',
      a: 'Campaign performance surfaces delivery and engagement signals in Replysys so you retarget off real behavior, not assumptions.',
    },
    {
      q: 'How do we coordinate with sales after a blast?',
      a: 'Replies become normal conversations in the same inbox — with tags and history so outbound and inbound motions stay connected.',
    },
  ],
  cta: {
    title: 'Run WhatsApp growth',
    titleHighlight: 'with adult supervision',
    subtitle:
      'Book a demo to review your segments, templates, and reporting — or launch a project and connect your Cloud API number.',
    primary: 'Book a growth walkthrough',
    secondary: 'Create your Replysys workspace',
    secondaryHref: '/auth/register',
  },
};

export const agenciesSolutionDetail: SolutionDetailPageData = {
  slug: 'agencies',
  icon: Building2,
  hero: {
    eyebrow: 'Agencies · WhatsApp Cloud API',
    kicker: 'One Replysys org — a project per client so brands never bleed together.',
    title: 'Multi-client workspaces',
    titleHighlight: 'without login chaos',
    subtitle:
      'Run each customer on their own number, templates, inbox, and billing view — with a portfolio rollup so your leadership sees WhatsApp volume, spend, and health across every account you manage.',
    outcomeStrip: [
      'Per-client isolation',
      'Portfolio visibility',
      'INR spend transparency',
      'Faster client onboarding',
    ],
    ctaBookDemo: 'See multi-project in a walkthrough',
    ctaGetStarted: 'Run your agency on Replysys',
  },
  problem: {
    eyebrow: 'Ops drag',
    title: 'Delivery slows when teams',
    titleHighlight: 'juggle client logins',
    subtitle: 'Agencies scale on repetition — until every brand needs its own WhatsApp reality.',
    lead:
      'Switching accounts, copying templates wrong, or sending from the wrong WABA erodes trust and billing accuracy.',
    bullets: [
      'Separate Meta Business assets per client make “one dashboard” impossible with consumer WhatsApp tools',
      'Cross-client mistakes destroy credibility — one wrong template or number wrecks a QBR',
      'Finance cannot reconcile Meta spend and outcomes when usage lives in fifteen inboxes',
      'Onboarding each new client takes ops time you cannot bill if setup is bespoke every time',
    ],
  },
  helps: {
    eyebrow: 'How Replysys lifts agencies',
    title: 'Multi-project,',
    titleHighlight: 'per-client numbers',
    subtitle:
      'Replysys is built for organizations that operate many WhatsApp programs at once — with guardrails.',
    bullets: [
      {
        title: 'Hard separation between clients',
        angle: 'Isolation',
        body: 'Projects get their own Cloud API numbers, template libraries, inboxes, and agent access — so work stays inside the right brand boundary.',
      },
      {
        title: 'Roll-up your whole book',
        angle: 'Portfolio',
        body: 'Leadership sees aggregate volume, engagement, and INR category spend without logging into each client workspace.',
      },
      {
        title: 'Ship faster for retainers',
        angle: 'Velocity',
        body: 'Reuse playbooks — flows, quick replies, and campaign skeletons — then customize per client without rebuilding from zero.',
      },
    ],
  },
  proofMock: 'agencyPortfolio',
  proof: {
    eyebrow: 'Product depth',
    title: 'One org. Every client.',
    titleHighlight: 'Portfolio clarity',
    subtitle:
      'Roll up WhatsApp volume, spend signals, and per-client health — so agency leadership sees impact without juggling seventeen logins.',
  },
  modules: {
    eyebrow: 'What ships today',
    title: 'Built for multi-account',
    titleHighlight: 'delivery teams',
    items: [
      { label: 'Organization with multiple projects per client brand', shipped: true },
      { label: 'Per-project numbers, templates, inbox, and roles', shipped: true },
      { label: 'Credits and INR visibility for client billing reviews', shipped: true },
      { label: 'Campaigns, broadcasts, and analytics scoped per project', shipped: true },
      { label: 'Healthcare / vertical modules when a client needs depth', shipped: true },
    ],
  },
  workflow: {
    eyebrow: 'Agency motion',
    title: 'From signed SOW',
    titleHighlight: 'to live WABA',
    subtitle: 'A repeatable path your ops team can run with confidence.',
    steps: [
      {
        title: 'Provision the workspace',
        body: 'Create a project for the client, connect their WABA, and invite their team with the right roles.',
      },
      {
        title: 'Clone your playbook',
        body: 'Start from your agency baseline — templates, flows, and segments — then tailor naming and policy per brand.',
      },
      {
        title: 'Run and report',
        body: 'Agents work only inside the client project; your PMs pull delivery and spend from one org view.',
      },
      {
        title: 'Grow the retainer',
        body: 'Add campaigns, chatbots, or vertical modules as scope expands — without a new stack per logo.',
      },
    ],
  },
  honesty: {
    eyebrow: 'What we promise',
    title: 'Replysys today',
    titleHighlight: 'vs what is next',
    subtitle: 'Solid on separation and reporting — honest about roadmap for heavier PSA tooling.',
    shipped: [
      'Multi-project orgs, role separation, and per-project Meta spend in INR',
      'Campaign, inbox, and template isolation clients expect from a serious agency partner',
    ],
    roadmap: [
      'Client-facing read-only dashboards for optional transparency',
      'Tighter PSA / ticketing handoff for enterprises that demand ticket IDs',
    ],
  },
  faqIntro: {
    eyebrow: 'Agency FAQ',
    title: 'Separation, billing',
    titleHighlight: 'and access',
    subtitle: 'What partner leads ask before moving clients onto Replysys.',
  },
  faq: [
    {
      q: 'Can clients see each other’s data?',
      a: 'No — projects are isolated. Users you invite only see the workspaces you grant. Your org admins manage membership centrally.',
    },
    {
      q: 'How do we bill Meta pass-through fairly?',
      a: 'Spend and categories surface per project in INR so your finance team can map costs to client contracts and retainers.',
    },
    {
      q: 'Do you support white-label or sub-agency models?',
      a: 'Replysys is built for multi-project delivery today; white-label packaging varies — talk to us on a demo about your model.',
    },
  ],
  cta: {
    title: 'Run more WhatsApp clients',
    titleHighlight: 'with fewer mistakes',
    subtitle:
      'Book a portfolio walkthrough — or create an org and map your first three client projects.',
    primary: 'Book an agency walkthrough',
    secondary: 'Create your Replysys org',
    secondaryHref: '/auth/register',
  },
};

export const SOLUTION_DETAIL_ROUTES: Record<string, string> = {
  'solution-sales': '/marketing/solutions/sales',
  'solution-support': '/marketing/solutions/support',
  'solution-marketing': '/marketing/solutions/marketing',
  'solution-agencies': '/marketing/solutions/agencies',
};
