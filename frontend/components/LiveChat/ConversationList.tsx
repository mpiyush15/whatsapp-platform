'use client';

import { useMemo } from 'react';
import { useLiveChat } from '@/lib/context/LiveChatContext';
import type { LiveChatConversation } from '@/lib/liveChatApi';

interface Props {
  conversations: LiveChatConversation[];
  selectedConversation: LiveChatConversation | null;
  onSelectConversation: (conv: LiveChatConversation) => void;
  loading: boolean;
  onLoadMore?: () => void;
}

const norm = (s: string) => String(s || '').replace(/\D/g, '');

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  loading,
  onLoadMore,
}: Props) {
  const { filter: contextFilter, setFilter, search: contextSearch } = useLiveChat();

  const filtered = useMemo(() => {
    const q = contextSearch.trim().toLowerCase();
    const qDigits = norm(contextSearch);

    return conversations
      .filter((conv) => {
        if (q) {
          const nameMatch = conv.userName?.toLowerCase().includes(q);
          const phoneMatch =
            conv.userPhone?.includes(q) || (qDigits && norm(conv.userPhone).includes(qDigits));
          const previewMatch = conv.lastMessagePreview?.toLowerCase().includes(q);
          const tagMatch = conv.tags?.some((t) => t.toLowerCase().includes(q));
          if (!nameMatch && !phoneMatch && !previewMatch && !tagMatch) return false;
        }
        if (contextFilter === 'unread' && conv.unreadCount === 0) return false;
        if (contextFilter === 'open' && conv.status !== 'open') return false;
        if (contextFilter === 'closed' && conv.status !== 'closed') return false;
        return true;
      })
      .sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
  }, [conversations, contextSearch, contextFilter]);

  const filterLabels: Record<string, string> = {
    all: 'All',
    unread: 'Unread',
    open: 'Open',
    closed: 'Closed',
    mine: 'Mine',
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto bg-white border-b border-gray-200 scrollbar-hide">
        {(['all', 'unread', 'open', 'closed', 'mine'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all font-medium ${
              contextFilter === f
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-600 mt-8">
            {loading ? (
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2" />
                <p>Loading…</p>
              </div>
            ) : (
              <p>No conversations</p>
            )}
          </div>
        ) : (
          filtered.map((conversation) => (
            <div
              key={conversation.conversationId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(conversation)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectConversation(conversation)}
              className={`px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-100 ${
                selectedConversation?.conversationId === conversation.conversationId
                  ? 'bg-gray-100 border-l-4 border-l-green-600'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                    {(conversation.userName || conversation.userPhone)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {conversation.userName || conversation.userPhone}
                      </p>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{conversation.lastMessagePreview}</p>
                    {conversation.tags && conversation.tags.length > 0 && (
                      <p className="text-[10px] text-green-700 truncate mt-0.5">
                        {conversation.tags.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shrink-0">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        
        {onLoadMore && filtered.length > 0 && (
          <div className="p-4 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
