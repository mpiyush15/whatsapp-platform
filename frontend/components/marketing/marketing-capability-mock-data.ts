export type CapabilityMockId = 'liveChat' | 'analytics' | 'flowBuilder' | 'contacts';

export const MOCK_LIVE_CHAT_CONVERSATIONS = [
  {
    id: '1',
    name: 'Priya Sharma',
    preview: 'Can I reschedule my appointment?',
    time: '2m',
    unread: 2,
    active: true,
    agent: 'You',
  },
  {
    id: '2',
    name: 'Rahul Verma',
    preview: 'Thanks — received the offer!',
    time: '18m',
    unread: 0,
    active: false,
    agent: 'Anita',
  },
  {
    id: '3',
    name: 'Metro Dental',
    preview: 'Template: Summer follow-up sent',
    time: '1h',
    unread: 0,
    active: false,
    agent: 'Bot',
  },
] as const;

export const MOCK_LIVE_CHAT_MESSAGES = [
  { id: 'm1', from: 'them', text: 'Hi, can I reschedule my appointment to Friday?' },
  { id: 'm2', from: 'us', text: 'Sure — we have 4:30 PM or 6:00 PM available.' },
  { id: 'm3', from: 'them', text: '6 PM works. Thank you!' },
] as const;

export const MOCK_ANALYTICS_KPIS = [
  { label: 'Delivered', value: '41.2k', sub: '94.2% rate', accent: 'green' },
  { label: 'Read', value: '32.8k', sub: '79.6% of sent', accent: 'blue' },
  { label: 'Replies', value: '8.1k', sub: '+12% vs last week', accent: 'amber' },
] as const;

export const MOCK_ANALYTICS_BARS = [42, 58, 48, 72, 65, 80, 74, 88, 76, 92, 85, 96] as const;

/** Sales solution page proof mock — illustrative scale only */
export const MOCK_SALES_ANALYTICS_KPIS = [
  { label: 'Inbound threads', value: '186', sub: 'Last 7 days' },
  { label: 'Median first reply', value: '6m', sub: 'Business hours' },
  { label: 'Template follow-ups', value: '412', sub: 'Outside session window' },
] as const;

export const MOCK_SALES_ACTIVITY_ROWS = [
  { id: '1', summary: 'Priya — demo booked', owner: 'You', state: 'Meeting set' },
  { id: '2', summary: 'Rahul — pricing thread', owner: 'SDR', state: 'Replied' },
  { id: '3', summary: 'Metro Dental — RFP', owner: 'AE', state: 'Open' },
] as const;

/** Agencies solution page — illustrative portfolio scale */
export const MOCK_AGENCY_KPIS = [
  { label: 'Client projects live', value: '28', sub: 'Isolated numbers & templates' },
  { label: '30-day WhatsApp volume', value: '1.38M', sub: 'Delivered + reads in-app' },
  { label: 'Portfolio reply rate', value: '44%', sub: 'Median across inboxes' },
] as const;

export const MOCK_AGENCY_CLIENT_ROWS = [
  { id: '1', name: 'Metro Dental', segment: 'Healthcare', spend: '₹1.2L/mo' },
  { id: '2', name: 'EduSpark Institute', segment: 'Edtech', spend: '₹84k/mo' },
  { id: '3', name: 'Northwind Retail', segment: 'D2C', spend: '₹2.4L/mo' },
] as const;

export const MOCK_FLOW_NODES = [
  { id: 'start', label: 'Start', x: 8, y: 28, color: 'bg-slate-700' },
  { id: 'msg', label: 'Welcome message', x: 28, y: 12, color: 'bg-green-600' },
  { id: 'btn', label: 'Quick replies', x: 52, y: 36, color: 'bg-violet-600' },
  { id: 'end', label: 'Assign agent', x: 72, y: 18, color: 'bg-blue-600' },
] as const;

export const MOCK_CONTACTS = [
  { name: 'Priya Sharma', phone: '+91 98••••2103', tags: ['VIP', 'Clinic'], optIn: true },
  { name: 'Rahul Verma', phone: '+91 88••••8841', tags: ['Offer'], optIn: true },
  { name: 'Ananya Patel', phone: '+91 77••••4420', tags: ['Lead'], optIn: true },
  { name: 'Metro Dental', phone: '+91 22••••0091', tags: ['B2B'], optIn: false },
] as const;
