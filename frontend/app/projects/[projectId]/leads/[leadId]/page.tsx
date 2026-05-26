'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ErrorToast } from '@/components/ErrorToast';
import { API_URL } from '@/lib/config/api';
import { authService } from '@/lib/auth';

const getHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface Message {
  _id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface LeadDetail {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  intent: string;
  score: number;
  status: string;
  messages?: Message[];
  source?: 'crm' | 'chatbot' | string;
  chatbotName?: string;
  responses?: Record<string, string>;
  notes?: string;
  createdAt: Date;
}

export default function LeadDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const leadId = params.leadId as string

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeadDetail();
  }, [projectId, leadId]);

  const fetchLeadDetail = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/leads/${leadId}?projectId=${projectId}`, {
        headers: getHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch lead');
      }

      setLead(data.lead || data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="h-12 w-12 border-4 border-slate-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-600">Lead not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href={`/projects/${projectId}/leads`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Leads
          </a>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{lead.name || lead.phone || 'Lead'}</h1>
          <p className="text-slate-600">
            {[lead.email, lead.phone, lead.source === 'chatbot' ? lead.chatbotName : null].filter(Boolean).join(' • ')}
          </p>
        </div>

        {/* Lead Info */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-600 mb-2">{lead.source === 'chatbot' ? 'Chatbot' : 'Intent'}</p>
            <p className="text-2xl font-bold text-slate-900 capitalize">
              {(lead.source === 'chatbot' ? lead.chatbotName : lead.intent)?.replaceAll('_', ' ') || 'Inquiry'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-600 mb-2">Lead Score</p>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-purple-600">{lead.score}</div>
              <div className="flex-1">
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      lead.score >= 75
                        ? 'bg-green-600'
                        : lead.score >= 50
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-600 mb-2">Status</p>
            <p className="text-2xl font-bold text-slate-900 capitalize">{lead.status}</p>
          </div>
        </div>

        {lead.source === 'chatbot' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Saved Chatbot Replies</h2>

            {Object.entries(lead.responses || {}).length === 0 ? (
              <p className="text-slate-600 text-center py-8">No replies were saved for this chatbot lead.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(lead.responses || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">{key.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Conversation History</h2>

          {(lead.messages || []).length === 0 ? (
            <p className="text-slate-600 text-center py-8">No messages yet</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(lead.messages || []).map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-slate-600'}`}>
                      {new Date(message.timestamp).toLocaleString('en-IN', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
