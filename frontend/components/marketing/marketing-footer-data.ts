import { megaMenuFooterLinks } from '@/components/marketing/marketing-nav-data';

export type FooterLink = { label: string; href: string };

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const marketingFooterProductLinks: FooterLink[] = [
  { label: 'Home', href: '/marketing' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Solutions hub', href: '/marketing/solutions' },
  { label: 'Features', href: '/marketing/features' },
  { label: 'Broadcasts', href: '/marketing#broadcast' },
  { label: 'Platform', href: '/marketing#platform' },
  { label: 'Why WhatsApp', href: '/marketing#why-whatsapp' },
  { label: 'Official API', href: '/marketing#api' },
  { label: 'FAQ', href: '/marketing#faq' },
];

export const marketingFooterCompanyLinks: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export const marketingFooterColumns: FooterColumn[] = [
  {
    title: 'Solutions',
    links: megaMenuFooterLinks('solutions', 6),
  },
  {
    title: 'Features',
    links: megaMenuFooterLinks('features', 6),
  },
  {
    title: 'Industry',
    links: megaMenuFooterLinks('industry', 6),
  },
];

export const marketingFooterCopy = {
  tagline:
    'WhatsApp operations for teams that sell, support, and scale — live inbox, campaigns, flows, and analytics on Meta’s Cloud API.',
  companyLine: 'A product of Pixels Digital Solutions',
  metaBadgeTitle: 'Meta Business Partner',
  metaBadgeSubtitle: 'Official WhatsApp Business Platform',
} as const;
