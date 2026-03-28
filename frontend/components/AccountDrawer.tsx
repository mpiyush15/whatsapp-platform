'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { authService } from '@/lib/auth';
import { AccountType } from '@/lib/enums';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AccountInfo {
  _id: string;
  accountId: string;
  name: string;
  email: string;
  plan: string;
  billingCycle: string;
  createdAt: string;
  status: string;
  type: string;
  phone?: string;
  company?: string;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Helper function to format account type for display
  const formatAccountType = (type?: string): string => {
    if (!type) return 'Client';
    const typeMap: Record<string, string> = {
      [AccountType.INTERNAL]: 'Internal',
      [AccountType.CLIENT]: 'Client',
      [AccountType.AGENCY]: 'Agency',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [accountAge, setAccountAge] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const user = authService.getCurrentUser();
      setUserInfo(user);
      fetchAccountInfo();
    }
  }, [isOpen]);

  const fetchAccountInfo = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/accounts/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data.data);

        // Calculate account age
        if (data.data?.createdAt) {
          const createdDate = new Date(data.data.createdAt);
          const now = new Date();
          const diffTime = now.getTime() - createdDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = Math.floor(diffDays / 30);
          const diffYears = Math.floor(diffMonths / 12);

          if (diffYears > 0) {
            setAccountAge(`${diffYears} year${diffYears > 1 ? 's' : ''} ${diffMonths % 12} month${(diffMonths % 12) !== 1 ? 's' : ''}`);
          } else if (diffMonths > 0) {
            setAccountAge(`${diffMonths} month${diffMonths > 1 ? 's' : ''} ${diffDays % 30} day${(diffDays % 30) !== 1 ? 's' : ''}`);
          } else {
            setAccountAge(`${diffDays} day${diffDays !== 1 ? 's' : ''}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6 flex items-center justify-between border-b border-blue-800">
          <h2 className="text-xl font-bold">Account Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading...</div>
            </div>
          ) : (
            <>
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Personal Information</h3>
                <div className="space-y-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Name</p>
                    <p className="text-sm font-bold text-gray-900">{userInfo?.name || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Email Address</p>
                    <p className="text-sm font-mono text-gray-900">{userInfo?.email || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Role</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {userInfo?.role === 'admin' ? 'Client Admin' : userInfo?.role?.charAt(0).toUpperCase() + userInfo?.role?.slice(1) || 'User'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      userInfo?.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : userInfo?.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userInfo?.status?.charAt(0).toUpperCase() + userInfo?.status?.slice(1) || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization Information */}
              {accountInfo && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Organization Information</h3>
                  <div className="space-y-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Organization Name</p>
                      <p className="text-sm font-bold text-gray-900">{accountInfo.name || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Organization Email</p>
                      <p className="text-sm font-mono text-gray-900">{accountInfo.email || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Account ID</p>
                      <p className="text-sm font-mono font-bold text-blue-600">{accountInfo.accountId || 'N/A'}</p>
                    </div>

                    {accountInfo.company && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Company</p>
                        <p className="text-sm text-gray-900">{accountInfo.company}</p>
                      </div>
                    )}

                    {accountInfo.phone && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Phone</p>
                        <p className="text-sm font-mono text-gray-900">{accountInfo.phone}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Current Plan</p>
                      <p className="text-sm font-bold text-gray-900 capitalize">{accountInfo.plan || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Billing Cycle</p>
                      <p className="text-sm font-bold text-gray-900 capitalize">{accountInfo.billingCycle || 'Monthly'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Account Type</p>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 capitalize">
                        {formatAccountType(accountInfo.type)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Created On</p>
                      <p className="text-sm text-gray-900">
                        {new Date(accountInfo.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    {accountAge && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Account Age</p>
                        <p className="text-sm font-semibold text-gray-900">{accountAge}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Account Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        accountInfo.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : accountInfo.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {accountInfo.status?.charAt(0).toUpperCase() + accountInfo.status?.slice(1) || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    window.location.href = '/dashboard/settings';
                    onClose();
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Account Settings
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/dashboard/billing';
                    onClose();
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  View Billing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
