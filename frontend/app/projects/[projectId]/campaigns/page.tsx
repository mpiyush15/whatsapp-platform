'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { ErrorToast } from '@/components/ErrorToast';
import { CampaignType, CampaignStatus } from '@/lib/enums';

interface Campaign {
  _id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: {
    type: string;
    estimatedReach: number;
  };
  recipients: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  stats: {
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams()
  const projectId = params.projectId as string

  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasWABA, setHasWABA] = useState<boolean | null>(null);
  const [checkingWABA, setCheckingWABA] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('recent');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch campaigns
  useEffect(() => {
    checkWABAConnection();
  }, [projectId]);

  const checkWABAConnection = async () => {
    try {
      setCheckingWABA(true);
      
      const response = await fetch(
        `/api/settings/phone-numbers?projectId=${projectId}`
      );

      if (!response.ok) {
        setHasWABA(false);
        setCheckingWABA(false);
        return;
      }

      const data = await response.json();
      const hasPhones = data.phoneNumbers && data.phoneNumbers.length > 0;
      setHasWABA(hasPhones);

      // Only fetch campaigns if WABA is connected
      if (hasPhones) {
        fetchCampaignsData();
      }
    } catch (err) {
      console.error("Error checking WABA:", err);
      setHasWABA(false);
    } finally {
      setCheckingWABA(false);
    }
  };

  const fetchCampaignsData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        projectId: projectId,
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(
        `/api/campaigns?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasWABA) return;

    fetchCampaignsData();
  }, [page, statusFilter, typeFilter, searchQuery, limit, hasWABA, projectId]);

  // Handle delete
  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}?projectId=${projectId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) throw new Error('Failed to delete campaign');

      setCampaigns(campaigns.filter(c => c._id !== campaignId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  };

  // Handle status action
  const handleStatusAction = async (campaignId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/${action}?projectId=${projectId}`,
        {
          method: 'POST'
        }
      );

      if (!response.ok) throw new Error(`Failed to ${action} campaign`);

      const updatedCampaign = await response.json();
      setCampaigns(campaigns.map(c => c._id === campaignId ? updatedCampaign.campaign : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} campaign`);
    }
  };

  // Status badge color
  const getStatusColor = (status: CampaignStatus) => {
    const colors: Record<CampaignStatus, string> = {
      [CampaignStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [CampaignStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
      [CampaignStatus.RUNNING]: 'bg-green-100 text-green-800',
      [CampaignStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
      [CampaignStatus.COMPLETED]: 'bg-purple-100 text-purple-800',
      [CampaignStatus.FAILED]: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Type badge icon
  const getTypeIcon = (type: CampaignType) => {
    const icons: Record<CampaignType, string> = {
      [CampaignType.BROADCAST]: '📢',
      [CampaignType.DRIP]: '💧',
      [CampaignType.AUTOMATION]: '⚙️',
      [CampaignType.AB_TEST]: '🧪'
    };
    return icons[type] || '📧';
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show blocking message if WABA not connected
  if (checkingWABA) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Campaigns</h1>
          <div className="p-4 sm:p-8 text-center bg-white rounded-lg border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">Checking WhatsApp connection...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasWABA === false) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Campaigns</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-3">WhatsApp Business Account Not Connected</h2>
                <p className="text-red-700 mb-4">
                  You must connect a WhatsApp Business Account (WABA) before creating campaigns.
                </p>
                <div className="bg-white rounded p-4 mb-4 text-sm text-gray-700">
                  <p className="font-semibold mb-3">To connect your WhatsApp account:</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Go to <strong>Project → Settings</strong></li>
                    <li>Click <strong>"Add Phone Number"</strong></li>
                    <li>Enter your <strong>Phone Number ID</strong>, <strong>WABA ID</strong>, and <strong>Access Token</strong></li>
                    <li>Click <strong>"Add"</strong> to complete setup</li>
                  </ol>
                </div>
                <Link
                  href={`/projects/${projectId}/settings?tab=whatsapp`}
                  className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Go to WhatsApp Setup
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Create and manage your WhatsApp campaigns</p>
          </div>
          <Link
            href={`/projects/${projectId}/campaigns/create`}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-xs sm:text-base"
          >
            <span className="text-lg sm:text-xl mr-1 sm:mr-2">+</span>
            New Campaign
          </Link>
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value={CampaignStatus.DRAFT}>Draft</option>
              <option value={CampaignStatus.SCHEDULED}>Scheduled</option>
              <option value={CampaignStatus.RUNNING}>Running</option>
              <option value={CampaignStatus.PAUSED}>Paused</option>
              <option value={CampaignStatus.COMPLETED}>Completed</option>
              <option value={CampaignStatus.FAILED}>Failed</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="broadcast">Broadcast</option>
              <option value="drip">Drip</option>
              <option value="automation">Automation</option>
              <option value="ab-test">A/B Testing</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* Clear Filters */}
            {(statusFilter || typeFilter || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Error Message - Mobile Optimized */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 sm:mb-6 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Campaigns - Mobile Card Layout */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-600 mx-auto mb-3 sm:mb-4"></div>
                <p className="text-xs sm:text-sm text-gray-600">Loading campaigns...</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">No campaigns found</p>
                <Link
                  href={`/projects/${projectId}/campaigns/create`}
                  className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-xs sm:text-sm"
                >
                  Create your first campaign
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div
                  key={campaign._id}
                  className="p-3 sm:p-6 hover:bg-gray-50 transition flex flex-col gap-3 sm:gap-4"
                >
                  {/* Header - Campaign Name + Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {campaign.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate mt-1">
                        {campaign.description || 'No description'}
                      </p>
                    </div>
                    <span className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </span>
                  </div>

                  {/* Type + Recipients */}
                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Type</p>
                      <p className="font-medium text-gray-900">
                        <span className="text-base mr-1">{getTypeIcon(campaign.type)}</span>
                        <span className="capitalize">{campaign.type}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Recipients</p>
                      <p className="font-semibold text-gray-900">
                        {campaign.recipients.sent} / {campaign.recipients.total}
                      </p>
                      <p className="text-[10px] text-gray-500">{campaign.recipients.pending} pending</p>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-2">Delivery Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                          <div className="h-1.5 bg-green-600 rounded-full" style={{ width: `${campaign.stats.deliveryRate}%` }}></div>
                        </div>
                        <span className="font-semibold text-gray-900 text-[10px] sm:text-xs w-8 text-right">{campaign.stats.deliveryRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-2">Open Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                          <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: `${campaign.stats.openRate}%` }}></div>
                        </div>
                        <span className="font-semibold text-gray-900 text-[10px] sm:text-xs w-8 text-right">{campaign.stats.openRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Created Date + Actions */}
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 gap-2">
                    <p className="text-[10px] sm:text-xs text-gray-600">
                      Created: {formatDate(campaign.createdAt)}
                    </p>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      {/* View/Edit */}
                      <Link
                        href={`/projects/${projectId}/campaigns/${campaign._id}`}
                        className="text-base sm:text-lg text-blue-600 hover:text-blue-700 transition"
                        title="View details"
                      >
                        👁️
                      </Link>

                      {/* Start */}
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleStatusAction(campaign._id, 'start')}
                          className="text-base sm:text-lg text-green-600 hover:text-green-700 transition"
                          title="Start campaign"
                        >
                          ▶️
                        </button>
                      )}

                      {/* Pause */}
                      {campaign.status === 'running' && (
                        <button
                          onClick={() => handleStatusAction(campaign._id, 'pause')}
                          className="text-base sm:text-lg text-yellow-600 hover:text-yellow-700 transition"
                          title="Pause campaign"
                        >
                          ⏸️
                        </button>
                      )}

                      {/* Resume */}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleStatusAction(campaign._id, 'resume')}
                          className="text-base sm:text-lg text-blue-600 hover:text-blue-700 transition"
                          title="Resume campaign"
                        >
                          ▶️
                        </button>
                      )}

                      {/* Delete */}
                      {(campaign.status === 'draft' || campaign.status === 'failed') && (
                        <button
                          onClick={() => handleDelete(campaign._id)}
                          className="text-base sm:text-lg text-red-600 hover:text-red-700 transition"
                          title="Delete campaign"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && campaigns.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold">{page}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={campaigns.length < limit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
