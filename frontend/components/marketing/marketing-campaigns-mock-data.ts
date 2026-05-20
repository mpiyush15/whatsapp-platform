export type MockCampaignStatus = 'completed' | 'failed' | 'running' | 'draft';

export type MockCampaign = {
  id: string;
  name: string;
  status: MockCampaignStatus;
  sent: number;
  delivered: number;
  read: number;
  replies: number;
  conversions: number;
  created: string;
};

/** Campaign rows — screenshot names + realistic WhatsApp scale metrics */
export const MARKETING_MOCK_CAMPAIGNS: MockCampaign[] = [
  { id: '1', name: 'Offer', status: 'completed', sent: 12458, delivered: 11846, read: 8204, replies: 2153, conversions: 412, created: 'May 18, 2026' },
  { id: '2', name: 'New b', status: 'completed', sent: 8920, delivered: 8305, read: 6102, replies: 1245, conversions: 198, created: 'Apr 27, 2026' },
  { id: '3', name: 'Test new web', status: 'completed', sent: 25680, delivered: 24105, read: 18240, replies: 4251, conversions: 890, created: 'Apr 27, 2026' },
  { id: '4', name: 'Test new 02', status: 'completed', sent: 5420, delivered: 5188, read: 3920, replies: 680, conversions: 124, created: 'Apr 27, 2026' },
  { id: '5', name: 'test new', status: 'running', sent: 3180, delivered: 2940, read: 2105, replies: 412, conversions: 67, created: 'Apr 27, 2026' },
  { id: '6', name: 'New campaign', status: 'completed', sent: 18900, delivered: 17842, read: 13420, replies: 2785, conversions: 521, created: 'Apr 27, 2026' },
  { id: '7', name: 'New test', status: 'failed', sent: 420, delivered: 0, read: 0, replies: 0, conversions: 0, created: 'Apr 27, 2026' },
  { id: '8', name: 'Offer 2', status: 'completed', sent: 15620, delivered: 14980, read: 11240, replies: 2890, conversions: 445, created: 'Apr 27, 2026' },
  { id: '9', name: 'Offer 1', status: 'completed', sent: 9840, delivered: 9520, read: 7100, replies: 1560, conversions: 302, created: 'Apr 27, 2026' },
  { id: '10', name: 'Trial_1', status: 'completed', sent: 2240, delivered: 2180, read: 1640, replies: 320, conversions: 58, created: 'Apr 27, 2026' },
  { id: '11', name: 'Summer Dental Follow-up', status: 'completed', sent: 12458, delivered: 11846, read: 9204, replies: 2153, conversions: 456, created: 'Apr 20, 2026' },
  { id: '12', name: 'Festival Discount', status: 'completed', sent: 45200, delivered: 43120, read: 38450, replies: 8120, conversions: 1840, created: 'Apr 15, 2026' },
];

export const STATUS_STYLES: Record<MockCampaignStatus, string> = {
  completed: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-700',
};

export type SidebarEntry =
  | { type: 'group'; label: string }
  | { type: 'item'; label: string; icon: string; active?: boolean };

export const SIDEBAR_NAV: SidebarEntry[] = [
  { type: 'item', label: 'Dashboard', icon: 'LayoutDashboard' },
  { type: 'group', label: '🚀 Growth' },
  { type: 'item', label: 'Leads', icon: 'Target' },
  { type: 'item', label: 'Contacts', icon: 'Users' },
  { type: 'group', label: '💬 Conversations' },
  { type: 'item', label: 'Live Chat', icon: 'MessageSquare' },
  { type: 'item', label: 'Chatbot', icon: 'Bot' },
  { type: 'item', label: 'Flow Builder', icon: 'GitBranch' },
  { type: 'group', label: '📢 Marketing' },
  { type: 'item', label: 'Campaigns', icon: 'Megaphone', active: true },
  { type: 'item', label: 'Templates', icon: 'FileText' },
  { type: 'group', label: '📈 Analytics' },
  { type: 'item', label: 'Analytics', icon: 'BarChart3' },
  { type: 'group', label: '⚙️ System' },
  { type: 'item', label: 'Account', icon: 'User' },
  { type: 'item', label: 'Billing', icon: 'CreditCard' },
  { type: 'item', label: 'Settings', icon: 'Settings' },
];
