'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, UserRole } from '@/lib/auth';
import { AgentRole, AgentStatus, AgentAvailability } from '@/lib/enums';
import { Plus, Trash2, Copy, CheckCircle, Clock, AlertCircle, Mail } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Agent {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  phone?: string;
  role: AgentRole;
  department?: string;
  status: AgentStatus;
  createdAt: string;
  currentActiveConversations?: number;
  maxConcurrentConversations?: number;
  invitationToken?: string;
  metrics?: {
    avgResponseTime: number;
    avgResolutionTime: number;
    satisfaction: number;
    messagesHandled: number;
  };
}

export default function AgentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AgentStatus>('all');
  const [copiedId, setCopiedId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sendingEmailTo, setSendingEmailTo] = useState<string | null>(null);

  // Check authorization
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (currentUser && ![UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERADMIN].includes(currentUser.role)) {
      router.push('/dashboard');
    }
  }, [router]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/agents`, {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch agents');
        
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAgents();
  }, [user]);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const response = await fetch(`${API_URL}/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete agent');
      
      setAgents(agents.filter(a => a._id !== agentId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  const copyInvitationLink = (agentId: string) => {
    // In a real app, you'd get this from the agent object
    const link = `${window.location.origin}/agent-onboarding?agentId=${agentId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(agentId);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleResendInvitationEmail = async (agent: Agent) => {
    try {
      setSendingEmailTo(agent._id);
      setError('');
      
      const response = await fetch(`${API_URL}/agents/${agent._id}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send email');
      }
      
      setSuccessMessage(`Invitation email sent to ${agent.email}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmailTo(null);
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch(status) {
      case AgentStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case AgentStatus.INACTIVE: return 'bg-red-100 text-red-800';
      case AgentStatus.ON_LEAVE: return 'bg-orange-100 text-orange-800';
      case AgentStatus.SUSPENDED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch(status) {
      case AgentStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4" />;
      case AgentStatus.INACTIVE:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
            <p className="mt-2 text-gray-600">Manage your support team and agent assignments</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/agents/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Agent
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            ✅ {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | AgentStatus)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value={AgentStatus.ACTIVE}>Active</option>
            <option value={AgentStatus.INACTIVE}>Inactive</option>
            <option value={AgentStatus.ON_LEAVE}>On Leave</option>
            <option value={AgentStatus.SUSPENDED}>Suspended</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading agents...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAgents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
            <p className="mt-2 text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start by creating your first agent'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => router.push('/dashboard/agents/create')}
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Create First Agent
              </button>
            )}
          </div>
        )}

        {/* Agents Table */}
        {!loading && filteredAgents.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Conversations</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Satisfaction</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAgents.map((agent) => (
                    <tr key={agent._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{agent.name}</div>
                        {agent.department && (
                          <div className="text-sm text-gray-600">{agent.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{agent.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {agent.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 w-fit px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(agent.status)}`}>
                          {getStatusIcon(agent.status)}
                          <span className="capitalize">{agent.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {agent.currentActiveConversations || 0}/{agent.maxConcurrentConversations || 5}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {agent.metrics?.satisfaction 
                          ? `${(agent.metrics.satisfaction * 100).toFixed(0)}%`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResendInvitationEmail(agent)}
                            disabled={sendingEmailTo === agent._id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                            title="Send invitation email"
                          >
                            {sendingEmailTo === agent._id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyInvitationLink(agent._id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Copy invitation link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {copiedId === agent._id && (
                            <span className="text-xs text-green-600 flex items-center">Copied!</span>
                          )}
                          {deleteConfirm === agent._id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteAgent(agent._id)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(agent._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete agent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Total Agents</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{agents.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Active Agents</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{agents.filter(a => a.status === AgentStatus.ACTIVE).length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Inactive Agents</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{agents.filter(a => a.status === AgentStatus.INACTIVE).length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Avg Satisfaction</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {agents.length > 0 
                ? `${(agents.reduce((sum, a) => sum + (a.metrics?.satisfaction || 0), 0) / agents.length * 100).toFixed(0)}%`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
