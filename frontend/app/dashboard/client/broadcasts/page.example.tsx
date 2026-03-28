'use client';

import { useState, useEffect } from 'react';
import { useBroadcasts } from '@/lib/use-api';
import { 
  Send, Plus, Search, MoreVertical, Edit, Trash2, 
  Eye, Loader2, AlertCircle, Clock, CheckCircle, XCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Broadcast {
  _id: string;
  name: string;
  message: string;
  contactCount: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  failedCount?: number;
  successCount?: number;
  createdAt: string;
}

export default function BroadcastsPage() {
  const { broadcasts, isLoading, error, fetchBroadcasts, deleteBroadcast, sendBroadcast } = useBroadcasts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    selectedContacts: [] as string[],
    scheduledAt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const filteredBroadcasts = broadcasts.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this broadcast?')) {
      await deleteBroadcast(id);
    }
  };

  const handleSend = async (id: string) => {
    if (confirm('Send this broadcast now?')) {
      await sendBroadcast(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // TODO: Implement create broadcast
    // const { broadcast, error } = await createBroadcast(formData);
    // if (error) {
    //   setSubmitError(error);
    // } else {
    //   setShowCreateModal(false);
    //   setFormData({ name: '', message: '', selectedContacts: [], scheduledAt: '' });
    // }

    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Plus className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'sending': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'sent': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-600 mt-1">Send bulk messages to your contacts</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Broadcast
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm">Total Broadcasts</p>
          <p className="text-3xl font-bold text-gray-900">{broadcasts.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm">Sent</p>
          <p className="text-3xl font-bold text-green-600">
            {broadcasts.filter(b => b.status === 'sent').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm">Drafts</p>
          <p className="text-3xl font-bold text-gray-500">
            {broadcasts.filter(b => b.status === 'draft').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm">Scheduled</p>
          <p className="text-3xl font-bold text-blue-600">
            {broadcasts.filter(b => b.status === 'scheduled').length}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search broadcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No broadcasts yet</h3>
          <p className="text-gray-600">Create your first broadcast to get started</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Broadcast
          </Button>
        </div>
      ) : (
        /* Broadcasts List */
        <div className="grid grid-cols-1 gap-4">
          {filteredBroadcasts.map((broadcast) => (
            <div
              key={broadcast._id}
              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{broadcast.name}</h3>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(broadcast.status)}`}>
                      {getStatusIcon(broadcast.status)}
                      {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{broadcast.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📌 {broadcast.contactCount} contacts</span>
                    {broadcast.successCount !== undefined && (
                      <span>✅ {broadcast.successCount} sent</span>
                    )}
                    {broadcast.failedCount !== undefined && broadcast.failedCount > 0 && (
                      <span>❌ {broadcast.failedCount} failed</span>
                    )}
                    <span>📅 {new Date(broadcast.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {broadcast.status === 'draft' && (
                    <Button
                      onClick={() => handleSend(broadcast._id)}
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(broadcast._id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal (placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Broadcast</h2>
            <p className="text-gray-600 text-sm mb-4">
              Modal implementation coming soon. Use API client directly:
            </p>
            <code className="bg-gray-100 p-2 rounded text-xs block mb-4 overflow-auto">
              {`api.createBroadcast({
  name: "My Broadcast",
  message: "Hello!",
  contactIds: [...]
})`}
            </code>
            <Button
              onClick={() => setShowCreateModal(false)}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
