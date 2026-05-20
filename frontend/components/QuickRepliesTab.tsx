'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createQuickReply,
  deleteQuickReply,
  fetchQuickReplies,
  type QuickReply,
  type QuickReplyCategory,
} from '@/lib/liveChatApi';

const CATEGORIES: QuickReplyCategory[] = ['General', 'Support', 'Sales', 'Order', 'Custom'];

export default function QuickRepliesTab() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<QuickReplyCategory>('General');

  const loadReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuickReplies();
      setReplies(data);
    } catch {
      setError('Failed to load quick replies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      setError('Name and message are required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createQuickReply({ name, content, category });
      setReplies((prev) => [created, ...prev]);
      setName('');
      setContent('');
      setCategory('General');
      setSuccess('Quick reply saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quick reply');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reply: QuickReply) => {
    if (!confirm(`Delete quick reply "${reply.name}"?`)) return;

    setDeletingId(reply._id);
    setError(null);
    try {
      await deleteQuickReply(reply._id);
      setReplies((prev) => prev.filter((r) => r._id !== reply._id));
      setSuccess('Quick reply deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quick reply');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quick Replies</h2>
        <p className="text-gray-600">
          Saved shortcuts for Live Chat. Agents tap the ⚡ button in chat to insert these messages.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-green-600" />
          Add quick reply
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shortcut name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Greeting"
                maxLength={80}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Shown on the ⚡ chip in Live Chat</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuickReplyCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hi! Thanks for messaging us. How can we help you today?"
              rows={4}
              maxLength={4096}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Saving...' : 'Save quick reply'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Your quick replies ({replies.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <Loader className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            Loading...
          </div>
        ) : replies.length === 0 ? (
          <div className="py-16 px-6 text-center text-gray-500">
            <Zap size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">No quick replies yet</p>
            <p className="text-sm mt-1">Create one above — they appear in Live Chat under the ⚡ button.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {replies.map((reply) => (
              <li key={reply._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{reply.name}</span>
                      {reply.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {reply.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{reply.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(reply)}
                    disabled={deletingId === reply._id}
                    className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === reply._id ? (
                      <Loader size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
