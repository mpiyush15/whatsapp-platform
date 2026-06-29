'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Plus, ArrowRight, LogOut, LayoutDashboard, MessageSquare, 
  Settings, Megaphone, CheckCircle2, Globe, Smartphone, 
  MessageCircle, Activity, Building2, Stethoscope, 
  GraduationCap, Scissors, FlaskConical, Briefcase, 
  Users, Bot, Link as LinkIcon, Lock, Mail, PhoneCall, Trash2,
  User, CreditCard
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
  const [sessionTime, setSessionTime] = useState<string>('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockModalMessage, setLockModalMessage] = useState({ title: 'Feature Locked', text: 'You need an active professional plan to use this feature.' });
  const user = authService.getCurrentUser();
  const isInternalAccount = user?.email === 'pixelsadvertise@gmail.com';

  const currentPlan = subscription?.planName || 'free';
  const hasNoPlan = false; // TEMPORARILY UNLOCKED: !subscription && !isInternalAccount;
  const isFreePlan = false; // TEMPORARILY UNLOCKED: hasNoPlan;

  useEffect(() => {
    fetchProjectsAndAccount();
  }, []);

  useEffect(() => {
    if (searchParams.get('setup') === '1' && !hasNoPlan) {
      setWizardOpen(true);
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

      // Fetch Account First to Determine Lock Status
      const accountRes = await fetch(`${API_URL}/account/me`, { headers });
      if (accountRes.ok) {
        const accountJson = await accountRes.json();
        // The backend wraps the response in data: { data: { ... } }
        const actualData = accountJson.data?.data ? accountJson.data.data : accountJson.data;
        setAccountData(actualData || null);
      }

      // Fetch active subscription for truthy plan status
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

        // Fetch stats for all projects
        const statsMap: Record<string, any> = {};
        await Promise.all(projs.map(async (p: Project) => {
          try {
            const statRes = await fetch(`${API_URL}/projects/${p.projectId}/stats`, { headers });
            if (statRes.ok) {
              const statData = await statRes.json();
              statsMap[p.projectId] = statData.data;
            }
          } catch (e) {}
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
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
    <div className="min-h-screen bg-gray-50/50">
      <GlobalHeader />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          
          {/* Left Column - Core Actions & Workspaces */}
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={containerVariants} 
            className="space-y-8"
          >
            
            {/* Create Workspace Hero */}
            <motion.div variants={itemVariants} className="bg-stone-50 border border-stone-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
              <h2 className="text-3xl font-bold text-stone-900 mb-3">Create Your Business Workspace</h2>
              <p className="text-stone-500 mb-8 max-w-xl text-sm leading-relaxed">
                Create a dedicated communication workspace for your business. Connect WhatsApp, 
                automate conversations, and manage customer engagement from one place.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => handleCreateClick('healthcare')} className="bg-white hover:bg-stone-100 border border-stone-200 shadow-sm rounded-xl p-4 text-left transition-all group relative">
                  <div className="bg-stone-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1 flex items-center justify-between">Healthcare {isFreePlan && <Lock className="w-3 h-3 text-gray-400" />}</h3>
                  <p className="text-[10px] text-stone-500">Patients • Appointments</p>
                </button>
                
                <button onClick={() => handleCreateClick('education')} className="bg-white hover:bg-stone-100 border border-stone-200 shadow-sm rounded-xl p-4 text-left transition-all group relative">
                  <div className="bg-stone-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1 flex items-center justify-between">Education {isFreePlan && <Lock className="w-3 h-3 text-gray-400" />}</h3>
                  <p className="text-[10px] text-stone-500">Admissions • Students</p>
                </button>
                
                <button onClick={() => handleCreateClick('salon')} className="bg-white hover:bg-stone-100 border border-stone-200 shadow-sm rounded-xl p-4 text-left transition-all group relative">
                  <div className="bg-stone-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Scissors className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1 flex items-center justify-between">Salon & Spa {isFreePlan && <Lock className="w-3 h-3 text-gray-400" />}</h3>
                  <p className="text-[10px] text-stone-500">Bookings • Offers</p>
                </button>
                
                <button onClick={() => handleCreateClick('general')} className="bg-white hover:bg-stone-100 border border-stone-200 shadow-sm rounded-xl p-4 text-left transition-all group">
                  <div className="bg-stone-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1">General</h3>
                  <p className="text-[10px] text-stone-500">Custom Setup</p>
                </button>
              </div>
            </motion.div>

            {/* Workspaces List */}
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
                      <div className="flex gap-2">
                        <Skeleton className="h-10 w-24 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : projects.length > 0 ? (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="space-y-6"
                >
                  <AnimatePresence>
                    {projects.map((project) => {
                      const stats = projectStats[project.projectId] || {};
                      return (
                        <motion.div 
                          key={project._id}
                          layout
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative ${hasNoPlan ? 'opacity-80' : ''}`}
                        >
                        {hasNoPlan && (
                          <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl border-2 border-transparent">
                            <button onClick={() => setShowLockModal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 shadow-lg">
                              <Lock className="w-4 h-4" /> Unlock Workspace
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                              {getVerticalIcon(project.vertical)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{project.name}</h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1 font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-xs border border-teal-100">
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
                          
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-3">
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.projectId);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Workspace"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              
                              {/* Toggle Switch */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProjectStatus(project.projectId, project.status || 'active');
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shadow-inner ${
                                  (project.status || 'active') === 'active' ? 'bg-teal-500' : 'bg-gray-300'
                                }`}
                                title="Toggle Workspace Status"
                              >
                                <span
                                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                                    (project.status || 'active') === 'active' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              (project.status || 'active') === 'active' ? 'text-teal-600 bg-teal-50' : 'text-gray-500 bg-gray-100'
                            }`}>
                              {(project.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                          
                          {/* Realtime Stats */}
                          <div className="flex gap-6 sm:text-right bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Contacts</p>
                              <p className="text-lg font-bold text-gray-900">{stats.totalContacts || 0}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Messages</p>
                              <p className="text-lg font-bold text-gray-900">{stats.totalMessages || 0}</p>
                            </div>
                          </div>

                        {/* Setup Progress */}
                        <div className="mb-6">
                          <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Setup Progress</p>
                            <span className="text-xs font-bold text-teal-600">80%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                            <div className="bg-teal-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                          </div>
                          <div className="flex gap-4 text-xs font-medium text-gray-500 overflow-x-auto pb-2 scrollbar-hide">
                            <span className="flex items-center gap-1.5 text-teal-700 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Business</span>
                            <span className="flex items-center gap-1.5 text-teal-700 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp</span>
                            <span className="flex items-center gap-1.5 text-teal-700 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Templates</span>
                            <span className="flex items-center gap-1.5 text-teal-700 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Widget</span>
                            <span className="flex items-center gap-1.5 text-gray-400 shrink-0"><div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300"></div> Chatbot</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                          <button onClick={() => handleViewProject(project, 'dashboard')} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </button>
                          <button onClick={() => handleViewProject(project, 'inbox')} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Inbox
                          </button>
                          <button onClick={() => handleViewProject(project, 'templates')} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4" /> Templates
                          </button>
                          <button onClick={() => handleViewProject(project, 'broadcast')} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            <Megaphone className="w-4 h-4" /> Broadcast
                          </button>
                          <button onClick={() => handleViewProject(project, 'settings')} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ml-auto">
                            <Settings className="w-4 h-4" /> Settings
                          </button>
                          <button onClick={() => handleDeleteProject(project.projectId)} className="px-3 py-2 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 text-gray-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Workspaces Created</h3>
                  <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">
                    Create your first business workspace to connect WhatsApp and start automating your customer communication.
                  </p>
                  <button onClick={() => handleCreateClick('general')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors">
                    {hasNoPlan ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {hasNoPlan ? 'Unlock to Create Workspace' : 'Create First Workspace'}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Context & Guidance */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-6"
          >
            
            {/* Top Business Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-blue-50 rounded-bl-full -z-10 opacity-50"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">
                  {authService.getCurrentUser()?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">👋 Welcome, {authService.getCurrentUser()?.name?.split(' ')[0] || 'User'}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Workspaces</p>
                  <p className="text-lg font-bold text-gray-900">{projects.length} <span className="text-sm text-gray-400 font-medium">/ {subscription ? '5' : '1'}</span></p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Smartphone className="w-3 h-3" /> WA Numbers</p>
                  <p className="text-lg font-bold text-gray-900">{projects.filter(p => !!p.whatsappPhoneNumberId).length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><MessageCircle className="w-3 h-3" /> Messages</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Object.values(projectStats).reduce((sum, stat: any) => sum + (stat.totalMessages || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="w-3 h-3" /> Team</p>
                  <p className="text-lg font-bold text-gray-900">1</p>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Account Management</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => router.push('/projects/account')} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-teal-100 hover:bg-teal-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      <User className="w-4 h-4 text-gray-500 group-hover:text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">Account Settings</p>
                      <p className="text-xs text-gray-500">Manage profile & preferences</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 transition-colors" />
                </button>

                <button 
                  onClick={() => router.push('/projects/billing')} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-teal-100 hover:bg-teal-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      <CreditCard className="w-4 h-4 text-gray-500 group-hover:text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">Billing & Subscriptions</p>
                      <p className="text-xs text-gray-500">Manage plans & payments</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Omnichannel Graphic */}
            <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-6 text-white text-center">
              <h3 className="font-bold mb-6 text-sm text-gray-300">Your Communication Workspace</h3>
              <div className="flex justify-center items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Globe className="w-5 h-5" /></div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Smartphone className="w-5 h-5" /></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-gradient-to-b from-gray-600 to-teal-500"></div>
                <div className="bg-teal-500 text-white font-bold text-sm px-4 py-1.5 rounded-full my-2 shadow-[0_0_15px_rgba(20,184,166,0.3)]">ReplySys</div>
                <div className="w-px h-6 bg-gradient-to-b from-teal-500 to-gray-600"></div>
              </div>
              <p className="text-sm text-gray-400 mt-4 font-medium">All customer communication unified in one intelligent platform.</p>
            </div>



          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-8 flex items-center justify-center gap-6 text-sm text-gray-500 border-t border-gray-200/60 pt-6 mt-4">
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
                  className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors"
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
