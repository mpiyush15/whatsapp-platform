export type AdvancedFeatureId = 'teamAgents' | 'templatesSync' | 'retargeting' | 'followUpAutomation';

export type AdvancedFeatureSize = 'tall' | 'compact';

export type MockAgentRole = 'agent' | 'supervisor' | 'admin';
export type MockAgentStatus = 'active' | 'inactive' | 'pending';

export const advancedFeaturesSectionCopy = {
  eyebrow: 'More power',
  titleMain: 'Advanced features that',
  titleHighlight: 'drive conversions',
  subtitle:
    'Team agents, template sync, smart retargeting, and follow-up automations — beyond the basics.',
} as const;

/** Distinct from Capabilities (live chat, analytics, flow builder, contact lists) */
export const marketingAdvancedFeatures = [
  {
    id: 'teamAgents' as const,
    size: 'tall' as const,
    title: 'Manage agents & roles',
    paragraphs: [
      'Add supervisors and agents, assign roles, and see who is handling conversations.',
      'Search your team, filter by status, and onboard support staff in minutes.',
    ],
    tintClass: 'marketing-advanced-tint--agents',
  },
  {
    id: 'templatesSync' as const,
    size: 'compact' as const,
    activeNav: 'Templates',
    sectionLabel: 'Marketing',
    pageTitle: 'Templates',
    title: 'Templates synced with Meta',
    paragraphs: [
      'Create and track utility, marketing, and auth templates in one library.',
      'See approval status and sync with your WABA — ready for the next broadcast.',
    ],
    tintClass: 'marketing-advanced-tint--templates',
  },
  {
    id: 'retargeting' as const,
    size: 'tall' as const,
    activeNav: 'Campaigns',
    sectionLabel: 'Marketing',
    pageTitle: 'Campaign detail',
    title: 'Smart contact retargeting',
    paragraphs: [
      'See who opened, replied, or ignored — then launch a follow-up to repliers or openers only.',
      'One-click retarget from campaign results without exporting spreadsheets.',
    ],
    tintClass: 'marketing-advanced-tint--retarget',
  },
  {
    id: 'followUpAutomation' as const,
    size: 'tall' as const,
    activeNav: 'Chatbot',
    sectionLabel: 'Automation',
    pageTitle: 'Follow-up sequence',
    title: 'Follow-up automation steps',
    paragraphs: [
      'Chain template messages across days — Day 0 welcome, Day 2 reminder, Day 7 offer.',
      'Pause when a contact replies and route to an agent automatically.',
    ],
    tintClass: 'marketing-advanced-tint--followup',
  },
] as const;

/** Agents table — matches AgentsTab static data */
export const ADVANCED_MOCK_AGENTS = [
  {
    id: 'agent_001',
    name: 'Rahul Kumar',
    email: 'rahul@company.com',
    role: 'agent' as const,
    status: 'active' as const,
    conversations: 24,
    joinedAt: '15/01/2026',
  },
  {
    id: 'agent_002',
    name: 'Priya Singh',
    email: 'priya@company.com',
    role: 'supervisor' as const,
    status: 'active' as const,
    conversations: 18,
    joinedAt: '10/02/2026',
  },
  {
    id: 'agent_003',
    name: 'Amit Patel',
    email: 'amit@company.com',
    role: 'agent' as const,
    status: 'inactive' as const,
    conversations: 0,
    joinedAt: '01/03/2026',
  },
] as const;

export const ROLE_BADGE: Record<MockAgentRole, string> = {
  agent: 'bg-teal-100 text-teal-800',
  supervisor: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export const STATUS_BADGE: Record<MockAgentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export type MockTemplateStatus = 'approved' | 'pending' | 'rejected' | 'draft';
export type MockTemplateHealth = 'high' | 'medium' | 'low';

export const TEMPLATE_CATEGORIES = [
  'All Categories',
  'Trending',
  'General',
  'Top Rated',
  'Ecommerce',
  'Education',
  'Banking',
  'Webinar',
  'Healthcare',
  'Automobile',
  'Real Estate',
  'Services',
  'Non profit',
] as const;

export const TEMPLATE_STATUS_BADGE: Record<MockTemplateStatus, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
};

export const TEMPLATE_HEALTH_BADGE: Record<MockTemplateHealth, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-600',
};

/** Templates table — matches TemplatesTab columns & screenshot */
export const ADVANCED_MOCK_TEMPLATES = [
  { id: 't1', name: 'replysys_01', category: 'marketing', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '24 days ago' },
  { id: 't2', name: 'summer_sale_30', category: 'marketing', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '18 days ago' },
  { id: 't3', name: 'appointment_reminder', category: 'utility', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '12 days ago' },
  { id: 't4', name: 'otp_verification', category: 'authentication', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '8 days ago' },
  { id: 't5', name: 'cart_abandoned_nudge', category: 'marketing', status: 'pending' as const, type: 'en', health: 'medium' as const, createdAt: '5 days ago' },
  { id: 't6', name: 'festival_discount', category: 'marketing', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '3 days ago' },
  { id: 't7', name: 'welcome_message', category: 'marketing', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '2 days ago' },
  { id: 't8', name: 'order_shipped', category: 'utility', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '1 day ago' },
  { id: 't9', name: 'feedback_request', category: 'marketing', status: 'draft' as const, type: 'en', health: 'low' as const, createdAt: '6 hours ago' },
  { id: 't10', name: 'webinar_invite', category: 'marketing', status: 'rejected' as const, type: 'en', health: 'low' as const, createdAt: '4 days ago' },
  { id: 't11', name: 'health_checkup', category: 'utility', status: 'pending' as const, type: 'en', health: 'medium' as const, createdAt: '2 days ago' },
  { id: 't12', name: 'payment_receipt', category: 'utility', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '30 days ago' },
  { id: 't13', name: 'dental_followup', category: 'marketing', status: 'approved' as const, type: 'en', health: 'high' as const, createdAt: '15 days ago' },
  { id: 't14', name: 'course_enrollment', category: 'marketing', status: 'pending' as const, type: 'en', health: 'medium' as const, createdAt: '7 days ago' },
] as const;

export type MockOutboundStatus = 'read' | 'delivered' | 'sent' | 'failed' | 'pending';

export const RECIPIENT_STATUS_BADGE: Record<MockOutboundStatus, string> = {
  read: 'bg-purple-100 text-purple-700',
  delivered: 'bg-indigo-100 text-indigo-700',
  sent: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
};

/** Campaign detail header + metrics — matches campaign detail page */
export const ADVANCED_MOCK_CAMPAIGN_DETAIL = {
  name: 'Festival Discount',
  status: 'completed' as const,
  createdAt: '15/04/2026',
  metrics: {
    sent: 2840,
    delivered: 2712,
    deliveryPct: 95.5,
    opened: 1984,
    openPct: 73.2,
    replied: 412,
    replyPct: 20.8,
  },
  followUp: { repliers: 412, opened: 1984 },
  summary: { total: 2840, opened: 1984, replied: 412 },
} as const;

/** Recipients table — varied status & reply states */
export const ADVANCED_MOCK_CAMPAIGN_RECIPIENTS = [
  { id: 'r1', name: 'Rahul Sharma', phone: '+919876543210', status: 'read' as const, replied: true, replyCount: 1 },
  { id: 'r2', name: 'Priya Singh', phone: '+919812345678', status: 'read' as const, replied: false, replyCount: 0 },
  { id: 'r3', name: '—', phone: '+918087131777', status: 'read' as const, replied: true, replyCount: 1 },
  { id: 'r4', name: 'Neha Gupta', phone: '+917700112233', status: 'delivered' as const, replied: false, replyCount: 0 },
  { id: 'r5', name: 'Vikram Mehta', phone: '+916205554433', status: 'read' as const, replied: true, replyCount: 2 },
  { id: 'r6', name: 'Ananya Reddy', phone: '+915509887766', status: 'failed' as const, replied: false, replyCount: 0 },
  { id: 'r7', name: 'Kiran Joshi', phone: '+914401223344', status: 'read' as const, replied: true, replyCount: 1 },
  { id: 'r8', name: 'Sanjay Iyer', phone: '+913309876543', status: 'delivered' as const, replied: false, replyCount: 0 },
  { id: 'r9', name: 'Meera Nair', phone: '+912208765432', status: 'read' as const, replied: false, replyCount: 0 },
  { id: 'r10', name: 'Rohan Das', phone: '+911107654321', status: 'read' as const, replied: true, replyCount: 3 },
  { id: 'r11', name: 'Divya Kapoor', phone: '+919988776655', status: 'sent' as const, replied: false, replyCount: 0 },
  { id: 'r12', name: 'Arjun Malhotra', phone: '+918877665544', status: 'read' as const, replied: true, replyCount: 1 },
] as const;

export const ADVANCED_MOCK_AUTOMATION_STEPS = [
  { day: 0, title: 'Welcome + offer', template: 'Summer sale — 30% off', status: 'sent' as const },
  { day: 2, title: 'Reminder', template: 'Still thinking? 24h left', status: 'scheduled' as const },
  { day: 5, title: 'Social proof', template: 'What customers say', status: 'scheduled' as const },
  { day: 7, title: 'Last chance', template: 'Final hours — shop now', status: 'scheduled' as const },
] as const;
