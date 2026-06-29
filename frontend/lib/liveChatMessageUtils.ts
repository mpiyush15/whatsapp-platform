/** Map API / socket payloads to Live Chat message shape */
export type LiveChatMessage = {
  _id: string;
  conversationId: string;
  senderRole: 'customer' | 'agent';
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date | string;
  reactions?: { emoji: string; count: number }[];
  isRead?: boolean;
};

function normalizeMediaType(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.includes('image')) return 'image';
  if (raw.includes('video')) return 'video';
  if (raw.includes('audio')) return 'audio';
  if (raw.includes('document') || raw.includes('pdf')) return 'document';
  return raw;
}

export function normalizeLiveChatMessage(raw: Record<string, unknown>, fallbackConversationId?: string): LiveChatMessage | null {
  if (!raw) return null;

  const id = raw._id != null ? String(raw._id) : raw.messageId != null ? String(raw.messageId) : null;
  if (!id) return null;

  const conversationId = String(
    raw.conversationId ?? (raw.message as Record<string, unknown>)?.conversationId ?? fallbackConversationId ?? ''
  );
  if (!conversationId) return null;

  const direction = raw.direction as string | undefined;
  const senderRole =
    raw.senderRole === 'agent' || raw.senderRole === 'customer'
      ? raw.senderRole
      : direction === 'outbound'
        ? 'agent'
        : 'customer';

  const content = raw.content as Record<string, unknown> | string | undefined;
  const contentObj = typeof content === 'object' && content !== null ? content : undefined;

  const text = String(
    raw.text ??
      contentObj?.text ??
      (typeof content === 'string' ? content : '') ??
      ''
  );

  const mediaUrl = (raw.mediaUrl ?? contentObj?.mediaUrl) as string | undefined;
  const mediaType = normalizeMediaType(
    (raw.mediaType ?? contentObj?.mediaType ?? raw.messageType) as string | undefined
  );

  const createdAt =
    (raw.createdAt as string | Date) ??
    (raw.sentAt as string | Date) ??
    (raw.timestamp as string | Date) ??
    new Date();

  return {
    _id: id,
    conversationId,
    senderRole,
    senderName: String(raw.senderName ?? (senderRole === 'agent' ? 'Agent' : 'Customer')),
    text,
    mediaUrl,
    mediaType,
    status: (raw.status as LiveChatMessage['status']) || 'sent',
    createdAt,
    reactions: (raw.reactions as LiveChatMessage['reactions']) || [],
    isRead: Boolean(raw.isRead),
  };
}

export function messageIdsEqual(a: string | undefined, b: string | undefined): boolean {
  return String(a ?? '') === String(b ?? '');
}
