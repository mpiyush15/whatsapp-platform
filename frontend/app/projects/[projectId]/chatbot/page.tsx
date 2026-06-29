"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Bot, Plus, Play, Pause, Edit, Trash2, X, Search, MessageSquare, Zap, List, Users, GitBranch, GraduationCap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import { LeadStatus } from "@/lib/enums"
import { authService } from "@/lib/auth"

const MotionDiv = motion.div;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

const getHeaders = () => {
  const token = authService.getToken()
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  }
}

const normalizeVariableName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const inferVariableName = (text = "", fallback = "selection") => {
  const lower = text.toLowerCase()
  if (/\bcourse\b|\bexam\b|\bneet\b|\bjee\b|\bmhtcet\b/.test(lower)) return "course"
  if (/\bbranch\b|\blocation\b|\bcenter\b|\bcentre\b/.test(lower)) return "branch"
  if (/\bbatch\b|\bprogram\b|\bplan\b/.test(lower)) return "batch"
  return normalizeVariableName(fallback) || "selection"
}

interface ReplyOption {
  id: string;
  type: 'text' | 'buttons' | 'list' | 'question' | 'condition' | 'calendar' | 'form' | 'vertical_action';
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
  dynamicList?: string;
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
  vertical?: string;
  action?: string;
  actionConfig?: Record<string, string>;
}

interface EducationPreset {
  key: string;
  name: string;
  description: string;
  defaultFields: string[];
  availableFields: Array<{ key: string; label: string }>;
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
  const [educationPresets, setEducationPresets] = useState<EducationPreset[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState('education_enquiry');
  const [selectedPresetFields, setSelectedPresetFields] = useState<string[]>(['name', 'course', 'batch']);
  const [installingPreset, setInstallingPreset] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showHealthcarePresetModal, setShowHealthcarePresetModal] = useState(false);
  const [project, setProject] = useState<any>(null);

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
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [bulkConverting, setBulkConverting] = useState(false);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  };
  
  const toggleAllLeads = () => {
    const convertibleLeads = leads.filter(l => l.status !== LeadStatus.CONVERTED);
    if (selectedLeadIds.length === convertibleLeads.length && convertibleLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(convertibleLeads.map(l => l._id));
    }
  };

  const allResponseKeys = useMemo(() => {
    const keys = new Set<string>();
    leads.forEach(lead => {
      if (lead.responses) {
        Object.keys(lead.responses).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [leads]);

  useEffect(() => {
    fetchBots();
    fetchEducationPresets();
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setProject(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchEducationPresets = async () => {
    try {
      const query = new URLSearchParams({ projectId });
      const response = await fetch(`${API_URL}/chatbots/presets/education?${query.toString()}`, {
        headers: getHeaders()
      });
      const data = await response.json().catch(() => ({}));
      const presets = data?.data?.presets || data?.presets || [];
      setEducationPresets(presets);
      if (presets[0]) {
        setSelectedPresetKey(presets[0].key);
        setSelectedPresetFields(presets[0].defaultFields || []);
      }
    } catch (error) {
      console.error('Failed to fetch education presets:', error);
    }
  };

  const selectedPreset = educationPresets.find((preset) => preset.key === selectedPresetKey);

  const togglePresetField = (field: string) => {
    setSelectedPresetFields((prev) => {
      if (prev.includes(field)) return prev.filter((item) => item !== field);
      return [...prev, field];
    });
  };

  const installEducationPreset = async () => {
    if (!selectedPreset) return;
    if (selectedPresetFields.length === 0) {
      alert('Select at least one field for the education bot');
      return;
    }

    try {
      setInstallingPreset(true);
      const response = await fetch(`${API_URL}/chatbots/presets/education/install?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          projectId,
          preset: selectedPreset.key,
          fields: selectedPresetFields,
          isActive: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || 'Failed to install preset');
      }
      await fetchBots();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to install preset');
    } finally {
      setInstallingPreset(false);
    }
  };

  const installHealthcarePreset = async (type: string) => {
    try {
      setInstallingPreset(true);
      let graph, meta;
      if (type === 'registration') {
        const { buildHealthcareRegistrationGraph } = await import('@/components/flow-builder/healthcarePresets');
        graph = buildHealthcareRegistrationGraph();
        meta = { name: "Healthcare Registration", description: "Registers a new patient without leaking medical info.", keywords: ["register", "new patient", "start"], timeoutMinutes: 5 };
      } else if (type === 'slot_checker') {
        const { buildHealthcareSlotCheckerGraph } = await import('@/components/flow-builder/healthcarePresets');
        graph = buildHealthcareSlotCheckerGraph();
        meta = { name: "Healthcare Slot Checker", description: "Allows patients to check doctor slots without booking.", keywords: ["slots", "schedule", "availability"], timeoutMinutes: 5 };
      } else {
        const { buildHealthcareBookingGraph } = await import('@/components/flow-builder/healthcarePresets');
        graph = buildHealthcareBookingGraph();
        meta = { name: "Healthcare Appointment Booking", description: "End-to-end booking flow syncing securely to the database.", keywords: ["book", "appointment", "consultation"], timeoutMinutes: 10 };
      }

      const payload = {
        name: meta.name,
        description: meta.description,
        keywords: meta.keywords,
        matchType: "contains",
        replyType: "workflow",
        replyContent: { flowGraph: graph, workflow: [] },
        projectId
      };

      const response = await fetch(`${API_URL}/chatbots?projectId=${projectId}`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to install preset");
      await fetchBots();
      setShowHealthcarePresetModal(false);
      alert('✅ Healthcare preset installed successfully!');
    } catch (e) {
      alert("Failed to install healthcare preset");
    } finally {
      setInstallingPreset(false);
    }
  }

  const fetchBots = async () => {
    try {
      const token = authService.getToken();
      console.log('🔑 Token available:', !!token);
      
      const headers = getHeaders();
      
      const query = new URLSearchParams({ projectId });
      const response = await fetch(`${API_URL}/chatbots?${query.toString()}`, {
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
        alert('✅ Lead converted to contact successfully! You can now send them messages.');
        if (selectedBotForLeads) await fetchLeads(selectedBotForLeads._id);
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to convert lead'}`);
      }
    } catch (error) {
      alert('Failed to convert lead to contact.');
    }
  };

  const handleBulkConvert = async () => {
    try {
      setBulkConverting(true);
      const leadsToConvert = leads.filter(l => selectedLeadIds.includes(l._id));
      
      const promises = leadsToConvert.map(async (lead) => {
        const r = lead.responses || {};
        const payload = {
          projectId,
          phone: lead.customerPhone,
          name: r.NAME || r.name || r.Name || 'Unknown User',
          notes: r.NOTES || r.notes || r.Notes || '',
          source: 'Chatbot',
          status: 'new'
        };
        
        const res = await fetch(`${API_URL}/education/enquiries?projectId=${projectId}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          await fetch(`${API_URL}/chatbots/leads/${lead._id}/convert?projectId=${projectId}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ responses: r, syncedToEnquiry: true })
          }).catch(() => {});
        }
        return res;
      });

      await Promise.all(promises);
      alert('✅ Successfully converted selected leads to Education Enquiries!');
      setSelectedLeadIds([]);
      setShowBulkConvertModal(false);
      
      if (selectedBotForLeads) await fetchLeads(selectedBotForLeads._id);
    } catch (error) {
      alert('❌ Failed to convert some leads.');
    } finally {
      setBulkConverting(false);
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

  return (
    <>
      {loading ? (
        <MotionDiv 
          key="loading"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center h-screen"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading chatbots...</p>
          </div>
        </MotionDiv>
      ) : (
        <MotionDiv 
          key="content"
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="p-3 sm:p-6 space-y-4 sm:space-y-6"
        >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-900 tracking-tight">Chatbots</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Build, train, and deploy conversational agents</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(project?.vertical === "healthcare" || project?.businessCategory?.toLowerCase() === "healthcare") ? (
             <Button onClick={() => setShowHealthcarePresetModal(true)} variant="outline" className="border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 h-9 px-3 text-[13px] shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Install Preset
            </Button>
          ) : educationPresets.length > 0 && (
            <Button onClick={() => setShowPresetModal(true)} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 h-9 px-3 text-[13px] shadow-sm">
              <GraduationCap className="h-4 w-4 mr-1.5" />
              Install Preset
            </Button>
          )}
          <Link
            href={`/projects/${projectId}/flow`}
            className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 h-9 text-[13px] font-medium text-violet-700 hover:bg-violet-100 transition-colors shadow-sm"
          >
            <GitBranch className="h-4 w-4 mr-1.5" />
            Visual Flow Builder
          </Link>
          <Button onClick={openCreateModal} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-3 text-[13px] transition-all">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Bot
          </Button>
        </div>
      </div>

      {/* Stats Cards (Enquiries Style) */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Bots" value={stats.totalBots} />
        <StatCard label="Active Bots" value={stats.activeBots} tone="green" />
        <StatCard label="Total Interactions" value={stats.totalInteractions.toLocaleString()} tone="blue" />
        <StatCard label="Success Rate" value={`${stats.avgSuccessRate.toFixed(1)}%`} tone="violet" />
        <StatCard label="Automation Rate" value={`${stats.automationRate.toFixed(1)}%`} tone="amber" />
      </div>

      {/* Filter Bar (Enquiries Style) */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row">
          <input
            type="text"
            placeholder="Search chatbots by name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">

        {/* Bots Table */}
      {filteredBots.length === 0 ? (
        <div className="bg-slate-50/50 p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-slate-200/60">
              <Bot className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-[17px] font-semibold text-slate-900 mb-2">No chatbots active</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Build an intelligent conversational workflow to automate your interactions.</p>
            <Button onClick={openCreateModal} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all text-sm px-6 py-2.5 h-auto rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Create Chatbot
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-y border-slate-200 bg-slate-100/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bot</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Keywords</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reply</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Interactions</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Success</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Active</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredBots.map((bot) => (
                  <tr key={bot._id} className="hover:bg-slate-50 transition-colors group/row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 group-hover/row:bg-white group-hover/row:border-slate-300 transition-colors">
                          <Bot className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-[14px] font-semibold text-slate-900">{bot.name}</p>
                          <p className="max-w-56 truncate text-[12px] text-slate-500 mt-0.5">{bot.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                        bot.isActive
                          ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                          : bot.triggerCount === 0
                          ? "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20"
                          : "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${bot.isActive ? 'bg-green-500' : bot.triggerCount === 0 ? 'bg-gray-400' : 'bg-orange-500'}`}></span>
                        {getStatusText(bot)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex w-48 flex-wrap gap-1.5 overflow-hidden max-h-[50px]">
                        {bot.keywords.slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="rounded-md bg-slate-200/50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 truncate max-w-[80px]">
                            {keyword}
                          </span>
                        ))}
                        {bot.keywords.length > 3 && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                            +{bot.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {bot.replyType === 'workflow' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/10">
                          <Zap className="h-3 w-3" />
                          Workflow ({bot.replyContent.workflow?.length || 0})
                        </span>
                      ) : bot.replyType === 'template' ? (
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-600/10">
                          Template
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-600/10">
                          <MessageSquare className="h-3 w-3" />
                          Text
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] font-semibold text-slate-900">
                      {bot.triggerCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] text-slate-700">
                      {bot.successRate > 0 ? `${bot.successRate}%` : '-'}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-slate-500">{getLastActiveText(bot)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button onClick={() => openLeadsDrawer(bot)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full">
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => toggleBot(bot._id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full">
                          {bot.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        {bot.replyType === 'workflow' && (bot.replyContent as any)?.flowGraph && (
                          <Link
                            href={`/projects/${projectId}/flow`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                          >
                            <GitBranch className="h-4 w-4" />
                          </Link>
                        )}
                        <Button onClick={() => openEditModal(bot)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deleteBot(bot._id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                          onClick={() => setCurrentWorkflowItem({
                            ...currentWorkflowItem,
                            type: 'buttons',
                            waitForResponse: true,
                            saveAs: currentWorkflowItem.saveAs || inferVariableName(currentWorkflowItem.text, 'selection')
                          })}
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
                          onClick={() => setCurrentWorkflowItem({
                            ...currentWorkflowItem,
                            type: 'list',
                            waitForResponse: true,
                            saveAs: currentWorkflowItem.saveAs || inferVariableName(currentWorkflowItem.text, 'selection')
                          })}
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
                    {(currentWorkflowItem.waitForResponse || currentWorkflowItem.type === 'buttons' || currentWorkflowItem.type === 'list') && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Save Response As (Variable Name)
                        </label>
                        <input
                          type="text"
                          value={currentWorkflowItem.saveAs || ''}
                          onChange={(e) => setCurrentWorkflowItem({ ...currentWorkflowItem, saveAs: normalizeVariableName(e.target.value) })}
                          placeholder={currentWorkflowItem.type === 'list' || currentWorkflowItem.type === 'buttons' ? inferVariableName(currentWorkflowItem.text, 'selection') : 'name, email, phone'}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-1">Use it later like {'{{'}{currentWorkflowItem.saveAs || inferVariableName(currentWorkflowItem.text, 'selection')}{'}}'} in any next message.</p>
                      </div>
                    )}

                    {/* Add to Workflow */}
                    <Button
                      type="button"
                      onClick={() => {
                        if (currentWorkflowItem.text?.trim()) {
                          const nextWorkflowItem = {
                            ...currentWorkflowItem,
                            saveAs:
                              currentWorkflowItem.saveAs ||
                              (currentWorkflowItem.type === 'buttons' || currentWorkflowItem.type === 'list'
                                ? inferVariableName(currentWorkflowItem.text, 'selection')
                                : currentWorkflowItem.saveAs),
                          };
                          setFormData({
                            ...formData,
                            workflow: [...formData.workflow, nextWorkflowItem]
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

      {/* Preset Modal */}
      {showPresetModal && educationPresets.length > 0 && (
        <div className="fixed inset-0 backdrop-blur-sm bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-emerald-700" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Education Preset Flow</h2>
              </div>
              <button onClick={() => setShowPresetModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Select Flow Type</label>
                <select
                  value={selectedPresetKey}
                  onChange={(e) => {
                    const next = educationPresets.find((preset) => preset.key === e.target.value);
                    setSelectedPresetKey(e.target.value);
                    setSelectedPresetFields(next?.defaultFields || []);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                >
                  {educationPresets.map((preset) => (
                    <option key={preset.key} value={preset.key}>{preset.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Data Collection Fields</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPreset?.availableFields.map((field) => (
                    <label key={field.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPresetFields.includes(field.key)}
                        onChange={() => togglePresetField(field.key)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <Button onClick={() => setShowPresetModal(false)} variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  installEducationPreset();
                  setShowPresetModal(false);
                }}
                disabled={installingPreset || selectedPresetFields.length === 0}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {installingPreset ? 'Installing...' : 'Install Flow'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Healthcare Presets Modal */}
      {showHealthcarePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Install Healthcare Preset</h3>
                  <p className="text-sm text-slate-500">Choose a fully functional bot tailored for clinics.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowHealthcarePresetModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 bg-slate-50/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="rounded-xl border-2 border-teal-500 bg-teal-50 p-4 cursor-pointer hover:bg-teal-100 transition-colors relative"
                  onClick={() => installHealthcarePreset('booking')}
                >
                  <div className="absolute top-2 right-2 flex items-center justify-center h-5 w-5 bg-teal-500 text-white rounded-full">✓</div>
                  <h4 className="font-semibold text-teal-900">Full Booking</h4>
                  <p className="text-xs text-teal-700 mt-1">End-to-end booking flow syncing directly to the DB.</p>
                </div>
                <div 
                  className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => installHealthcarePreset('registration')}
                >
                  <h4 className="font-semibold text-slate-900">Registration</h4>
                  <p className="text-xs text-slate-500 mt-1">Registers a new patient securely without leaking info.</p>
                </div>
                <div 
                  className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => installHealthcarePreset('slot_checker')}
                >
                  <h4 className="font-semibold text-slate-900">Slot Checker</h4>
                  <p className="text-xs text-slate-500 mt-1">Allows patients to check available doctor slots.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        </MotionDiv>
      )}

      {/* Leads Modal (Dark Theme) */}
      <AnimatePresence>
        {showLeadsDrawer && selectedBotForLeads && (
          <MotionDiv 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-[9999] p-4 sm:p-6"
          >
            <div className="absolute inset-0" onClick={() => setShowLeadsDrawer(false)} />
            <MotionDiv 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="bg-slate-950 rounded-2xl max-w-6xl w-full max-h-[90vh] shadow-2xl overflow-hidden border border-slate-800 flex flex-col relative z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 ring-1 ring-indigo-500/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
                      {selectedBotForLeads.name} Responses
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[13px] text-slate-400 font-medium flex items-center gap-2">
                        Total Collected: <span className="inline-flex items-center justify-center bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full text-xs ring-1 ring-indigo-500/30">{leads.length}</span>
                      </p>
                      {selectedLeadIds.length > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <button 
                            onClick={() => setShowBulkConvertModal(true)}
                            className="text-[12px] font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded-full ring-1 ring-emerald-500/30 transition-colors shadow-sm"
                          >
                            Sync {selectedLeadIds.length} to Enquiries
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeadsDrawer(false)}
                  className="text-slate-500 hover:text-slate-300 p-2 rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950 p-0">
                {leadsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <p className="mt-3 text-sm font-medium text-slate-400">Loading responses...</p>
                    </div>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-3 ring-1 ring-slate-800">
                        <Users className="h-8 w-8 text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-300">No responses collected yet</p>
                      <p className="text-[13px] text-slate-500 mt-1">Users haven't interacted with this bot's flows.</p>
                    </div>
                  </div>
                ) : (
                  <MotionDiv 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full pb-4"
                  >
                    <table className="w-full text-left min-w-[1000px]">
                      <thead className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="px-6 py-4 w-12 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                            <input type="checkbox" 
                                   className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-slate-900 h-4 w-4"
                                   checked={leads.filter(l => l.status !== LeadStatus.CONVERTED).length > 0 && selectedLeadIds.length === leads.filter(l => l.status !== LeadStatus.CONVERTED).length}
                                   onChange={toggleAllLeads}
                            />
                          </th>
                          <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Phone</th>
                          {allResponseKeys.map(key => (
                            <th key={key} className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{key}</th>
                          ))}
                          <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                          <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                          <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {leads.map((lead: any) => (
                          <tr key={lead._id} className={`transition-colors ${selectedLeadIds.includes(lead._id) ? 'bg-indigo-500/5' : 'hover:bg-slate-900/50'}`}>
                            <td className="px-6 py-4 w-12">
                              <input type="checkbox" 
                                     className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-slate-900 h-4 w-4 disabled:opacity-30 disabled:cursor-not-allowed"
                                     disabled={lead.status === LeadStatus.CONVERTED}
                                     checked={selectedLeadIds.includes(lead._id)}
                                     onChange={() => toggleLeadSelection(lead._id)}
                              />
                            </td>
                            <td className="px-6 py-4 text-[14px] font-semibold text-slate-200 whitespace-nowrap">{lead.customerPhone}</td>
                            {allResponseKeys.map(key => (
                              <td key={key} className="px-6 py-4 whitespace-nowrap">
                                <span className="text-[13px] font-medium text-slate-200 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                  {lead.responses?.[key] ? String(lead.responses[key]) : '-'}
                                </span>
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full ${
                                lead.status === LeadStatus.NEW ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' :
                                lead.status === LeadStatus.CONTACTED ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' :
                                lead.status === LeadStatus.CONVERTED ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                                'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                              }`}>
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[13px] text-slate-400 font-medium whitespace-nowrap">
                              {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {lead.status !== LeadStatus.CONVERTED && (
                                  <button
                                    onClick={() => convertLeadToClient(lead._id, lead.responses)}
                                    className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[12px] font-medium rounded-lg hover:bg-indigo-500/30 transition-colors whitespace-nowrap shadow-sm"
                                  >
                                    Convert Lead
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteLead(lead._id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MotionDiv>
                )}
              </div>
            </MotionDiv>

            {/* Bulk Convert Confirmation Modal */}
            <AnimatePresence>
              {showBulkConvertModal && (
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm rounded-2xl"
                >
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
                    <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-indigo-500/20">
                      <Zap className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">Sync to Enquiries?</h3>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                      You are about to extract the WhatsApp variables from <strong>{selectedLeadIds.length}</strong> selected contacts and automatically sync them directly into the Education Enquiries CRM as new leads.
                    </p>
                    
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => setShowBulkConvertModal(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors"
                        disabled={bulkConverting}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleBulkConvert}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        disabled={bulkConverting}
                      >
                        {bulkConverting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Start Sync
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'blue' | 'amber' | 'green' | 'red' | 'violet' }) {
  const color = tone === 'blue' ? 'text-blue-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : tone === 'violet' ? 'text-violet-600' : 'text-slate-900';
  return (
    <div className="animate-content-in rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
