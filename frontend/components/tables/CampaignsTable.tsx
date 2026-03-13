'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, Play, Pause, CheckCircle, Clock, Zap } from 'lucide-react';

interface Campaign {
  _id: string;
  name: string;
  description: string;
  type: 'broadcast' | 'drip' | 'automation' | 'ab-test';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  audience?: {
    estimatedReach?: number;
  };
  recipients?: {
    total?: number;
    sent?: number;
    delivered?: number;
    failed?: number;
  };
  stats?: {
    deliveryRate?: number;
    openRate?: number;
    clickRate?: number;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  onView?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  isLoading?: boolean;
}

type SortKey = 'name' | 'type' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function CampaignsTable({
  campaigns,
  onView,
  onEdit,
  onDelete,
  onPause,
  onResume,
  isLoading = false,
}: CampaignsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'broadcast' | 'drip' | 'automation' | 'ab-test'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'>('all');

  const filteredAndSorted = useMemo(() => {
    let filtered = campaigns.filter((campaign) => {
      const matchesSearch = 
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || campaign.type === filterType;
      const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [campaigns, searchQuery, sortKey, sortOrder, filterType, filterStatus]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
      case 'paused':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'broadcast':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200';
      case 'drip':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200';
      case 'automation':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200';
      case 'ab-test':
        return 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-200';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="broadcast">Broadcast</option>
          <option value="drip">Drip</option>
          <option value="automation">Automation</option>
          <option value="ab-test">A/B Test</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Campaign Name <SortIcon columnKey="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Type <SortIcon columnKey="type" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Status <SortIcon columnKey="status" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                Reach
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                Metrics
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading campaigns...
                </td>
              </tr>
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No campaigns found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((campaign) => (
                <tr
                  key={campaign._id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{campaign.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium inline-block ${getTypeColor(campaign.type)}`}>
                      {campaign.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(campaign.status)}
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {campaign.recipients?.total || campaign.audience?.estimatedReach || '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {campaign.recipients?.sent ? `${campaign.recipients.sent} sent` : 'Not started'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      {campaign.stats?.deliveryRate !== undefined && (
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{campaign.stats.deliveryRate.toFixed(0)}%</span> delivery
                        </p>
                      )}
                      {campaign.stats?.openRate !== undefined && (
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{campaign.stats.openRate.toFixed(0)}%</span> open
                        </p>
                      )}
                      {!campaign.stats?.deliveryRate && <p className="text-gray-400">—</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(campaign)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(campaign)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onPause && campaign.status === 'running' && (
                        <button
                          onClick={() => onPause(campaign)}
                          className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </button>
                      )}
                      {onResume && campaign.status === 'paused' && (
                        <button
                          onClick={() => onResume(campaign)}
                          className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                          title="Resume"
                        >
                          <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(campaign)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredAndSorted.length} of {campaigns.length} campaigns
      </div>
    </div>
  );
}
