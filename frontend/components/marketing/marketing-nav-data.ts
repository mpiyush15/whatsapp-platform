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
    label: 'Use cases',
    href: '/marketing/solutions',
    sections: [
      {
        heading: 'What you want to do',
        items: [
          {
            title: 'Sales on WhatsApp',
            description: 'Reply to new customers fast and keep every chat in one place.',
            icon: Zap,
            href: '/marketing/solutions/sales',
          },
          {
            title: 'Customer support',
            description: 'One inbox for your team — assign chats and reply quicker.',
            icon: MessageSquare,
            href: '/marketing/solutions/support',
          },
          {
            title: 'Promotions & bulk messages',
            description: 'Send offers and updates to customers who opted in.',
            icon: Megaphone,
            href: '/marketing/solutions/marketing',
          },
          {
            title: 'Agencies managing clients',
            description: 'Run WhatsApp for many clients from one login.',
            icon: Building2,
            href: '/marketing/solutions/agencies',
          },
        ],
      },
      {
        heading: 'Size of your team',
        items: [
          {
            title: 'Small business',
            description: 'Get started on official WhatsApp without a long setup.',
            icon: Zap,
            href: '/pricing',
          },
          {
            title: 'Growing teams',
            description: 'Add staff, see reports, and stay organized as you grow.',
            icon: Users,
            href: '/pricing',
          },
          {
            title: 'Large organizations',
            description: 'Multiple brands, clear limits, and controls for big teams.',
            icon: Building2,
            href: '/pricing',
          },
        ],
      },
      {
        heading: 'How it works',
        items: [
          {
            title: 'Official WhatsApp Business',
            description: 'Connect your business number the right way with Meta.',
            icon: MessageSquare,
            href: '/marketing#api',
          },
          {
            title: 'Ready-made message formats',
            description: 'Templates WhatsApp approves before you send.',
            icon: Workflow,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Message balance & payments',
            description: 'See usage, invoices, and top up when you need more.',
            icon: BarChart3,
            href: '/pricing',
          },
        ],
      },
    ],
  },
  {
    id: 'features',
    label: 'What you get',
    href: '/marketing/features',
    sections: [
      {
        heading: 'Chats & replies',
        items: [
          {
            title: 'Team WhatsApp inbox',
            description: 'Everyone sees the same chats live — tags, notes, and handoffs.',
            icon: MessageSquare,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Saved replies & approved messages',
            description: 'Quick answers your team uses every day.',
            icon: Workflow,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Several staff, one number',
            description: 'Pass chats between people and add private team notes.',
            icon: Users,
            href: '/marketing/features#features-grid',
          },
        ],
      },
      {
        heading: 'Marketing & sales',
        items: [
          {
            title: 'Bulk message campaigns',
            description: 'Schedule messages to customer groups and see who read them.',
            icon: Megaphone,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Auto-replies & menus',
            description: 'Answer common questions automatically — no coding needed.',
            icon: Bot,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Customer list & history',
            description: 'All contacts, groups, and past chats in one place.',
            icon: Users,
            href: '/marketing/features#features-grid',
          },
        ],
      },
      {
        heading: 'Reports & add-ons',
        items: [
          {
            title: 'Reports & message stats',
            description: 'See volume, campaign results, and WhatsApp costs in INR.',
            icon: BarChart3,
            href: '/marketing/features#features-grid',
          },
          {
            title: 'Clinics & hospitals tools',
            description: 'Appointments, reminders, and patient messages.',
            icon: HeartPulse,
            href: '/marketing/features#healthcare-callout',
          },
          {
            title: 'Connect other software',
            description: 'Link Replysys to tools you already use.',
            icon: Zap,
            href: '/marketing#api',
          },
        ],
      },
    ],
  },
  {
    id: 'industry',
    label: 'For your business',
    href: '/solutions#industries',
    sections: [
      {
        heading: 'Popular businesses',
        items: [
          {
            title: 'Healthcare & clinics',
            description: 'Appointments, reminders, and patient messages.',
            icon: HeartPulse,
            href: '/solutions/healthcare',
          },
          {
            title: 'Online shops',
            description: 'Order updates, cart reminders, and customer support.',
            icon: ShoppingBag,
            href: '/solutions/ecommerce',
          },
          {
            title: 'Real estate',
            description: 'Follow up with buyers and coordinate your team.',
            icon: Home,
            href: '/solutions/realestate',
          },
        ],
      },
      {
        heading: 'More business types',
        items: [
          {
            title: 'Schools & coaching',
            description: 'Admissions, class updates, and parent messages.',
            icon: GraduationCap,
            href: '/solutions/education',
          },
          {
            title: 'Food & beverage',
            description: 'Orders, delivery updates, and loyalty offers.',
            icon: UtensilsCrossed,
            href: '/solutions/food-beverage',
          },
          {
            title: 'Banks & finance',
            description: 'Alerts, verification reminders, and service updates.',
            icon: Landmark,
            href: '/solutions/financial-services',
          },
          {
            title: 'Travel & tourism',
            description: 'Bookings, trip updates, and loyalty messages.',
            icon: Plane,
            href: '/solutions/travel-tourism',
          },
          {
            title: 'Software companies',
            description: 'Welcome messages, renewals, and support on WhatsApp.',
            icon: Zap,
            href: '/solutions/saas-tech',
          },
        ],
      },
      {
        heading: 'Why pick your business type',
        items: [
          {
            title: 'Ready setups',
            description: 'Start with layouts that fit how you work.',
            icon: Workflow,
            href: '/marketing/solutions',
          },
          {
            title: 'Messages WhatsApp allows',
            description: 'Formats that pass review for your industry.',
            icon: Store,
            href: '/marketing/features#compare-honest',
          },
          {
            title: 'Shop + clinic, one account',
            description: 'Run different businesses from one login.',
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
