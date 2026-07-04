'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus, ArrowRight, LayoutDashboard, MessageSquare,
  Settings, Megaphone, CheckCircle2,
  Building2, Stethoscope, GraduationCap, Scissors, FlaskConical, Briefcase,
  Link as LinkIcon, Lock, Trash2, User, CreditCard, MessageCircle, PlayCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import CreateProjectWizard from '@/components/projects/CreateProjectWizard';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalHeader from '@/components/GlobalHeader';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Project {
  _id: string;
  projectId: string;
  name: string;
  status: 'active' | 'inactive';
  vertical?: string;
  createdAt: string;
  accountId: string;
  whatsappPhoneNumberId?: string;
}

interface Account {
  plan: string;
  billingCycle: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, any>>({});
  const [accountData, setAccountData] = useState<Account | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockModalMessage, setLockModalMessage] = useState({ title: 'Feature Locked', text: 'You need an active professional plan to use this feature.' });
  const [activeTab, setActiveTab] = useState<'workspaces' | 'create' | 'account' | 'support' | 'learn'>('workspaces');
  
  const user = authService.getCurrentUser();
  const isInternalAccount = user?.email === 'pixelsadvertise@gmail.com';

  const currentPlan = subscription?.planName || 'free';
  const hasNoPlan = false; // TEMPORARILY UNLOCKED
  const isFreePlan = false; // TEMPORARILY UNLOCKED

  useEffect(() => {
    fetchProjectsAndAccount();
  }, []);

  useEffect(() => {
    if (searchParams.get('setup') === '1' && !hasNoPlan) {
      setWizardOpen(true);
      setActiveTab('create');
    }
  }, [searchParams, hasNoPlan]);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return null;
  };

  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchProjectsAndAccount = async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeaders();

      const accountRes = await fetch(`${API_URL}/account/me`, { headers });
      if (accountRes.ok) {
        const accountJson = await accountRes.json();
        const actualData = accountJson.data?.data ? accountJson.data.data : accountJson.data;
        setAccountData(actualData || null);
      }

      const subRes = await fetch(`${API_URL}/subscription/my-subscription`, { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        const activeSub = subData.data?.subscriptions?.find((s: any) => s.status === 'active');
        setSubscription(activeSub || null);
      }

      const projectRes = await fetch(`${API_URL}/projects`, { headers });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        const projs = projectData.data || [];
        setProjects(projs);

        const statsMap: Record<string, any> = {};
        await Promise.all(projs.map(async (p: Project) => {
          try {
            const statRes = await fetch(`${API_URL}/projects/${p.projectId}/stats`, { headers });
            if (statRes.ok) {
              const statData = await statRes.json();
              statsMap[p.projectId] = statData.data;
            }
          } catch (e) { }
        }));
        setProjectStats(statsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (
    project: { projectId: string; name: string; vertical?: string },
    redirectPath: string,
  ) => {
    setProjects((prev) => [
      {
        _id: project.projectId,
        projectId: project.projectId,
        name: project.name,
        status: 'active',
        vertical: project.vertical,
        createdAt: new Date().toISOString(),
        accountId: '',
      },
      ...prev,
    ]);
    router.push(redirectPath);
  };

  const handleViewProject = (project: Project, section?: string) => {
    if (hasNoPlan) {
      setLockModalMessage({ title: 'Workspace Locked', text: 'You need to select a plan to view and manage your workspace.' });
      return setShowLockModal(true);
    }

    let basePath = `/projects/${project.projectId}`;
    if (project.vertical === 'healthcare') {
      basePath = `/projects/${project.projectId}/healthcare`;
    } else if (project.vertical === 'pathology') {
      basePath = `/projects/${project.projectId}/pathology`;
    } else if (project.vertical === 'education') {
      basePath = `/projects/${project.projectId}/education/enquiries`;
    }

    if (section === 'inbox') return router.push(`/projects/${project.projectId}/live-chat-v2`);
    if (section === 'templates') return router.push(`/projects/${project.projectId}?tab=templates`);
    if (section === 'broadcast') return router.push(`/projects/${project.projectId}/campaigns`);
    if (section === 'settings') return router.push(`/projects/${project.projectId}?tab=settings`);

    if (section && section !== 'dashboard') {
      basePath += `/${section}`;
    }
    router.push(basePath);
  };

  const toggleProjectStatus = async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProjects(projects.map(p => p.projectId === projectId ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to permanently delete this workspace? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setProjects(projects.filter(p => p.projectId !== projectId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete workspace');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete workspace');
    }
  };

  const handleCreateClick = (vertical: string = 'general') => {
    if (hasNoPlan) {
      setLockModalMessage({ title: 'Creation Locked', text: 'You need to select a plan to create a business workspace.' });
      setShowLockModal(true);
      return;
    }

    if (isFreePlan && vertical !== 'general') {
      setLockModalMessage({ title: 'Premium Vertical', text: 'Specialized verticals like Healthcare, Education, and Salon require a professional plan. Upgrade to unlock.' });
      setShowLockModal(true);
      return;
    }

    setWizardOpen(true);
  };

  const getVerticalIcon = (vertical?: string) => {
    if (vertical === 'healthcare') return <Stethoscope className="w-5 h-5 text-blue-600" />;
    if (vertical === 'education') return <GraduationCap className="w-5 h-5 text-indigo-600" />;
    if (vertical === 'salon') return <Scissors className="w-5 h-5 text-pink-600" />;
    if (vertical === 'pathology') return <FlaskConical className="w-5 h-5 text-purple-600" />;
    return <Building2 className="w-5 h-5 text-teal-600" />;
  };

  const verticalLabel = (v?: string) => {
    if (v === 'healthcare') return 'Healthcare';
    if (v === 'pathology') return 'Diagnostic Lab';
    if (v === 'education') return 'Education';
    if (v === 'salon') return 'Salon & Spa';
    if (v === 'ecommerce') return 'E-commerce';
    return 'General Business';
  };

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
    <div className="min-h-screen bg-[#f7f2ed]">
      <GlobalHeader />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-gray-200 mb-8 pb-4">
          <button 
            onClick={() => setActiveTab('workspaces')}
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'workspaces' ? 'border-[#115B4C] text-[#115B4C]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Workspaces
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'create' ? 'border-[#115B4C] text-[#115B4C]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Create New
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'account' ? 'border-[#115B4C] text-[#115B4C]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Account & Billing
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'support' ? 'border-[#115B4C] text-[#115B4C]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Support
          </button>
          <button 
            onClick={() => setActiveTab('learn')}
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'learn' ? 'border-[#115B4C] text-[#115B4C]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Learn Replysys
          </button>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {activeTab === 'workspaces' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLoading || projects.length > 0 ? 'Your Workspaces' : 'No Workspaces Yet'}
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-4 animate-content-in">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-6" />
                    </div>
                  ))}
                </div>
              ) : projects.length > 0 ? (
                <motion.div variants={containerVariants} className="space-y-6">
                  <AnimatePresence>
                    {projects.map((project) => (
                      <motion.div
                        key={project._id}
                        layout
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer ${hasNoPlan ? 'opacity-80' : ''}`}
                        onClick={() => handleViewProject(project, 'dashboard')}
                      >
                        {hasNoPlan && (
                          <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl border-2 border-transparent">
                            <button onClick={(e) => { e.stopPropagation(); setShowLockModal(true); }} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 shadow-lg">
                              <Lock className="w-4 h-4" /> Unlock Workspace
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                              {getVerticalIcon(project.vertical)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{project.name}</h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1 font-medium text-[#115B4C] bg-[#115B4C]/10 px-2 py-0.5 rounded-md text-xs border border-[#115B4C]/20">
                                  {verticalLabel(project.vertical)}
                                </span>
                                {project.whatsappPhoneNumberId && (
                                  <span className="flex items-center gap-1">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    WhatsApp Connected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Toggle Switch */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProjectStatus(project.projectId, project.status || 'active');
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shadow-inner ${(project.status || 'active') === 'active' ? 'bg-[#115B4C]' : 'bg-gray-300'
                                }`}
                              title="Toggle Workspace Status"
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${(project.status || 'active') === 'active' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${(project.status || 'active') === 'active' ? 'text-[#115B4C] bg-[#115B4C]/10' : 'text-gray-500 bg-gray-100'
                              }`}>
                              {(project.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                            </span>
                            <ArrowRight className="text-gray-400 w-5 h-5" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Workspaces Created</h3>
                  <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">
                    Create your first business workspace to connect WhatsApp and start automating your customer communication.
                  </p>
                  <button onClick={() => setActiveTab('create')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#115B4C] text-white font-bold rounded-lg hover:bg-[#115B4C]/90 transition-colors">
                    <Plus className="w-4 h-4" /> Create First Workspace
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Your Business Workspace</h2>
              <p className="text-gray-500 mb-8 max-w-xl text-sm leading-relaxed">
                Create a dedicated communication workspace for your business. Connect WhatsApp,
                automate conversations, and manage customer engagement from one place.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleCreateClick('healthcare')} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm rounded-xl p-5 text-left transition-all group relative">
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <Stethoscope className="w-6 h-6 text-[#115B4C]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center justify-between">Healthcare {isFreePlan && <Lock className="w-4 h-4 text-gray-400" />}</h3>
                  <p className="text-xs text-gray-500">Patients • Appointments</p>
                </button>

                <button onClick={() => handleCreateClick('education')} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm rounded-xl p-5 text-left transition-all group relative">
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <GraduationCap className="w-6 h-6 text-[#115B4C]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center justify-between">Education {isFreePlan && <Lock className="w-4 h-4 text-gray-400" />}</h3>
                  <p className="text-xs text-gray-500">Admissions • Students</p>
                </button>

                <button onClick={() => handleCreateClick('salon')} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm rounded-xl p-5 text-left transition-all group relative">
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <Scissors className="w-6 h-6 text-[#115B4C]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center justify-between">Salon & Spa {isFreePlan && <Lock className="w-4 h-4 text-gray-400" />}</h3>
                  <p className="text-xs text-gray-500">Bookings • Offers</p>
                </button>

                <button onClick={() => handleCreateClick('general')} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm rounded-xl p-5 text-left transition-all group">
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <Briefcase className="w-6 h-6 text-[#115B4C]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">General</h3>
                  <p className="text-xs text-gray-500">Custom Setup</p>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#115B4C]/10 rounded-full flex items-center justify-center text-[#115B4C] font-bold text-2xl">
                    {authService.getCurrentUser()?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{authService.getCurrentUser()?.name || 'User'}</h3>
                    <p className="text-sm text-gray-500">{authService.getCurrentUser()?.email}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => router.push('/projects/account')}
                    className="flex-1 flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#115B4C]/30 hover:bg-[#115B4C]/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors border border-gray-100">
                        <User className="w-5 h-5 text-gray-500 group-hover:text-[#115B4C]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Account Settings</p>
                        <p className="text-xs text-gray-500">Manage profile & preferences</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#115B4C] transition-colors" />
                  </button>

                  <button
                    onClick={() => router.push('/projects/billing')}
                    className="flex-1 flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#115B4C]/30 hover:bg-[#115B4C]/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors border border-gray-100">
                        <CreditCard className="w-5 h-5 text-gray-500 group-hover:text-[#115B4C]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Billing & Subscriptions</p>
                        <p className="text-xs text-gray-500">Manage plans & payments</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#115B4C] transition-colors" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'support' && (
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Help & Support</h3>
              <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
                Need assistance? Our support team is here to help you. Reach out to us via WhatsApp for quick resolutions.
              </p>
              <a 
                href="https://wa.me/919766504856?text=Hi%2C%20I%20need%20help%20with%20Replysys" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#115B4C] text-white font-bold rounded-lg hover:bg-[#115B4C]/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Support
              </a>
            </motion.div>
          )}

          {activeTab === 'learn' && (
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <PlayCircle className="w-8 h-8 text-[#115B4C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Learn Replysys</h3>
              <p className="text-gray-500 mb-8 text-sm max-w-md mx-auto">
                Video tutorials and guides will be available here soon to help you get the most out of Replysys.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
                {/* Placeholders for future videos */}
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-hidden group cursor-pointer hover:border-[#115B4C]/30 transition-colors">
                    <div className="bg-gray-200 w-full h-32 rounded-lg mb-4 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                      <PlayCircle className="w-10 h-10 text-gray-400 group-hover:text-[#115B4C] transition-colors" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Coming Soon</h4>
                    <p className="text-xs text-gray-500">Video tutorial placeholder</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-8 flex items-center justify-center gap-6 text-sm text-gray-500 border-t border-gray-200/60 pt-6 mt-4">
        <span className="font-medium text-gray-600 mr-2">Need help?</span>
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" />
          <a href="https://wa.me/919766504856?text=Hi%2C%20I%20need%20help%20with%20Replysys" target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition font-medium">WhatsApp Support (+91 97665 04856)</a>
        </span>
      </div>

      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-content-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{lockModalMessage.title}</h3>
              <p className="text-gray-500 mb-8 text-sm">
                {lockModalMessage.text}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowLockModal(false)}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-6 py-2.5 bg-[#115B4C] text-white font-bold rounded-lg hover:bg-[#115B4C]/90 transition-colors"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleProjectCreated}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  );
}
