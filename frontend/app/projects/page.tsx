'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CreateProjectWizard from '@/components/projects/CreateProjectWizard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Project {
  _id: string;
  projectId: string;
  name: string;
  status: 'active' | 'inactive';
  vertical?: string;
  createdAt: string;
  accountId: string;
}

interface Account {
  plan: string;
  billingCycle: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [accountData, setAccountData] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetchProjectsAndAccount();
  }, []);

  useEffect(() => {
    if (searchParams.get('setup') === '1') {
      setWizardOpen(true);
    }
  }, [searchParams]);

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

      const projectRes = await fetch(`${API_URL}/projects`, { headers });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProjects(projectData.data || []);
      }

      const accountRes = await fetch(`${API_URL}/account`, { headers });
      if (accountRes.ok) {
        const accountJson = await accountRes.json();
        setAccountData(accountJson.data || null);
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

  const handleViewProject = (project: Project) => {
    if (project.vertical === 'healthcare') {
      router.push(`/projects/${project.projectId}/healthcare`);
      return;
    }
    if (project.vertical === 'pathology') {
      router.push(`/projects/${project.projectId}/pathology`);
      return;
    }
    router.push(`/projects/${project.projectId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const verticalLabel = (v?: string) => {
    if (v === 'healthcare') return 'Healthcare';
    if (v === 'pathology') return 'Pathology';
    if (v === 'ecommerce') return 'E-commerce';
    return 'WhatsApp';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 mt-2 text-lg">Manage and access your WhatsApp Business projects</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-green-50 rounded-xl border border-teal-200 p-8 mb-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Create New Project</h2>
              <p className="text-gray-700 mb-8 leading-relaxed text-base">
                Pick a vertical preset — healthcare clinics get patients, appointments, billing, and
                WhatsApp automations out of the box.
              </p>
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="px-8 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Start setup wizard
              </button>
            </div>
            <div className="hidden lg:flex justify-end">
              <div className="text-center">
                <div className="text-7xl mb-4">🚀</div>
                <p className="text-gray-600 font-medium">Healthcare, e-commerce, or general WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {projects.length > 0 ? 'Your Projects' : 'No Projects Yet'}
          </h2>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                    <p className="text-xs text-gray-500 mt-2">Created {formatDate(project.createdAt)}</p>
                  </div>

                  <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Project ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900 break-all">{project.projectId}</p>
                  </div>

                  <div className="flex gap-2 mb-5 flex-wrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${
                        project.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {project.status === 'active' ? '✓ Active' : '○ Inactive'}
                    </span>
                    {project.vertical && (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border bg-teal-50 text-teal-800 border-teal-200">
                        {verticalLabel(project.vertical)}
                      </span>
                    )}
                    {accountData && (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border bg-green-100 text-green-700 border-green-300">
                        {accountData.plan === 'free' ? 'FREE PLAN' : accountData.plan.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewProject(project)}
                    className="w-full px-4 py-3 border-2 border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 group"
                  >
                    View
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
              <p className="text-gray-600 text-xl font-semibold mb-3">No projects created yet</p>
              <p className="text-gray-500 mb-6">
                Use the setup wizard to create a healthcare clinic or WhatsApp business project.
              </p>
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700"
              >
                <Plus className="w-5 h-5" />
                Create first project
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleProjectCreated}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  );
}
