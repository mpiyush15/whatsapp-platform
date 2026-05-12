"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Bot, Plus, Play, Pause, Edit, Trash2, X, Search, MessageSquare, Zap, List, Users, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import { LeadStatus } from "@/lib/enums"
import { authService } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

const getHeaders = () => {
  const token = authService.getToken()
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  }
}

interface ReplyOption {
  id: string;
  type: 'text' | 'buttons' | 'list' | 'question' | 'condition' | 'calendar' | 'form';
  text?: string;
  buttons?: Array<{ 
    id: string; 
    title: string; 
    url?: string;
    nextStepId?: string; // For conditional branching
  }>;
  listItems?: Array<{ 
    id: string; 
    title: string; 
    description?: string;
    nextStepId?: string; // For conditional branching
  }>;
  delay?: number;
  saveAs?: string; // Variable name to save response
  waitForResponse?: boolean; // Whether to wait for user response
  condition?: {
    variable: string;
    branches: Array<{ value: string; nextStepId: string; }>;
    defaultNextStepId?: string;
  };
  calendarConfig?: {
    enabled: boolean;
    availableDays: string[];
    timeSlots: string[];
    duration: number;
  };
}

interface ReplyContent {
  text?: string;
  templateName?: string;
  templateParams?: string[];
  workflow?: ReplyOption[];
}

interface Chatbot {
  _id: string;
  name: string;
  description?: string;
  keywords: string[];
  matchType: 'exact' | 'contains' | 'starts_with';
  replyType: 'text' | 'template' | 'workflow';
  replyContent: ReplyContent;
  isActive: boolean;
  phoneNumberId?: string;
  triggerCount: number;
  successRate: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotStats {
  totalBots: number;
  activeBots: number;
  totalInteractions: number;
  avgSuccessRate: number;
  automationRate: number;
}

export default function ChatbotPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [bots, setBots] = useState<Chatbot[]>([]);
  const [stats, setStats] = useState<ChatbotStats>({
    totalBots: 0,
    activeBots: 0,
    totalInteractions: 0,
    avgSuccessRate: 0,
    automationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBot, setEditingBot] = useState<Chatbot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    matchType: 'contains',
    replyType: 'text',
    replyText: '',
    templateName: '',
    workflow: [] as ReplyOption[],
    timeoutMinutes: 1
  });

  // Workflow state
  const [currentWorkflowItem, setCurrentWorkflowItem] = useState<ReplyOption>({
    id: Date.now().toString(),
    type: 'text',
    text: '',
    buttons: [],
    listItems: [],
    delay: 0,
    saveAs: '',
    waitForResponse: false
  });
  const [newButtonTitle, setNewButtonTitle] = useState('');
  const [newButtonUrl, setNewButtonUrl] = useState('');
  const [newListItem, setNewListItem] = useState({ title: '', description: '' });

  // Leads state
  const [showLeadsDrawer, setShowLeadsDrawer] = useState(false);
  const [selectedBotForLeads, setSelectedBotForLeads] = useState<Chatbot | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    fetchBots();
  }, [projectId]);

  const fetchBots = async () => {
    try {
      const token = authService.getToken();
      console.log('🔑 Token available:', !!token);
      
      const headers = getHeaders();
      
      const response = await fetch(`${API_URL}/chatbots?projectId=${projectId}`, {
        headers: getHeaders()
      });
      
      console.log('📡 Fetch response status:', response.status);
      
      if (response.status === 401) {
        console.error('❌ Authentication failed - Token missing or expired');
        alert('Authentication failed. Please login again.');
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched bots:', data.bots?.length || 0);
        console.log('✅ Fetched stats:', data.stats);
        setBots(data.bots || []);
        setStats(data.stats || stats);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch bots:', response.status, errorData);
        alert(`Failed to fetch chatbots: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch chatbots:', error);
      alert('Failed to fetch chatbots: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
      
      if (!formData.name || keywords.length === 0) {
        alert('Please provide a name and at least one keyword');
        return;
      }

      // Validate reply content based on type
      if (formData.replyType === 'text' && !formData.replyText.trim()) {
        alert('Please provide a reply message');
        return;
      }

      if (formData.replyType === 'template' && !formData.templateName.trim()) {
        alert('Please provide a template name');
        return;
      }

      if (formData.replyType === 'workflow' && formData.workflow.length === 0) {
        alert('Please add at least one workflow step');
        return;
      }

      const replyContent: ReplyContent = formData.replyType === 'text' 
        ? { text: formData.replyText }
        : formData.replyType === 'workflow'
        ? { workflow: formData.workflow }
        : { templateName: formData.templateName };

      const payload = {
        name: formData.name,
        description: formData.description,
        keywords,
        matchType: formData.matchType,
        replyType: formData.replyType,
        replyContent,
        projectId
      };

      console.log('💾 Saving chatbot:', payload);
      console.log('📍 API URL:', API_URL);

      const url = editingBot 
        ? `${API_URL}/chatbots/${editingBot._id}?projectId=${projectId}`
        : `${API_URL}/chatbots?projectId=${projectId}`;
      
      console.log('📡 Request URL:', url);
      console.log('🔧 Method:', editingBot ? 'PUT' : 'POST');
      
      const method = editingBot ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        console.log('✅ Chatbot saved successfully');
        await fetchBots();
        closeModal();
      } else {
        console.error('❌ Save failed with status:', response.status);
        let errorMessage = 'Failed to save chatbot';
        try {
          const error = await response.json();
          console.error('❌ Save error:', error);
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          const textError = await response.text();
          console.error('❌ Response text:', textError);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Failed to save chatbot:', error);
      alert('Failed to save chatbot: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleBot = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/chatbots/${id}/toggle?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders()
      });

      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Failed to toggle chatbot:', error);
    }
  };

  const deleteBot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chatbot?')) return;

    try {
      const response = await fetch(`${API_URL}/chatbots/${id}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
    }
  };

  const fetchLeads = async (chatbotId: string) => {
    setLeadsLoading(true);
    try {
      const response = await fetch(`${API_URL}/chatbots/${chatbotId}/leads?projectId=${projectId}`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data || []);
      } else {
        console.error('Failed to fetch leads');
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLeadsLoading(false);
    }
  };

  const openLeadsDrawer = (bot: Chatbot) => {
    setSelectedBotForLeads(bot);
    setShowLeadsDrawer(true);
    fetchLeads(bot._id);
  };

  const convertLeadToClient = async (leadId: string, responses: any) => {
    if (!confirm('Convert this lead to a contact? You can then message them directly.')) return;

    try {
      const response = await fetch(`${API_URL}/chatbots/leads/${leadId}/convert?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ responses })
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Lead converted to contact successfully! You can now send them messages.');
        // Refresh leads list
        if (selectedBotForLeads) {
          await fetchLeads(selectedBotForLeads._id);
        }
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to convert lead'}`);
      }
    } catch (error) {
      console.error('Failed to convert lead:', error);
      alert('❌ Error converting lead');
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead?')) return;

    try {
      const response = await fetch(`${API_URL}/chatbots/leads/${leadId}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (response.ok) {
        // Refresh leads list
        if (selectedBotForLeads) {
          await fetchLeads(selectedBotForLeads._id);
        }
      } else {
        console.error('Failed to delete lead');
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const openCreateModal = () => {
    setEditingBot(null);
    setFormData({
      name: '',
      description: '',
      keywords: '',
      matchType: 'contains',
      replyType: 'text',
      replyText: '',
      templateName: '',
      workflow: [],
      timeoutMinutes: 1
    });
    setCurrentWorkflowItem({
      id: Date.now().toString(),
      type: 'text',
      text: '',
      buttons: [],
      listItems: [],
      delay: 0
    });
    setNewButtonTitle('');
    setNewButtonUrl('');
    setShowModal(true);
  };

  const openEditModal = (bot: Chatbot) => {
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      description: bot.description || '',
      keywords: bot.keywords.join(', '),
      matchType: bot.matchType,
      replyType: bot.replyType,
      replyText: bot.replyContent.text || '',
      templateName: bot.replyContent.templateName || '',
      workflow: bot.replyContent.workflow || [],
      timeoutMinutes: 1
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBot(null);
  };

  const getStatusText = (bot: Chatbot) => {
    if (bot.isActive) return 'Active';
    if (bot.triggerCount === 0) return 'Draft';
    return 'Paused';
  };

  const getLastActiveText = (bot: Chatbot) => {
    if (!bot.lastTriggeredAt) return '-';
    const diff = Date.now() - new Date(bot.lastTriggeredAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const filteredBots = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chatbots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chatbot</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Build and manage your AI chatbots</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/flow`}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs sm:text-sm font-medium text-violet-700 hover:bg-violet-100 transition"
          >
            <GitBranch className="h-4 w-4" />
            Visual Flow Builder
          </Link>
          <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4 py-2">
            <Plus className="h-4 w-4 mr-2" />
            Create Bot
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Bots</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalBots}</p>
          <p className="text-[10px] sm:text-xs text-green-600 mt-1">{stats.activeBots} active</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Interactions</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalInteractions.toLocaleString()}</p>
          <p className="text-[10px] sm:text-xs text-gray-600 mt-1">all time</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Avg Success Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.avgSuccessRate.toFixed(1)}%</p>
          <p className="text-[10px] sm:text-xs text-gray-600 mt-1">across all bots</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Automation Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.automationRate.toFixed(1)}%</p>
          <p className="text-[10px] sm:text-xs text-gray-600 mt-1">of conversations</p>
        </div>
      </div>

      {/* Search - Mobile Optimized */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search bots by name or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Bots Grid */}
      {filteredBots.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-12 text-center">
          <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No chatbots yet</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">Create your first chatbot to automate conversations</p>
          <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Bot
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredBots.map((bot) => (
            <div key={bot._id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{bot.name}</h3>
                    <span className={`inline-flex px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full mt-1 ${
                      bot.isActive
                        ? "bg-green-100 text-green-700"
                        : bot.triggerCount === 0
                        ? "bg-gray-100 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {getStatusText(bot)}
                    </span>
                  </div>
                </div>
              </div>

              {bot.description && (
                <p className="text-xs sm:text-sm text-gray-600 mb-3 truncate">{bot.description}</p>
              )}

              <div className="mb-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Keywords:</p>
                <div className="flex flex-wrap gap-1">
                  {bot.keywords.slice(0, 5).map((keyword, idx) => (
                    <span key={idx} className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-[10px] sm:text-xs rounded-full">
                      {keyword}
                    </span>
                  ))}
                  {bot.keywords.length > 5 && (
                    <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 text-[10px] sm:text-xs rounded-full">
                      +{bot.keywords.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Reply Type:</p>
                <div className="flex items-center gap-2">
                  {bot.replyType === 'workflow' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Workflow ({bot.replyContent.workflow?.length || 0} steps)
                    </span>
                  ) : bot.replyType === 'template' ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Template
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Text
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Interactions</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{bot.triggerCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Success Rate</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {bot.successRate > 0 ? `${bot.successRate}%` : '-'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-3">
                <p className="text-xs sm:text-sm text-gray-600">Last active: {getLastActiveText(bot)}</p>
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  <Button 
                    onClick={() => openLeadsDrawer(bot)}
                    variant="outline" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm px-2 sm:px-3 py-1"
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Leads</span>
                  </Button>
                  <Button 
                    onClick={() => toggleBot(bot._id)}
                    variant="outline" 
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                  >
                    {bot.isActive ? (
                      <>
                        <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Start</span>
                      </>
                    )}
                  </Button>
                  {bot.replyType === 'workflow' && (bot.replyContent as any)?.flowGraph && (
                    <Link
                      href={`/projects/${projectId}/flow`}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-violet-700 hover:bg-violet-100 transition"
                    >
                      <GitBranch className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Builder</span>
                    </Link>
                  )}
                  <Button 
                    onClick={() => openEditModal(bot)}
                    variant="outline" 
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button 
                    onClick={() => deleteBot(bot._id)}
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBot ? 'Edit Chatbot' : 'Create New Chatbot'}
              </h2>
              <button onClick={closeModal} className="text-gray-600 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Bot"
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this bot do?"
                  rows={2}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords * (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g., hello, hi, hey, support, help"
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These keywords will trigger the bot response
                </p>
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match Type
                </label>
                <select
                  value={formData.matchType}
                  onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="contains">Contains (most flexible)</option>
                  <option value="exact">Exact match</option>
                  <option value="starts_with">Starts with</option>
                </select>
              </div>

              {/* Reply Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reply Type
                </label>
                <select
                  value={formData.replyType}
                  onChange={(e) => setFormData({ ...formData, replyType: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="text">Text Message</option>
                  <option value="workflow">Workflow (Interactive)</option>
                  <option value="template">WhatsApp Template</option>
                </select>
              </div>

              {/* Reply Content */}
              {formData.replyType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reply Message *
                  </label>
                  <textarea
                    value={formData.replyText}
                    onChange={(e) => setFormData({ ...formData, replyText: e.target.value })}
                    placeholder="The message to send when keywords match..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
              ) : formData.replyType === 'workflow' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Workflow Builder
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Response Timeout:</label>
                      <select
                        value={formData.timeoutMinutes}
                        onChange={(e) => setFormData({ ...formData, timeoutMinutes: parseInt(e.target.value) })}
                        className="px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500"
                      >
                        <option value={1}>1 minute</option>
                        <option value={2}>2 minutes</option>
                        <option value={3}>3 minutes</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <p className="text-blue-800">
                      ⏰ <strong>Auto-timeout:</strong> If user doesn't reply within <strong>{formData.timeoutMinutes} minute{formData.timeoutMinutes > 1 ? 's' : ''}</strong>, 
                      bot will send a thank you message and save partial data.
                    </p>
                  </div>
                  
                  {/* Current Workflow Item */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900">Add Response Step</span>
                    </div>

                    {/* Item Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Response Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentWorkflowItem({ ...currentWorkflowItem, type: 'text' })}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            currentWorkflowItem.type === 'text' 
                              ? 'bg-green-50 border-green-500 text-green-700' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          <MessageSquare className="h-4 w-4 mx-auto mb-1" />
                          <span className="text-xs">Text</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentWorkflowItem({ ...currentWorkflowItem, type: 'buttons' })}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            currentWorkflowItem.type === 'buttons' 
                              ? 'bg-green-50 border-green-500 text-green-700' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          <Zap className="h-4 w-4 mx-auto mb-1" />
                          <span className="text-xs">Buttons</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentWorkflowItem({ ...currentWorkflowItem, type: 'list' })}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            currentWorkflowItem.type === 'list' 
                              ? 'bg-green-50 border-green-500 text-green-700' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          <List className="h-4 w-4 mx-auto mb-1" />
                          <span className="text-xs">List</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Message Text
                      </label>
                      <textarea
                        value={currentWorkflowItem.text || ''}
                        onChange={(e) => setCurrentWorkflowItem({ ...currentWorkflowItem, text: e.target.value })}
                        placeholder="Enter the message text..."
                        rows={3}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Buttons Section */}
                    {currentWorkflowItem.type === 'buttons' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Buttons (max 3)
                        </label>
                        <div className="space-y-2">
                          {currentWorkflowItem.buttons?.map((btn) => (
                            <div key={btn.id} className="bg-white px-3 py-2 rounded border border-gray-300">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="flex-1 text-sm font-medium text-gray-900">{btn.title}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentWorkflowItem({
                                      ...currentWorkflowItem,
                                      buttons: currentWorkflowItem.buttons?.filter(b => b.id !== btn.id)
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              {btn.url && (
                                <div className="flex items-start gap-1">
                                  <span className="text-xs text-green-700">🌐 Opens:</span>
                                  <a 
                                    href={btn.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline truncate flex-1"
                                  >
                                    {btn.url}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                          {(!currentWorkflowItem.buttons || currentWorkflowItem.buttons.length < 3) && (
                            <div className="space-y-3">
                              {/* WhatsApp Button Limitation Warning */}
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-1">
                                  💡 How URL Buttons Work:
                                </p>
                                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                                  <li>Create up to <strong>3 reply buttons</strong> with different URLs</li>
                                  <li>When user clicks → Bot sends <strong>clickable link</strong></li>
                                  <li>User taps link → <strong>Opens in browser</strong> directly</li>
                                  <li>Each button can have its own unique URL!</li>
                                </ul>
                              </div>

                              <input
                                type="text"
                                value={newButtonTitle}
                                onChange={(e) => setNewButtonTitle(e.target.value)}
                                placeholder="Button text (e.g., Visit Website, Get Support)"
                                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400"
                              />
                              <div className="space-y-1">
                                <input
                                  type="url"
                                  value={newButtonUrl}
                                  onChange={(e) => setNewButtonUrl(e.target.value)}
                                  placeholder="🔗 Add URL to send when clicked (e.g., https://mysite.com)"
                                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  💡 When user clicks this button, the URL will be sent as a clickable link
                                </p>
                              </div>
                              
                              <Button
                                type="button"
                                onClick={() => {
                                  if (newButtonTitle.trim()) {
                                    setCurrentWorkflowItem({
                                      ...currentWorkflowItem,
                                      buttons: [
                                        ...(currentWorkflowItem.buttons || []),
                                        { 
                                          id: Date.now().toString(), 
                                          title: newButtonTitle.trim(),
                                          url: newButtonUrl.trim() || undefined
                                        }
                                      ]
                                    });
                                    setNewButtonTitle('');
                                    setNewButtonUrl('');
                                  }
                                }}
                                size="sm"
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Button
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* List Items Section */}
                    {currentWorkflowItem.type === 'list' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          List Items (max 10)
                        </label>
                        <div className="space-y-2">
                          {currentWorkflowItem.listItems?.map((item) => (
                            <div key={item.id} className="bg-white px-3 py-2 rounded border">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.title}</div>
                                  {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentWorkflowItem({
                                      ...currentWorkflowItem,
                                      listItems: currentWorkflowItem.listItems?.filter(i => i.id !== item.id)
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(!currentWorkflowItem.listItems || currentWorkflowItem.listItems.length < 10) && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={newListItem.title}
                                onChange={(e) => setNewListItem({ ...newListItem, title: e.target.value })}
                                placeholder="List item title"
                                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400"
                              />
                              <input
                                type="text"
                                value={newListItem.description}
                                onChange={(e) => setNewListItem({ ...newListItem, description: e.target.value })}
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400"
                              />
                              <Button
                                type="button"
                                onClick={() => {
                                  if (newListItem.title.trim()) {
                                    setCurrentWorkflowItem({
                                      ...currentWorkflowItem,
                                      listItems: [
                                        ...(currentWorkflowItem.listItems || []),
                                        { 
                                          id: Date.now().toString(), 
                                          title: newListItem.title.trim(),
                                          description: newListItem.description.trim() || undefined
                                        }
                                      ]
                                    });
                                    setNewListItem({ title: '', description: '' });
                                  }
                                }}
                                size="sm"
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add List Item
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delay */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Delay (seconds)
                      </label>
                      <input
                        type="number"
                        value={currentWorkflowItem.delay || 0}
                        onChange={(e) => setCurrentWorkflowItem({ ...currentWorkflowItem, delay: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="30"
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Wait for Response */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="waitForResponse"
                        checked={currentWorkflowItem.waitForResponse || false}
                        onChange={(e) => setCurrentWorkflowItem({ 
                          ...currentWorkflowItem, 
                          waitForResponse: e.target.checked,
                          type: e.target.checked ? 'question' : 'text'
                        })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="waitForResponse" className="flex-1 cursor-pointer">
                        <span className="text-sm font-medium text-gray-900">Wait for user response</span>
                        <p className="text-xs text-gray-600 mt-1">Bot will pause and wait for the user to reply before continuing</p>
                      </label>
                    </div>

                    {/* Save Response As */}
                    {currentWorkflowItem.waitForResponse && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Save Response As (Variable Name)
                        </label>
                        <input
                          type="text"
                          value={currentWorkflowItem.saveAs || ''}
                          onChange={(e) => setCurrentWorkflowItem({ ...currentWorkflowItem, saveAs: e.target.value })}
                          placeholder="e.g., name, email, phone, etc."
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-1">💡 This will save the user's response for later use</p>
                      </div>
                    )}

                    {/* Add to Workflow */}
                    <Button
                      type="button"
                      onClick={() => {
                        if (currentWorkflowItem.text?.trim()) {
                          setFormData({
                            ...formData,
                            workflow: [...formData.workflow, currentWorkflowItem]
                          });
                          setCurrentWorkflowItem({
                            id: Date.now().toString(),
                            type: 'text',
                            text: '',
                            buttons: [],
                            listItems: [],
                            delay: 0,
                            saveAs: '',
                            waitForResponse: false
                          });
                          setNewButtonTitle('');
                          setNewButtonUrl('');
                          setNewListItem({ title: '', description: '' });
                        }
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step to Workflow
                    </Button>
                  </div>

                  {/* Workflow Steps List */}
                  {formData.workflow.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Workflow Steps ({formData.workflow.length})
                      </label>
                      {formData.workflow.map((item, index) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {item.type === 'text' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                                {item.type === 'question' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                                {item.type === 'buttons' && <Zap className="h-4 w-4 text-green-600" />}
                                {item.type === 'list' && <List className="h-4 w-4 text-blue-600" />}
                                <span className="text-xs font-medium text-gray-600 uppercase">{item.type}</span>
                                {item.delay && item.delay > 0 && (
                                  <span className="text-xs text-gray-500">• {item.delay}s delay</span>
                                )}
                                {item.waitForResponse && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    ⏳ Waits
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 line-clamp-2">{item.text}</p>
                              {item.saveAs && (
                                <div className="mt-1">
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                    💾 Saves as: {item.saveAs}
                                  </span>
                                </div>
                              )}
                              {item.buttons && item.buttons.length > 0 && (
                                <div className="space-y-1 mt-2">
                                  {item.buttons.map(btn => (
                                    <div key={btn.id} className="flex items-center gap-2">
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                        {btn.title}
                                      </span>
                                      {btn.url && (
                                        <span className="text-xs text-blue-600 truncate">
                                          → {btn.url}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.listItems && item.listItems.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {item.listItems.length} list items
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  workflow: formData.workflow.filter((_, i) => i !== index)
                                });
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    placeholder="e.g., welcome_message"
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be an approved WhatsApp template
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <Button onClick={closeModal} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdate} className="bg-green-600 hover:bg-green-700">
                {editingBot ? 'Update Bot' : 'Create Bot'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Drawer */}
      {showLeadsDrawer && selectedBotForLeads && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-md" onClick={() => setShowLeadsDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Leads - {selectedBotForLeads.name}
              </h2>
              <button
                onClick={() => setShowLeadsDrawer(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {leadsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="mt-2 text-gray-600">Loading leads...</p>
                  </div>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No leads yet</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Phone</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Responses</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead: any) => (
                        <tr key={lead._id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{lead.customerPhone}</td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="text-sm space-y-1 max-w-xs">
                              {lead.responses && Object.entries(lead.responses).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-medium text-gray-600">{key}:</span>
                                  <span className="text-gray-800">{String(value)}</span>
                                </div>
                              ))}
                              {(!lead.responses || Object.keys(lead.responses).length === 0) && (
                                <span className="text-gray-500 italic">No responses</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-800' :
                              lead.status === LeadStatus.CONTACTED ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === LeadStatus.CONVERTED ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {lead.status !== LeadStatus.CONVERTED && (
                                <button
                                  onClick={() => convertLeadToClient(lead._id, lead.responses)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap"
                                >
                                  Add Contact
                                </button>
                              )}
                              <button
                                onClick={() => deleteLead(lead._id)}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
