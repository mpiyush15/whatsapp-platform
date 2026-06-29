'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Edit, Loader2, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface ProjectAccount {
  projectId: string;
  accountId: string;
  name: string;
  email?: string;
  whatsappPhoneNumber?: string;
  whatsappBusinessAccountId?: string;
  description?: string;
  account?: {
    email: string;
    name: string;
    plan: string;
    status: string;
    billingCycle: string;
    timezone: string;
    createdAt: string;
    type: string;
  };
}

export default function ProjectAccountPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [account, setAccount] = useState<ProjectAccount | null>(null);
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
    description: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectAccount();
    }
  }, [projectId]);

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
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const fetchProjectAccount = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });
      const headers = getHeaders();
      
      const res = await fetch(`${API_URL}/projects/${projectId}?projectId=${projectId}`, { headers });

      if (res.ok) {
        const data = await res.json();
        const projectData = data.data || data;
        
        setAccount(projectData);
        setFormData({
          name: projectData.name || '',
          email: projectData.email || '',
          phone: projectData.whatsappPhoneNumber || '',
          description: projectData.description || ''
        });
      } else if (res.status === 404) {
        setMessage({ type: 'error', text: 'Project not found' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to fetch project details' });
      }
    } catch (error) {
      console.error('Error fetching project account:', error);
      setMessage({ type: 'error', text: 'Failed to fetch project details' });
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
      const res = await fetch(`${API_URL}/projects/${projectId}?projectId=${projectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          whatsappPhoneNumber: formData.phone
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAccount(data.data);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Project account updated successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update project account' });
      }
    } catch (error) {
      console.error('Error updating project account:', error);
      setMessage({ type: 'error', text: 'Error updating project account' });
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
        body: JSON.stringify({
          email: resetEmail,
          projectId: projectId
        })
      });

      if (res.ok) {
        setResetMessage({ type: 'success', text: 'Password reset link sent to email' });
        setResetEmail('');
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
        <div className="text-gray-600">Loading project account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Replysys Account Profile</h1>
        <p className="text-gray-600 text-sm mt-1">Manage your account settings</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Account Card */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-lg border border-gray-200 p-8 w-full">
              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-teal-300 flex items-center justify-center text-white text-4xl font-bold">
                  {account?.name?.charAt(0).toUpperCase() || 'P'}
                </div>
              </div>

              {/* Account Info */}
              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Account</p>
                <p className="text-lg font-bold text-gray-900">{account?.account?.email || 'Account'}</p>
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
          </div>

          {/* Right Content - Account Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Profile Details</h2>

              {/* Account Info Card - Brief */}
              {account?.account && (
                <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account Name</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{account.account.name || 'Not set'}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account ID</p>
                      <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">{account.accountId}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Account Email</p>
                      <p className="mt-1 break-all text-sm font-semibold text-gray-900">{account.account.email}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Plan</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{account.account.plan}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Status</p>
                      <p className={`mt-1 text-sm font-semibold capitalize ${account.account.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                        {account.account.status}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Billing</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{account.account.billingCycle}</p>
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
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Project Name</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{formData.name}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Account Mobile Number</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{formData.phone || 'Not set'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
                      <p className="mt-2 text-base text-gray-700">{formData.description || 'No description'}</p>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="space-y-6">
                    {/* Project Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter project name"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number
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

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter project description"
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
                  Enter your email address to receive a password reset link
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
                        setResetEmail('');
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
          </div>
        </div>
      </div>
    </div>
  );
}
