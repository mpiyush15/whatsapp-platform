'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Loader2, Mail, Plus, RefreshCcw, Trash2, Users } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { AgentRole, AgentStatus } from '@/lib/enums';

interface AgentsTabProps {
  projectId: string;
  accountId?: string;
}

interface Agent {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  phone?: string;
  projectId?: string | null;
  status: AgentStatus;
  role: AgentRole;
  department?: string;
  createdAt: string;
  currentActiveConversations?: number;
  maxConcurrentConversations?: number;
}

type AgentResponse = {
  success: boolean;
  agents?: Agent[];
  count?: number;
};

type CreateAgentResponse = {
  success: boolean;
  agent?: Agent;
  loginUrl?: string;
  temporaryPassword?: string;
  emailSent?: boolean;
  emailSkipped?: boolean;
  emailError?: string | null;
  message?: string;
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: AgentRole.AGENT,
  department: '',
};

function roleLabel(role: string) {
  return role.replace('-', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function AgentsTab({ projectId }: AgentsTabProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AgentStatus>('all');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginDetails, setLoginDetails] = useState<{ email: string; loginUrl: string; password: string } | null>(null);
  const [copied, setCopied] = useState<'url' | 'password' | ''>('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const payload = await apiGet<AgentResponse>(`/agents?projectId=${encodeURIComponent(projectId)}`);
      setAgents(payload.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAgents();
  }, [projectId]);

  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesSearch =
        !term ||
        agent.name.toLowerCase().includes(term) ||
        agent.email.toLowerCase().includes(term) ||
        agent.agentId.toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchTerm, filterStatus]);

  const activeCount = agents.filter((agent) => agent.status === AgentStatus.ACTIVE).length;

  const copyText = async (value: string, key: 'url' | 'password') => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const handleCreateAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      setLoginDetails(null);

      const payload = await apiPost<CreateAgentResponse>('/agents', {
        ...form,
        projectId,
      });

      if (!payload.success) throw new Error(payload.message || 'Failed to create agent');
      if (payload.agent) setAgents((current) => [payload.agent!, ...current]);

      setLoginDetails(
        payload.loginUrl && payload.temporaryPassword
          ? { email: form.email, loginUrl: payload.loginUrl, password: payload.temporaryPassword }
          : null
      );
      setSuccess(
        payload.emailSent
          ? 'Agent created and login details emailed.'
          : 'Agent created. Email was not sent, so share the login details shown below.'
      );
      setForm(emptyForm);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendLogin = async (agent: Agent) => {
    try {
      setResendingId(agent._id);
      setError('');
      setSuccess('');
      const payload = await apiPost<CreateAgentResponse>(`/agents/${encodeURIComponent(agent._id)}/resend-invitation`);
      if (!payload.success) throw new Error(payload.message || 'Failed to resend login details');

      if (payload.loginUrl && payload.temporaryPassword) {
        setLoginDetails({ email: agent.email, loginUrl: payload.loginUrl, password: payload.temporaryPassword });
      }
      setSuccess(payload.emailSent ? `Login details emailed to ${agent.email}.` : 'New login details generated. Share them from the box below.');
      await loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend login details');
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    try {
      setError('');
      await apiDelete(`/agents/${encodeURIComponent(agent.agentId)}`);
      setAgents((current) => current.filter((row) => row.agentId !== agent.agentId));
      setDeleteConfirm(null);
      setSuccess('Agent removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Agents</h3>
          <p className="mt-1 text-sm text-gray-500">Create project logins for live chat agents.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{agents.length}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Project URL</p>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">/projects/{projectId}/live-chat-v2</p>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {loginDetails ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-950">One-time login details for {loginDetails.email}</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700">
                  <span className="font-medium text-gray-900">URL:</span> <span className="break-all">{loginDetails.loginUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(loginDetails.loginUrl, 'url')}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === 'url' ? 'Copied' : 'Copy URL'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-md border border-amber-200 bg-white px-4 py-2 text-lg font-semibold tracking-[0.35em] text-gray-900">
                  {loginDetails.password}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(loginDetails.password, 'password')}
                  className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === 'password' ? 'Copied' : 'Copy Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="min-h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | AgentStatus)}
          className="min-h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">All status</option>
          <option value={AgentStatus.ACTIVE}>Active</option>
          <option value={AgentStatus.INACTIVE}>Inactive</option>
          <option value={AgentStatus.ON_LEAVE}>On leave</option>
          <option value={AgentStatus.SUSPENDED}>Suspended</option>
        </select>
        <button
          type="button"
          onClick={() => loadAgents()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading agents...
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-12 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No agents found</p>
            <p className="mt-1 text-sm text-gray-500">Add an agent to send them live chat login details.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Load</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgents.map((agent) => (
                  <tr key={agent._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.email}</p>
                      {agent.department ? <p className="text-xs text-gray-400">{agent.department}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                        {roleLabel(agent.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                        {agent.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {agent.currentActiveConversations || 0}/{agent.maxConcurrentConversations || 10}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(agent.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendLogin(agent)}
                          disabled={resendingId === agent._id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                          title="Send login details"
                        >
                          {resendingId === agent._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </button>
                        {deleteConfirm === agent._id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent)}
                              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(agent._id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                            title="Delete agent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">New agent</h2>
              <p className="mt-1 text-sm text-gray-500">They will receive this project&apos;s live chat URL and a 6 digit password.</p>
            </div>
            <form onSubmit={handleCreateAgent} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as AgentRole }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value={AgentRole.AGENT}>Agent</option>
                    <option value={AgentRole.TEAM_LEAD}>Team Lead</option>
                    <option value={AgentRole.SUPERVISOR}>Supervisor</option>
                    <option value={AgentRole.MANAGER}>Manager</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Department</span>
                <input
                  value={form.department}
                  onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))}
                  placeholder="Support, admissions, sales..."
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Create & Send
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
