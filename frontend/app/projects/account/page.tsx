'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Loader2, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import GlobalHeader from '@/components/GlobalHeader';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface AccountInfo {
  _id: string;
  name: string;
  email: string;
  accountId: string;
  phone?: string;
  company?: string;
  plan?: string;
  status?: string;
  billingCycle?: string;
  timezone?: string;
  type?: string;
}

export default function GlobalAccountPage() {
  const router = useRouter();
  
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    fetchAccount();
  }, []);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return null;
  };

  const getHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      }).catch(() => null);
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const fetchAccount = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });
      const headers = getHeaders();
      
      // Fetching from the self-service route
      const res = await fetch(`${API_URL}/account/me`, { headers });

      if (res.ok) {
        const json = await res.json();
        // The backend wraps the response in data: { data: { ... } }
        const accountData = json.data?.data ? json.data.data : json.data;
        
        setAccount(accountData);
        setFormData({
          name: accountData.name || '',
          email: accountData.email || '',
          phone: accountData.phone || '',
          company: accountData.company || ''
        });
        setResetEmail(accountData.email || '');
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to fetch account details' });
      }
    } catch (error) {
      console.error('Error fetching account:', error);
      setMessage({ type: 'error', text: 'Failed to fetch account details' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });
      const headers = getHeaders();
      
      const res = await fetch(`${API_URL}/accounts/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          phone: formData.phone
        })
      });

      if (res.ok) {
        // Refresh account details to get the latest
        await fetchAccount();
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Account updated successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update account' });
      }
    } catch (error) {
      console.error('Error updating account:', error);
      setMessage({ type: 'error', text: 'Error updating account' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!resetEmail.trim()) {
        setResetMessage({ type: 'error', text: 'Please enter email address' });
        return;
      }

      setIsSaving(true);
      setResetMessage({ type: '', text: '' });
      const headers = getHeaders();
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: resetEmail })
      });

      if (res.ok) {
        setResetMessage({ type: 'success', text: 'Password reset link sent to email' });
        setShowResetPassword(false);
        setTimeout(() => setResetMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await res.json();
        setResetMessage({ type: 'error', text: error.error || 'Failed to send reset link' });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetMessage({ type: 'error', text: 'Error sending reset link' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading account...</div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalHeader showBack />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto px-6 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Account Card */}
          <motion.div variants={itemVariants} className="flex flex-col items-center">
            <div className="bg-white rounded-lg border border-gray-200 p-8 w-full">
              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-teal-300 flex items-center justify-center text-white text-4xl font-bold">
                  {account?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>

              {/* Account Info */}
              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Account</p>
                <p className="text-lg font-bold text-gray-900">{account?.email || 'No email'}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {isEditing ? 'Done Editing' : 'Edit'}
                </button>
                <button
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
                >
                  Reset Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Account Form */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Profile Details</h2>

              {/* Account Info Card - Brief */}
              {account && (
                <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account Name</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{account.name || 'Not set'}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account ID</p>
                      <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">{account.accountId}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account Email</p>
                      <p className="mt-1 break-all text-sm font-semibold text-gray-900">{account.email}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Plan</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{account.plan || 'Free'}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Status</p>
                      <p className={`mt-1 text-sm font-semibold capitalize ${account.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                        {account.status || 'Active'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Billing</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{account.billingCycle || 'Monthly'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {message.text && (
                <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              <div className="space-y-6">
                {!isEditing ? (
                  // Display Mode
                  <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contact Number</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{formData.phone || 'Not set'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Company</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{formData.company || 'Not set'}</p>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="space-y-6">
                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter your name"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setMessage({ type: '', text: '' });
                      }}
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password Reset Section */}
            {showResetPassword && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h3>
                
                {resetMessage.text && (
                  <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
                    resetMessage.type === 'success' 
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {resetMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium">{resetMessage.text}</p>
                  </div>
                )}

                <p className="text-gray-600 text-sm mb-4">
                  Confirm your email address to receive a password reset link
                </p>

                <div className="space-y-4">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleResetPassword}
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowResetPassword(false);
                        setResetMessage({ type: '', text: '' });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
