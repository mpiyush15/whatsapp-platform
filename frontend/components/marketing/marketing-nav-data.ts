import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  Building2,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Megaphone,
  MessageSquare,
  Plane,
  ShoppingBag,
  Store,
  Users,
  UtensilsCrossed,
  Workflow,
  Zap,
} from 'lucide-react';

export type MegaMenuItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export type MegaMenuSection = {
  heading: string;
  items: MegaMenuItem[];
};

export type MegaMenuConfig = {
  id: string;
  label: string;
  /** Top-level nav click destination (hub page) */
  href: string;
  sections: MegaMenuSection[];
};

export const marketingMegaMenus: MegaMenuConfig[] = [
  {
    id: 'solutions',
    label: 'Solutions',
    href: '/marketing/solutions',
    sections: [
      {
        heading: 'By use case',
        items: [
          {
            title: 'Sales & outbound',
            description: 'Qualify leads and close deals in WhatsApp threads.',
            icon: Zap,
            href: '/marketing/solutions/sales',
          },
          {
            title: 'Customer support',
            description: 'Shared inbox, assignments, and faster first response.',
            icon: MessageSquare,
            href: '/marketing/solutions/support',
          },
          {
            title: 'Marketing & growth',
            description: 'Broadcasts, segments, and retargeting on opted-in lists.',
            icon: Megaphone,
            href: '/marketing/solutions/marketing',
          },
          {
            title: 'Agencies & resellers',
            description: 'Manage multiple client workspaces from one login.',
            icon: Building2,
            href: '/marketing/solutions/agencies',
          },
        ],
      },
      {
        heading: 'By team size',
        items: [
          {
            title: 'Startups',
            description: 'Launch on Cloud API without heavy setup.',
            icon: Zap,
            href: '/pricing',
          },
          {
            title: 'Growing teams',
            description: 'Roles, projects, and analytics as you scale.',
            icon: Users,
            href: '/pricing',
          },
          {
            title: 'Enterprise',
            description: 'Multi-project orgs, compliance, and usage controls.',
            icon: Building2,
            href: '/pricing',
          },
        ],
      },
      {
        heading: 'Platform',
        items: [
          {
            title: 'WhatsApp Cloud API',
            description: 'Official Meta onboarding and number management.',
            icon: MessageSquare,
            href: '/marketing#api',
          },
          {
            title: 'Templates & compliance',
            description: 'Utility, marketing, and auth templates that pass review.',
            icon: Workflow,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Credits & billing',
            description: 'Transparent usage, invoices, and top-ups.',
            icon: BarChart3,
            href: '/pricing',
          },
        ],
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    href: '/marketing/features',
    sections: [
      {
        heading: 'Messaging',
        items: [
          {
            title: 'Live team inbox',
            description: 'Real-time chat with tags, notes, and assignment.',
            icon: MessageSquare,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Templates & quick replies',
            description: 'Approved templates and saved responses.',
            icon: Workflow,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Multi-agent collaboration',
            description: 'Handoffs, internal notes, and presence.',
            icon: Users,
            href: '/marketing/features#features-grid',
          },
        ],
      },
      {
        heading: 'Growth',
        items: [
          {
            title: 'Campaigns & broadcasts',
            description: 'Schedule sends to segments with delivery stats.',
            icon: Megaphone,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Chatbots & flows',
            description: 'Visual builder for FAQs and lead capture.',
            icon: Bot,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Contacts & CRM',
            description: 'Segments, custom fields, and conversation history.',
            icon: Users,
            href: '/marketing/features#features-grid',
          },
        ],
      },
      {
        heading: 'Intelligence',
        items: [
          {
            title: 'Analytics & reporting',
            description: 'Volume, delivery, team performance, and Meta cost.',
            icon: BarChart3,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Healthcare module',
            description: 'Appointments, reminders, and patient workflows.',
            icon: HeartPulse,
            href: '/marketing/features#healthcare-callout',
          },
          {
            title: 'API & webhooks',
            description: 'Connect your stack with events and REST APIs.',
            icon: Zap,
            href: '/marketing#api',
          },
        ],
      },
    ],
  },
  {
    id: 'industry',
    label: 'Industry',
    href: '/solutions#industries',
    sections: [
      {
        heading: 'Popular verticals',
        items: [
          {
            title: 'Healthcare & clinics',
            description: 'Appointments, reminders, and patient engagement.',
            icon: HeartPulse,
            href: '/solutions/healthcare',
          },
          {
            title: 'E-commerce & D2C',
            description: 'Order updates, cart recovery, and support at scale.',
            icon: ShoppingBag,
            href: '/solutions/ecommerce',
          },
          {
            title: 'Real estate',
            description: 'Lead nurture, site visits, and broker coordination.',
            icon: Home,
            href: '/solutions/realestate',
          },
        ],
      },
      {
        heading: 'More industries',
        items: [
          {
            title: 'Education & edtech',
            description: 'Admissions, class updates, and parent comms.',
            icon: GraduationCap,
            href: '/solutions/education',
          },
          {
            title: 'Food & beverage',
            description: 'Orders, delivery tracking, and loyalty offers.',
            icon: UtensilsCrossed,
            href: '/solutions/food-beverage',
          },
          {
            title: 'Financial services',
            description: 'Secure alerts, KYC nudges, and service updates.',
            icon: Landmark,
            href: '/solutions/financial-services',
          },
          {
            title: 'Travel & tourism',
            description: 'Bookings, travel-day updates, and loyalty campaigns.',
            icon: Plane,
            href: '/solutions/travel-tourism',
          },
          {
            title: 'SaaS & technology',
            description: 'Onboarding, renewals, and CS on WhatsApp.',
            icon: Zap,
            href: '/solutions/saas-tech',
          },
        ],
      },
      {
        heading: 'Why verticals matter',
        items: [
          {
            title: 'Pre-built workflows',
            description: 'Start from patterns that match your business model.',
            icon: Workflow,
            href: '/marketing/solutions',
          },
          {
            title: 'Compliance-ready messaging',
            description: 'Template categories aligned to regulated industries.',
            icon: Store,
            href: '/marketing/features#compare-honest',
          },
          {
            title: 'Multi-vertical orgs',
            description: 'Run WhatsApp, healthcare, and retail from one account.',
            icon: Building2,
            href: '/marketing/solutions#industries',
          },
        ],
      },
    ],
  },
];

export const marketingSimpleNav = [
  { id: 'home', label: 'Home', href: '/marketing' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
] as const;

/** Flatten mega menu items for footer columns */
export function megaMenuFooterLinks(menuId: string, max = 6) {
  const menu = marketingMegaMenus.find((m) => m.id === menuId);
  if (!menu) return [];
  const items = menu.sections.flatMap((s) => s.items);
  return items.slice(0, max).map((item) => ({
    label: item.title,
    href: item.href,
  }));
}
