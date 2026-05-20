import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
const CONV_BASE = `${API_URL}/integrations/whatsapp/conversations`;

export type LiveChatConversation = {
  _id: string;
  conversationId: string;
  userPhone: string;
  userName: string;
  lastMessagePreview: string;
  lastMessageAt: string | Date;
  unreadCount: number;
  status: 'open' | 'closed';
  tags?: string[];
  assignedAgentId?: string | { _id: string; name?: string; email?: string };
  priority?: string;
};

export type SessionStatus = {
  withinSession: boolean;
  lastCustomerMessageAt: string | null;
  expiresAt: string | null;
  attributedCampaignId: string | null;
  attributedCampaignName: string | null;
};

export type QuickReplyCategory = 'General' | 'Support' | 'Sales' | 'Order' | 'Custom';

export type QuickReply = {
  _id: string;
  name: string;
  content: string;
  category?: QuickReplyCategory;
  messageType?: string;
};

export type CreateQuickReplyInput = {
  name: string;
  content: string;
  category?: QuickReplyCategory;
};

function authHeaders(json = true): HeadersInit {
  const token = authService.getToken();
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function fetchConversations(params: {
  search?: string;
  status?: string | null;
  assignedToMe?: boolean;
  tags?: string;
  limit?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.status) q.set('status', params.status);
  if (params.assignedToMe) q.set('assignedToMe', 'true');
  if (params.tags) q.set('tags', params.tags);
  q.set('limit', String(params.limit ?? 100));

  const res = await fetch(`${CONV_BASE}?${q}`, { headers: authHeaders(false) });
  if (!res.ok) throw new Error('Failed to load conversations');
  const payload = await res.json();
  return (payload.data || []) as LiveChatConversation[];
}

export async function fetchSessionStatus(conversationId: string): Promise<SessionStatus> {
  const res = await fetch(`${CONV_BASE}/${conversationId}/session`, {
    headers: authHeaders(false),
  });
  if (!res.ok) {
    return {
      withinSession: true,
      lastCustomerMessageAt: null,
      expiresAt: null,
      attributedCampaignId: null,
      attributedCampaignName: null,
    };
  }
  const payload = await res.json();
  return payload.data;
}

export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const res = await fetch(`${CONV_BASE}/quick-replies`, { headers: authHeaders(false) });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

export async function createQuickReply(input: CreateQuickReplyInput): Promise<QuickReply> {
  const res = await fetch(`${CONV_BASE}/quick-replies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: input.name.trim(),
      content: input.content.trim(),
      category: input.category || 'General',
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || 'Failed to create quick reply');
  }
  return payload.data;
}

export async function deleteQuickReply(replyId: string): Promise<void> {
  const res = await fetch(`${CONV_BASE}/quick-replies/${replyId}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || 'Failed to delete quick reply');
  }
}

export async function assignConversation(conversationId: string, agentId?: string) {
  const res = await fetch(`${CONV_BASE}/${conversationId}/assign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(agentId ? { agentId } : {}),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Assign failed');
  return res.json();
}

export async function closeConversation(conversationId: string, reason = 'resolved') {
  const res = await fetch(`${CONV_BASE}/${conversationId}/close`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Close failed');
  return res.json();
}

export async function reopenConversation(conversationId: string) {
  const res = await fetch(`${CONV_BASE}/${conversationId}/reopen`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Reopen failed');
  return res.json();
}

export async function patchConversation(
  conversationId: string,
  updates: { tags?: string[]; status?: string; notes?: string }
) {
  const res = await fetch(`${CONV_BASE}/${conversationId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Update failed');
  return res.json();
}

export async function fetchNotes(conversationId: string) {
  const res = await fetch(`${CONV_BASE}/${conversationId}/notes`, {
    headers: authHeaders(false),
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

export async function addNote(conversationId: string, content: string) {
  const res = await fetch(`${CONV_BASE}/${conversationId}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to save note');
  return res.json();
}

export async function sendTemplateMessage(
  conversationId: string,
  templateName: string,
  variables: string[] = []
) {
  const res = await fetch(`${CONV_BASE}/${conversationId}/send-template`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ templateName, variables }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Template send failed');
  return res.json();
}

export async function fetchTemplates(projectId?: string) {
  const q = projectId ? `?projectId=${projectId}` : '';
  const res = await fetch(`${API_URL}/templates${q}`, { headers: authHeaders(false) });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload?.data?.templates || payload?.templates || [];
}
