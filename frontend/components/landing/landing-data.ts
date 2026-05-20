import {
  BarChart3,
  Bot,
  Megaphone,
  MessageSquare,
  Stethoscope,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'

export const features = [
  {
    icon: MessageSquare,
    title: 'Unified Live Inbox',
    description:
      'One workspace for every WhatsApp conversation — assign, tag, and reply in real time with your whole team.',
  },
  {
    icon: Megaphone,
    title: 'Campaigns & Broadcasts',
    description:
      'Launch template-based broadcasts and drip campaigns with scheduling, audiences, and performance tracking.',
  },
  {
    icon: Bot,
    title: 'Chatbots & Flow Builder',
    description:
      'Automate FAQs, lead qualification, and follow-ups with visual flows — no code required.',
  },
  {
    icon: Users,
    title: 'Contacts & CRM',
    description:
      'Capture leads from ads and chats, segment audiences, and keep every customer context in one place.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description:
      'Track delivery, engagement, and team performance so you know what drives revenue.',
  },
  {
    icon: Stethoscope,
    title: 'Healthcare Vertical',
    description:
      'Appointments, reminders, prescriptions, and patient engagement — built for clinics that run on WhatsApp.',
  },
]

export const steps = [
  {
    step: '01',
    title: 'Connect WhatsApp Business',
    description: 'Embedded Meta signup — connect your number and WABA in minutes.',
  },
  {
    step: '02',
    title: 'Import & Organize',
    description: 'Bring contacts, templates, and teams into one project workspace.',
  },
  {
    step: '03',
    title: 'Automate & Broadcast',
    description: 'Set flows, campaigns, and chatbots that work while you sleep.',
  },
  {
    step: '04',
    title: 'Convert & Scale',
    description: 'Close deals in live chat and scale with analytics and credits that grow with you.',
  },
]

export const industries = [
  { name: 'E-Commerce', href: '/solutions/ecommerce' },
  { name: 'Healthcare', href: '/solutions/healthcare' },
  { name: 'Real Estate', href: '/solutions/realestate' },
  { name: 'Education', href: '/solutions/education' },
  { name: 'Food & Beverage', href: '/solutions/food-beverage' },
  { name: 'Financial Services', href: '/solutions/financial-services' },
]

export const stats = [
  { value: '500+', label: 'Businesses on Replysys' },
  { value: '98%', label: 'Message delivery rate' },
  { value: '3×', label: 'Faster response times' },
  { value: '24/7', label: 'Automation coverage' },
]

export const testimonials = [
  {
    quote:
      'We moved our entire patient follow-up to Replysys. No-shows dropped and our front desk finally breathes again.',
    name: 'Dr. Ananya Mehta',
    role: 'Clinic Director, Pune',
  },
  {
    quote:
      'Campaigns plus live chat in one tool replaced three subscriptions. Our team closes faster on WhatsApp.',
    name: 'Rahul Verma',
    role: 'Head of Growth, D2C Brand',
  },
]

export const trustBadges = [
  { icon: Zap, label: 'WhatsApp Cloud API' },
  { icon: Workflow, label: 'Meta-compliant templates' },
  { icon: MessageSquare, label: 'Real-time team inbox' },
]
