'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Clock, Calendar, Loader2, X, UserPlus, UserCheck } from 'lucide-react';
import { authService, UserRole } from '@/lib/auth';
import {
  type LiveChatConversation,
  assignConversation,
  closeConversation,
  reopenConversation,
  patchConversation,
  fetchNotes,
  addNote,
  saveConversationAsLead,
  fetchLiveChatAgents,
  type LiveChatAgent,
} from '@/lib/liveChatApi';

interface Props {
  conversation: LiveChatConversation;
  onUpdated: (updates: Partial<LiveChatConversation>) => void;
  projectId?: string;
}

export default function CustomerProfile({ conversation, onUpdated, projectId }: Props) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(conversation.tags || []);
  const [leadName, setLeadName] = useState(conversation.userName || '');
  const [leadEmail, setLeadEmail] = useState('');
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Array<{ _id: string; content: string; createdAt: string }>>([]);
  const [agents, setAgents] = useState<LiveChatAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const convKey = conversation.conversationId;
  const user = authService.getCurrentUser();
  const assignedAgent =
    conversation.assignedAgentId && typeof conversation.assignedAgentId === 'object'
      ? conversation.assignedAgentId
      : null;
  const canAssignAgents =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGER ||
    user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    setTags(conversation.tags || []);
    setLeadName(conversation.userName || '');
    setLeadEmail('');
    setNotice('');
  }, [conversation.tags, convKey]);

  useEffect(() => {
    let cancelled = false;
    fetchNotes(convKey)
      .then((list) => {
        if (!cancelled) setNotes(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [convKey]);

  useEffect(() => {
    if (!canAssignAgents) return;
    let cancelled = false;
    fetchLiveChatAgents(projectId)
      .then((list) => {
        if (!cancelled) {
          setAgents(list);
          setSelectedAgentId((current) => current || list[0]?.agentId || '');
        }
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canAssignAgents, projectId]);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const run = async (key: string, fn: () => Promise<void>) => {
    setError('');
    setNotice('');
    setBusy(key);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  };

  const handleAssign = () =>
    run('assign', async () => {
      await assignConversation(convKey, undefined, projectId);
      onUpdated({ assignedAgentId: user?.userId || user?.id || '' });
    });

  const handleAssignAgent = () =>
    run('assign-agent', async () => {
      if (!selectedAgentId) return;
      const payload = await assignConversation(convKey, selectedAgentId, projectId);
      const updated = payload?.data || payload?.conversation;
      const selected = agents.find((agent) => agent.agentId === selectedAgentId || agent._id === selectedAgentId);
      onUpdated({
        assignedAgentId:
          updated?.assignedAgentId ||
          (selected?.userId && typeof selected.userId === 'object'
            ? { _id: selected.userId._id, name: selected.name, email: selected.email }
            : selected?.userId || selectedAgentId),
      });
      setNotice(`Assigned to ${selected?.name || 'agent'}`);
    });

  const handleToggleStatus = () =>
    run('status', async () => {
      if (conversation.status === 'open') {
        await closeConversation(convKey);
        onUpdated({ status: 'closed' });
      } else {
        await reopenConversation(convKey);
        onUpdated({ status: 'open' });
      }
    });

  const handleAddTag = () =>
    run('tag', async () => {
      const name = tagInput.trim();
      if (!name || tags.includes(name)) return;
      const next = [...tags, name];
      await patchConversation(convKey, { tags: next });
      setTags(next);
      setTagInput('');
      onUpdated({ tags: next });
    });

  const handleRemoveTag = (tag: string) =>
    run('tag', async () => {
      const next = tags.filter((t) => t !== tag);
      await patchConversation(convKey, { tags: next });
      setTags(next);
      onUpdated({ tags: next });
    });

  const handleSaveNote = () =>
    run('note', async () => {
      const content = noteText.trim();
      if (!content) return;
      await addNote(convKey, content);
      setNoteText('');
      const list = await fetchNotes(convKey);
      setNotes(list);
    });

  const handleSaveLead = () =>
    run('lead', async () => {
      const saved = await saveConversationAsLead({
        conversationId: convKey,
        projectId,
        name: leadName.trim() || conversation.userName || conversation.userPhone,
        phone: conversation.userPhone,
        email: leadEmail.trim() || undefined,
        tags,
        notes: noteText.trim(),
      });
      setNotice(saved?.educationSynced ? 'Saved to enquiries' : 'Saved to leads');
    });

  return (
    <div className="p-4">
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <MessageCircle size={28} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-base text-gray-900">
          {conversation.userName || 'Unknown'}
        </h3>
        <p className="text-sm text-gray-600">{conversation.userPhone}</p>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1.5">
          {notice}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
        <span className="text-gray-600">Status</span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            conversation.status === 'open'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {conversation.status}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg text-sm">
        <span className="text-gray-600">Assigned to</span>
        <span className="min-w-0 truncate text-right font-medium text-gray-900">
          {assignedAgent?.name || assignedAgent?.email || (conversation.assignedAgentId ? 'Assigned agent' : 'Unassigned')}
        </span>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
          <Calendar size={16} className="text-gray-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Last activity</p>
            <p className="font-medium text-gray-900">{formatDate(conversation.lastMessageAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
          <Clock size={16} className="text-gray-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Unread</p>
            <p className="font-medium text-gray-900">{conversation.unreadCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-green-100 bg-green-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-800">Lead details</p>
        <div className="space-y-2">
          <input
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            placeholder="Lead name"
            className="w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <input
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            placeholder="Email optional"
            className="w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            type="button"
            disabled={!!busy}
            onClick={handleSaveLead}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {busy === 'lead' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Save as lead
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {canAssignAgents && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Assign agent</p>
            <div className="space-y-2">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {agents.length === 0 ? (
                  <option value="">No active agents</option>
                ) : (
                  agents.map((agent) => (
                    <option key={agent.agentId} value={agent.agentId}>
                      {agent.name} ({agent.email})
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                disabled={!!busy || !selectedAgentId}
                onClick={handleAssignAgent}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === 'assign-agent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Assign selected agent
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          disabled={!!busy}
          onClick={handleAssign}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          {busy === 'assign' && <Loader2 className="h-4 w-4 animate-spin" />}
          Assign to me
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={handleToggleStatus}
          className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-900 rounded-lg text-sm font-medium"
        >
          {conversation.status === 'open' ? 'Resolve chat' : 'Reopen chat'}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Tags</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-800 rounded-full text-xs"
            >
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add tag…"
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
          <button
            type="button"
            disabled={!!busy || !tagInput.trim()}
            onClick={handleAddTag}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</p>
        {notes.length > 0 && (
          <ul className="space-y-2 mb-2 max-h-32 overflow-y-auto">
            {notes.map((n) => (
              <li key={n._id} className="text-xs bg-amber-50 border border-amber-100 rounded p-2 text-gray-800">
                {n.content}
              </li>
            ))}
          </ul>
        )}
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Internal note for your team…"
          className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
          rows={3}
        />
        <button
          type="button"
          disabled={!!busy || !noteText.trim()}
          onClick={handleSaveNote}
          className="mt-2 w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium disabled:opacity-50"
        >
          {busy === 'note' ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  );
}
