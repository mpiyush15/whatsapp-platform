'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, MoreVertical, X, ArrowLeft } from 'lucide-react';
import { Socket } from 'socket.io-client';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CustomerProfile from './CustomerProfile';
import SessionBanner from './SessionBanner';
import TemplatePickerModal from './TemplatePickerModal';
import { fetchSessionStatus, type LiveChatConversation, type SessionStatus } from '@/lib/liveChatApi';

interface Message {
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
}

interface Props {
  conversation: LiveChatConversation;
  messages: Message[];
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => Promise<boolean>;
  onConversationUpdated: (updates: Partial<LiveChatConversation>) => void;
  socket: Socket | null;
  projectId?: string;
  onBack?: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
}

export default function ChatArea({
  conversation,
  messages,
  onSendMessage,
  onConversationUpdated,
  socket,
  projectId,
  onBack,
  onLoadMore,
  loadingMore,
  hasMore,
}: Props) {
  const [showProfile, setShowProfile] = useState(false);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSessionStatus(conversation.conversationId).then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [conversation.conversationId, messages.length]);

  const withinSession = session?.withinSession !== false;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 text-gray-900 px-3 py-2 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-0.5 flex-shrink-0 hover:bg-gray-100 rounded"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
          )}
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 truncate text-sm">
              {conversation.userName || 'Customer'}
            </h2>
            <p className="text-xs text-gray-500 truncate">{conversation.userPhone}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowProfile(!showProfile)}
          className="p-1 hover:bg-gray-100 rounded-full transition shrink-0"
        >
          <MoreVertical size={16} className="text-gray-600" />
        </button>
      </div>

      <SessionBanner session={session} onSendTemplate={() => setShowTemplates(true)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <MessageList
            messages={messages}
            socket={socket}
            conversationId={conversation.conversationId}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
            layoutKey={
              session
                ? `${session.withinSession}-${session.attributedCampaignName ?? ''}`
                : 'pending'
            }
          />
          <MessageInput
            onSendMessage={onSendMessage}
            disabled={!withinSession}
            disabledHint={
              !withinSession
                ? 'Session expired — use Send template from the banner above.'
                : undefined
            }
            onTyping={(isTyping) => {
              if (!socket) return;
              const payload = { conversationId: conversation.conversationId, isTyping };
              if (isTyping) socket.emit('typing_start', payload);
              else socket.emit('typing_stop', payload);
            }}
          />
        </div>

        {showProfile && (
          <div className="hidden md:flex md:w-72 border-l border-gray-200 bg-white overflow-y-auto flex-col shrink-0">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Details</h3>
              <button type="button" onClick={() => setShowProfile(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            <CustomerProfile conversation={conversation} onUpdated={onConversationUpdated} projectId={projectId} />
          </div>
        )}
      </div>

      <TemplatePickerModal
        conversationId={conversation.conversationId}
        projectId={projectId}
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSent={() => fetchSessionStatus(conversation.conversationId).then(setSession)}
      />
    </div>
  );
}
