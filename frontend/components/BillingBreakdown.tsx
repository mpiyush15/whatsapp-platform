'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Users, MessageSquare, Zap, Database } from 'lucide-react';

interface BillingBreakdownProps {
  organizationId?: string;
}

interface UsageData {
  messagesSent: number;
  messagesCost: number;
  activeMembers: number;
  membersCost: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number; // in MB
  campaignsCount: number;
  contactsCount: number;
}

export default function BillingBreakdown({ organizationId }: BillingBreakdownProps) {
  const [usage, setUsage] = useState<UsageData>({
    messagesSent: 0,
    messagesCost: 0,
    activeMembers: 0,
    membersCost: 0,
    apiCallsUsed: 0,
    apiCallsLimit: 10000,
    storageUsed: 0,
    campaignsCount: 0,
    contactsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, [organizationId]);

  const fetchUsageData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(
        `${API_URL}/billing/usage${organizationId ? `?orgId=${organizationId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsage(data.data || usage);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalMonthlyCost = (usage?.messagesCost || 0) + (usage?.membersCost || 0);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // Handle undefined or null usage data
  if (!usage) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No billing information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Monthly Cost */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-semibold mb-1">Estimated Monthly Cost</p>
            <h3 className="text-4xl font-bold">₹{totalMonthlyCost.toLocaleString('en-IN')}</h3>
          </div>
          <DollarSign className="w-16 h-16 opacity-50" />
        </div>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Messages Sent */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Messages Sent (This Month)</h4>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{(usage?.messagesSent || 0).toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-600">Cost: <span className="font-semibold text-gray-900">₹{(usage?.messagesCost || 0).toLocaleString('en-IN')}</span></p>
            <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-green-500 h-full" 
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">60% of typical usage</p>
          </div>
        </div>

        {/* Active Team Members */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Active Team Members</h4>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{usage?.activeMembers || 0}</p>
            <p className="text-sm text-gray-600">Cost: <span className="font-semibold text-gray-900">₹{(usage?.membersCost || 0).toLocaleString('en-IN')}/month</span></p>
            <div className="mt-3 text-xs text-gray-500">
              <p>₹500 per agent per month</p>
            </div>
          </div>
        </div>

        {/* API Calls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-gray-900">API Calls</h4>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{(usage?.apiCallsUsed || 0).toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-600">Limit: <span className="font-semibold">{(usage?.apiCallsLimit || 0).toLocaleString('en-IN')}</span></p>
            <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${Math.min(100, ((usage?.apiCallsUsed || 0) / (usage?.apiCallsLimit || 1)) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{(((usage?.apiCallsUsed || 0) / (usage?.apiCallsLimit || 1)) * 100).toFixed(1)}% of limit</p>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Storage Used</h4>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{(usage?.storageUsed || 0).toLocaleString('en-IN')} MB</p>
            <p className="text-sm text-gray-600">Included: <span className="font-semibold">Unlimited</span></p>
            <div className="mt-3">
              <p className="text-xs text-gray-500">No additional charges</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Messages ({(usage?.messagesSent || 0).toLocaleString('en-IN')})</span>
            <span className="font-semibold text-gray-900">₹{(usage?.messagesCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-gray-200"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Team Members ({usage?.activeMembers || 0})</span>
            <span className="font-semibold text-gray-900">₹{(usage?.membersCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-gray-200"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Overage Charges</span>
            <span className="font-semibold text-gray-900">₹0</span>
          </div>
          <div className="border-t-2 border-gray-300 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Subtotal (Excl. GST)</span>
              <span className="text-lg font-bold text-gray-900">₹{totalMonthlyCost.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <strong>💡 Tip:</strong> Upgrade to annual billing and save 15% on your monthly costs!
        </p>
      </div>
    </div>
  );
}
