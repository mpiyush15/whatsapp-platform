'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';

interface AgentsTabProps {
  projectId: string;
  accountId?: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  conversations: number;
  joinedAt: string;
  role: 'admin' | 'agent' | 'supervisor';
}

export default function AgentsTab({ projectId, accountId }: AgentsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // ✅ STATIC DATA - Functions to be implemented later
  const staticAgents: Agent[] = [
    {
      id: 'agent_001',
      name: 'Rahul Kumar',
      email: 'rahul@company.com',
      status: 'active',
      conversations: 24,
      joinedAt: '2026-01-15',
      role: 'agent',
    },
    {
      id: 'agent_002',
      name: 'Priya Singh',
      email: 'priya@company.com',
      status: 'active',
      conversations: 18,
      joinedAt: '2026-02-10',
      role: 'supervisor',
    },
    {
      id: 'agent_003',
      name: 'Amit Patel',
      email: 'amit@company.com',
      status: 'inactive',
      conversations: 0,
      joinedAt: '2026-03-01',
      role: 'agent',
    },
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setAgents(staticAgents);
      setIsLoading(false);
    }, 500);
  }, []);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: Agent['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800';
      case 'agent':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddAgent = () => {
    setShowAddModal(true);
  };

  const handleDeleteAgent = (agentId: string) => {
    alert(`Delete agent: ${agentId}`);
    // TODO: Implement delete function
  };

  const handleEditAgent = (agentId: string) => {
    alert(`Edit agent: ${agentId}`);
    // TODO: Implement edit modal
  };

  const handleViewAgentDetails = (agentId: string) => {
    alert(`View agent details: ${agentId}`);
    // TODO: Implement view modal
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Agents</h3>
          <p className="text-gray-600 mt-1">Manage your support team and agent assignments</p>
        </div>
        <button
          onClick={handleAddAgent}
          className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2 rounded-md font-medium transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive' | 'pending')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by creating your first agent'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={handleAddAgent}
              className="mt-4 bg-teal-700 hover:bg-teal-800 text-white px-6 py-2 rounded-md font-medium transition flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Agent
            </button>
          )}
        </div>
      ) : (
        /* Agents Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Conversations</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Joined</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                    <td className="px-6 py-4 text-gray-600">{agent.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(agent.role)}`}>
                        {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(agent.status)}`}>
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{agent.conversations}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(agent.joinedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewAgentDetails(agent.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditAgent(agent.id)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Agent</h2>
            <p className="text-gray-600 text-sm mb-6">
              This modal will contain the form to add a new agent. Implementation coming in the next phase.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-md font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
