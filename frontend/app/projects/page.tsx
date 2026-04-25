'use client';

import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Project {
  _id: string;
  projectId: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  accountId: string;
}

interface Account {
  plan: string;
  billingCycle: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [accountData, setAccountData] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjectsAndAccount();
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

  const fetchProjectsAndAccount = async () => {
    try {
      setIsLoading(true);
      const headers = getHeaders();
      
      // Fetch projects
      const projectRes = await fetch(`${API_URL}/projects`, { headers });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProjects(projectData.data || []);
      }

      // Fetch account data for plan info
      const accountRes = await fetch(`${API_URL}/account`, { headers });
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setAccountData(accountData.data || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      setIsCreating(true);
      const headers = getHeaders();
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newProjectName })
      });

      if (res.ok) {
        const data = await res.json();
        setProjects([...projects, data.data]);
        setNewProjectName('');
        alert('Project created successfully!');
      } else {
        alert('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 mt-2 text-lg">Manage and access your WhatsApp Business projects</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Create New Project Section */}
        <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-green-50 rounded-xl border border-teal-200 p-8 mb-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Create New Project</h2>
              <p className="text-gray-700 mb-8 leading-relaxed text-base">
                One Business Project is associated with one WhatsApp Business API Number
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                  placeholder="Enter your project name"
                  className="flex-1 px-5 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-teal-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="px-8 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  Create
                </button>
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:flex justify-end">
              <div className="text-center">
                <div className="text-7xl mb-4">🚀</div>
                <p className="text-gray-600 font-medium">Start your project journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {projects.length > 0 ? 'Your Projects' : 'No Projects Yet'}
          </h2>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project._id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                  {/* Project Header */}
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                    <p className="text-xs text-gray-500 mt-2">Created {formatDate(project.createdAt)}</p>
                  </div>

                  {/* Project ID */}
                  <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Project ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900 break-all">{project.projectId}</p>
                  </div>

                  {/* Status & Plan Badge */}
                  <div className="flex gap-2 mb-5 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${
                      project.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {project.status === 'active' ? '✓ Active' : '○ Inactive'}
                    </span>
                    {accountData && (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border bg-green-100 text-green-700 border-green-300">
                        {accountData.plan === 'free' ? 'FREE PLAN' : accountData.plan.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewProject(project.projectId)}
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
              <p className="text-gray-500">Create your first project above to get started with WhatsApp Business integration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
