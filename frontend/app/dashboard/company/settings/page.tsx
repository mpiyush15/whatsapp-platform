'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    accountId: '',
    userId: ''
  });

  useEffect(() => {
    const initPage = async () => {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      
      // Fetch profile data
      try {
        const response = await fetch(`${API_URL}/settings/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.profile) {
            setProfileData({
              name: data.data.profile.name || '',
              email: data.data.profile.email || '',
              company: data.data.profile.company || '',
              phone: data.data.profile.phone || '',
              timezone: data.data.profile.timezone || 'Asia/Kolkata',
              accountId: data.data.profile.accountId || '',
              userId: data.data.profile._id || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }

      setLoading(false);
    };

    initPage();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {profileData.name || user?.name || 'User'}! 👋</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences from here.</p>
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1 - Left Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Menu</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'profile'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'account'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'security'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'billing'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Billing
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'integrations'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Integrations
            </button>
          </nav>
        </div>

        {/* Column 2-3 - Content Area */}
        <div className="md:col-span-2">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={profileData.company}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={profileData.accountId}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profileData.accountId);
                        alert('Copied!');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <input
                    type="text"
                    value={profileData.timezone}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={profileData.userId.substring(0, 20)}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profileData.userId);
                        alert('Copied!');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-green-700 font-semibold mt-1">✓ Active</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
                    Change Password
                  </button>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Two-Factor Authentication</p>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing Information</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Plan Type</span>
                  <span className="font-semibold text-gray-900">Lifetime</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Status</span>
                  <span className="font-semibold text-green-700">Active</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-600">Next Billing Date</span>
                  <span className="font-semibold text-gray-900">N/A</span>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Integrations</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">WhatsApp Business</p>
                    <p className="text-sm text-gray-600">Connect your WhatsApp account</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
                    Connect
                  </button>
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-semibold text-gray-900">API Keys</p>
                    <p className="text-sm text-gray-600">Manage your API keys</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

