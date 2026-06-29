'use client';

import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PROJECT_VERTICALS, VERTICAL_LABELS } from '@/lib/projectVerticals';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Project {
  _id: string;
  name: string;
  status: 'active' | 'inactive';
  planName: string;
  planType: 'free' | 'pro' | 'enterprise';
  phoneNumber?: string;
  businessId?: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
//  const [newProjectVertical, setNewProjectVertical] = useState(PROJECT_VERTICALS[0]);
const [newProjectVertical, setNewProjectVertical] = useState<string>(PROJECT_VERTICALS[0]);  
const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
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

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const headers = getHeaders();
      const res = await fetch(`${API_URL}/projects`, { headers });

      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
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
        body: JSON.stringify({ name: newProjectName, vertical: newProjectVertical })
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

  const getPlanBadgeColor = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'pro':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'enterprise':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getPlanName = (planType: string, planName?: string) => {
    if (planName === 'LIFETIME' || planName === 'FREE FOREVER') return 'FREE FOREVER';
    if (planName) return planName;

    switch (planType?.toLowerCase()) {
      case 'pro':
        return 'PRO PLAN';
      case 'enterprise':
        return 'ENTERPRISE PLAN';
      default:
        return 'FREE PLAN';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

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
                <select
                  value={newProjectVertical}
                  onChange={(e) => setNewProjectVertical(e.target.value)}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:border-teal-500 focus:outline-none transition-colors"
                >
                  {PROJECT_VERTICALS.map((vertical) => (
                    <option key={vertical} value={vertical}>
                      {VERTICAL_LABELS[vertical]}
                    </option>
                  ))}
                </select>
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
            {isLoading || projects.length > 0 ? 'Your Projects' : 'No Projects Yet'}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-content-in">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-3 h-3 w-28" />
                  <div className="mt-5 flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="my-6 space-y-4 border-b border-gray-200 pb-6">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project._id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                  {/* Project Header */}
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                    <p className="text-xs text-gray-500 mt-2">Created {formatDate(project.createdAt)}</p>
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
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${getPlanBadgeColor(project.planType)}`}>
                      {getPlanName(project.planType, project.planName)}
                    </span>
                  </div>

                  {/* Project Details Grid */}
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {project.status === 'active' ? 'Active plan' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Active Plan</p>
                      <p className="text-base font-bold text-teal-600">{getPlanName(project.planType, project.planName)}</p>
                    </div>
                    {project.phoneNumber && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Number</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">{project.phoneNumber}</p>
                      </div>
                    )}
                    {!project.phoneNumber && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Number</p>
                        <p className="text-sm text-gray-400">N/A</p>
                      </div>
                    )}
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewProject(project._id)}
                    className="w-full px-4 py-3 border-2 border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 group"
                  >
                    View
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-16 text-center animate-content-in">
              <p className="text-gray-600 text-xl font-semibold mb-3">No projects created yet</p>
              <p className="text-gray-500">Create your first project above to get started with WhatsApp Business integration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
