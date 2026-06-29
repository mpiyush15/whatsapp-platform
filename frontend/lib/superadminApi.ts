import { API_URL } from '@/lib/config/api';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('authToken')
      : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.message || 'Request failed');
  }
  return payload.data as T;
}

export type PlatformOverview = {
  activeCustomers: number;
  newCustomers: number;
  pendingCustomers: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  churnRate: number;
  totalMessages24h: number;
  pendingPayments: number;
  creditsUsed30d: number;
};

export type VerticalCount = { vertical: string; count: number };

export type PlatformProjectStats = {
  totalProjects: number;
  orgsWithMultipleProjects: number;
  totalConnectedPhones: number;
  projectsByVertical?: VerticalCount[];
  orgsWithMixedVerticals?: number;
  verticalsInUse?: string[];
};

export type OrgOperationalStats = {
  projectCount: number;
  connectedProjects: number;
  phoneCount: number;
  messages7d: number;
  hasMultipleProjects: boolean;
  projectsByVertical?: Record<string, number>;
  verticals?: string[];
  hasMultipleVerticals?: boolean;
};

export type DashboardOrganization = {
  id: string;
  accountId: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
} & Partial<OrgOperationalStats>;

export type SuperadminDashboard = {
  overview: PlatformOverview & PlatformProjectStats;
  dailyVolume: Array<{ date: string; inbound: number; outbound: number; total: number }>;
  signupsByDay: Array<{ date: string; count: number }>;
  organizations: DashboardOrganization[];
  topOrganizations: Array<{
    accountId: string;
    name: string;
    email: string;
    outboundMessages: number;
  } & Partial<OrgOperationalStats>>;
  projectStats: PlatformProjectStats;
};

export type OrganizationOperational = {
  projectCount: number;
  connectedProjectCount: number;
  phoneLineCount: number;
  activePhoneCount: number;
  messagesLast7d: number;
  outboundLast7d: number;
  hasMultipleProjects: boolean;
  projectsByVertical?: Record<string, number>;
  verticals?: string[];
  hasMultipleVerticals?: boolean;
  projects: Array<{
    projectId: string;
    name: string;
    isDefault: boolean;
    status: string;
    vertical: string;
    whatsappConnected: boolean;
    displayNumber: string | null;
    createdAt: string;
  }>;
  phones: Array<{
    projectId?: string;
    displayPhone: string;
    phoneNumberId?: string;
    isActive: boolean;
    qualityRating?: string;
    connectedAt?: string;
  }>;
};

export type PlatformAnalytics = {
  period: { start: string; end: string; days: number };
  messaging: {
    total: number;
    inbound: number;
    outbound: number;
    messagesSent: number;
    delivered: number;
    read?: number;
    failed: number;
    deliveryRate: number;
    failRate?: number;
    activeOrganizations?: number;
    meta: {
      totalEstimatedInr: number;
      billableMessages: number;
      breakdown: Array<{ category: string; count: number; subtotalInr: number }>;
    };
  };
  volumeSummary?: {
    peakDay: string | null;
    peakTotal: number;
    peakOutbound: number;
    avgMessagesPerDay: number;
    avgOutboundPerDay: number;
    daysWithActivity: number;
    dayCount: number;
  };
  credits: {
    totalCredits: number;
    byCategory: Array<{ category: string; credits: number; messages: number }>;
  };
  topOrganizations: Array<{
    accountId: string;
    name: string;
    email: string;
    outboundMessages: number;
    projectCount?: number;
    phoneCount?: number;
    connectedProjects?: number;
    hasMultipleProjects?: boolean;
    projectsByVertical?: Record<string, number>;
  }>;
  dailyVolume: Array<{ date: string; inbound: number; outbound: number; total: number }>;
  platform?: PlatformProjectStats;
  campaigns: { total: number; byStatus: Array<{ status: string; count: number; sent: number }> };
};

export async function fetchPlatformOverview() {
  const res = await fetch(`${API_URL}/admin/metrics`, { headers: authHeaders() });
  return parseJson<PlatformOverview>(res);
}

export async function fetchSuperadminDashboard() {
  const res = await fetch(`${API_URL}/admin/dashboard`, { headers: authHeaders() });
  return parseJson<SuperadminDashboard>(res);
}

export type AdminOrganizationRow = {
  _id?: string;
  accountId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  plan?: string;
  billingCycle?: string;
  status: string;
  role?: string;
  type?: string;
  isInternal?: boolean;
  createdAt: string;
  projectCount: number;
  phoneCount: number;
  connectedProjects: number;
  hasMultipleProjects: boolean;
  messages7d: number;
  projectsByVertical: Record<string, number>;
  verticals: string[];
  hasMultipleVerticals: boolean;
};

export async function fetchAdminOrganizations(params?: {
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  if (params?.status) q.set('status', params.status);
  const query = q.toString();
  const res = await fetch(
    `${API_URL}/admin/organizations${query ? `?${query}` : ''}`,
    { headers: authHeaders() }
  );
  return parseJson<{
    organizations: AdminOrganizationRow[];
    pagination: { total: number; limit: number; offset: number; status?: string };
  }>(res);
}

export async function fetchRecentCustomers(limit = 10) {
  const res = await fetch(`${API_URL}/admin/customers?limit=${limit}`, {
    headers: authHeaders(),
  });
  return parseJson<
    Array<{
      id: string;
      accountId: string;
      name: string;
      email: string;
      plan: string;
      status: string;
      createdAt: string;
    }>
  >(res);
}

export async function fetchPlatformAnalytics(days = 30) {
  const res = await fetch(`${API_URL}/admin/platform-analytics?days=${days}`, {
    headers: authHeaders(),
  });
  return parseJson<PlatformAnalytics>(res);
}

export async function fetchPlatformLeads(params: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.limit) q.set('limit', String(params.limit));
  const res = await fetch(`${API_URL}/admin/platform-leads?${q}`, { headers: authHeaders() });
  return parseJson<{ leads: unknown[]; stats: Record<string, number> }>(res);
}

export async function fetchPlatformContacts(params: {
  type?: string;
  search?: string;
  limit?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.type) q.set('type', params.type);
  if (params.search) q.set('search', params.search);
  if (params.limit) q.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/admin/platform-contacts?${q.toString()}`, {
    headers: authHeaders(),
  });
  return parseJson<{ contacts: unknown[]; stats: Record<string, number>; total: number }>(res);
}

export async function importPlatformLeads(leads: any[]) {
  const res = await fetch(`${API_URL}/admin/platform-leads/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ leads }),
  });
  return parseJson<{ imported: number; skipped: number; error?: string }>(res);
}

export async function patchPlatformLead(leadId: string, payload: Record<string, any>) {
  const res = await fetch(`${API_URL}/admin/platform-leads/${leadId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson<unknown>(res);
}

export function exportCsvDownloadUrl(dataset: string) {
  return `${API_URL}/admin/exports/download/${dataset}`;
}

export type AdminInvoicesResponse = {
  invoices: Array<{
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    totalAmount: number;
    paidAmount?: number;
    status: string;
    accountId?: string;
    accountName?: string;
    billTo?: { name: string; email: string };
    orderId?: string;
  }>;
  total: number;
  missingCount: number;
  totalRevenue: number;
};

export async function fetchAdminInvoices(limit = 200) {
  const res = await fetch(`${API_URL}/admin/invoices?limit=${limit}`, {
    headers: authHeaders(),
  });
  return parseJson<AdminInvoicesResponse>(res);
}

export async function backfillAdminInvoices(limit = 100) {
  const res = await fetch(`${API_URL}/admin/invoices/backfill`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ limit }),
  });
  return parseJson<{ created: number; skipped: number; failed: number; processed: number }>(res);
}

export async function downloadExportCsv(dataset: string, filename?: string) {
  const res = await fetch(exportCsvDownloadUrl(dataset), { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || err?.message || 'Export download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `export-${dataset}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
