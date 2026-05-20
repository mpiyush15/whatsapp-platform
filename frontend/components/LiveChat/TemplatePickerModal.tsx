'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchTemplates, sendTemplateMessage } from '@/lib/liveChatApi';

interface Props {
  conversationId: string;
  projectId?: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

export default function TemplatePickerModal({
  conversationId,
  projectId,
  open,
  onClose,
  onSent,
}: Props) {
  const [templates, setTemplates] = useState<Array<{ _id: string; name: string; status?: string }>>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchTemplates(projectId)
      .then((list) => setTemplates(list.filter((t: { status?: string }) => t.status !== 'REJECTED')))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  if (!open) return null;

  const handleSend = async (name: string) => {
    setSending(name);
    setError('');
    try {
      await sendTemplateMessage(conversationId, name);
      onSent();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Send WhatsApp template</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No approved templates found.</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t._id}>
                  <button
                    type="button"
                    disabled={!!sending}
                    onClick={() => handleSend(t.name)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 disabled:opacity-50 text-sm font-medium text-gray-900"
                  >
                    {sending === t.name ? 'Sending…' : t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
