import { megaMenuFooterLinks } from '@/components/marketing/marketing-nav-data';

export type FooterLink = { label: string; href: string };

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const marketingFooterProductLinks: FooterLink[] = [
  { label: 'Home', href: '/marketing' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Use cases', href: '/marketing/solutions' },
  { label: 'What you get', href: '/marketing/features' },
  { label: 'Broadcasts', href: '/marketing#broadcast' },
  { label: 'Platform', href: '/marketing#platform' },
  { label: 'Why WhatsApp', href: '/marketing#why-whatsapp' },
  { label: 'Official WhatsApp', href: '/marketing#api' },
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
    title: 'Use cases',
    links: megaMenuFooterLinks('solutions', 6),
  },
  {
    title: 'What you get',
    links: megaMenuFooterLinks('features', 6),
  },
  {
    title: 'For your business',
    links: megaMenuFooterLinks('industry', 6),
  },
];

export const marketingFooterCopy = {
  tagline:
    'WhatsApp for teams that sell, support, and grow — team inbox, bulk messages, auto-replies, and reports on official WhatsApp Business.',
  companyLine: 'A product of Pixels Digital Solutions',
  officialPlatformLine:
    'ReplySys is an official Meta Tech Provider, built to onboard and power your business securely on the official WhatsApp Business Platform',
} as const;
