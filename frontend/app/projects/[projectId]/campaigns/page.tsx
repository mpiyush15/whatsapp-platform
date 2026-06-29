'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/DataTable';
import { authService } from '@/lib/auth';
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

type SortKey = 'createdAt' | 'totalOpened' | 'totalReplied' | 'totalConverted' | 'totalWon' | 'totalQualified';
type SortDir = 'asc' | 'desc' | null;

type TemplateItem = {
  _id: string;
  name: string;
  status?: string;
  category?: string;
  language?: string;
  content?: string;
  headerText?: string;
  footerText?: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaFileName?: string;
  components?: any[];
  variableConfig?: any[];
};

type ContactItem = {
  _id?: string;
  id?: string;
  name?: string;
  userName?: string;
  phone?: string;
  userPhone?: string;
  source?: string;
  tags?: string[];
  area?: string;
  course?: string;
  status?: string;
};

type CreateStep = 1 | 2 | 3 | 4 | 5;
type AudienceSource = 'contacts' | 'enquiries' | 'admissions';

export default function CampaignsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>(1);
  const [loadingCreateData, setLoadingCreateData] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [buttonUrlParam, setButtonUrlParam] = useState('');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [audienceMode, setAudienceMode] = useState<'selected' | 'all'>('selected');
  const [audienceSource, setAudienceSource] = useState<AudienceSource>('contacts');
  const [contactSearch, setContactSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const token = authService.getToken();
        const res = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        const payload = await res.json();
        const campaignsList =
          payload?.data?.campaigns ||
          payload?.campaigns ||
          (Array.isArray(payload) ? payload : []);

        setCampaigns(Array.isArray(campaignsList) ? campaignsList : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [projectId]);

  const loadCampaignAudience = async (search = '', source: AudienceSource = audienceSource) => {
    try {
      setLoadingContacts(true);
      const token = authService.getToken();
      const query = new URLSearchParams({
        projectId,
        limit: '1000',
      });
      if (search.trim()) query.set('search', search.trim());

      let endpoint = `${API_URL}/contacts?${query.toString()}&rawOnly=1`;
      if (source === 'enquiries') {
        endpoint = `${API_URL}/education/enquiries?${query.toString()}`;
      }
      if (source === 'admissions') {
        query.set('status', 'admitted');
        endpoint = `${API_URL}/education/enquiries?${query.toString()}`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const payload = await res.json();
      const cList =
        payload?.data?.contacts ||
        payload?.data?.enquiries ||
        (Array.isArray(payload?.data) ? payload.data : null) ||
        payload?.contacts ||
        payload?.enquiries ||
        (Array.isArray(payload) ? payload : []);

      setContacts(
        (cList || []).map((c: any) => ({
          _id: c._id,
          id: c.id,
          name: c.name || c.userName,
          userName: c.userName || c.name,
          phone: c.phone || c.userPhone || c.whatsappNumber,
          userPhone: c.userPhone || c.phone || c.whatsappNumber,
          source: c.source || c.contactId?.source || 'Manual',
          tags: c.tags || [],
          area: c.customAttributes?.area || c.studentDetails?.address || '',
          course: c.customAttributes?.courseInterest || c.courseId?.name || '',
          status: c.leadStatus || c.status || c.type || '',
        }))
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!showCreateModal || audienceMode !== 'selected') return;
    const timeout = window.setTimeout(() => {
      loadCampaignAudience(contactSearch, audienceSource);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [showCreateModal, audienceMode, audienceSource, contactSearch, projectId]);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('desc'); }
    else if (sortDir === 'desc') setSortDir('asc');
    else { setSortKey(null); setSortDir(null); }
  };

  const getValue = (row: any, key: SortKey) => {
    if (key === 'createdAt') return new Date(row.createdAt).getTime();
    if (key === 'totalOpened') return row.stats?.totalOpened ?? 0;
    if (key === 'totalReplied') return row.stats?.totalReplied ?? 0;
    if (key === 'totalConverted') return row.stats?.totalConverted ?? 0;
    if (key === 'totalWon') return row.stats?.totalWon ?? 0;
    return 0;
  };

  const totalSpend = useMemo(() => campaigns.reduce((acc, c) => acc + (c.stats?.totalSent || 0) * 0.80, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((acc, c) => acc + (c.stats?.estimatedRevenue || 0), 0), [campaigns]);

  const sortedCampaigns = useMemo(() => {
    if (!sortKey || !sortDir) return campaigns;
    return [...campaigns].sort((a, b) => {
      const aVal = getValue(a, sortKey);
      const bVal = getValue(b, sortKey);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [campaigns, sortKey, sortDir]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const tagTerms = tagFilter.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    const area = areaFilter.trim().toLowerCase();
    const src = sourceFilter.trim().toLowerCase();
    const course = courseFilter.trim().toLowerCase();
    const status = statusFilter.trim().toLowerCase();
    return contacts.filter((c) => {
      const nm = (c.name || c.userName || '').toLowerCase();
      const ph = (c.phone || c.userPhone || '').toLowerCase();
      const tags = (c.tags || []).map((tag) => String(tag).toLowerCase());
      const areaValue = String(c.area || '').toLowerCase();
      const sourceValue = String(c.source || '').toLowerCase();
      const courseValue = String(c.course || '').toLowerCase();
      const statusValue = String(c.status || '').toLowerCase();
      if (q && !nm.includes(q) && !ph.includes(q) && !tags.join(' ').includes(q) && !areaValue.includes(q) && !courseValue.includes(q)) return false;
      if (tagTerms.length > 0 && !tagTerms.every((tag) => tags.includes(tag))) return false;
      if (area && !areaValue.includes(area)) return false;
      if (src && sourceValue !== src) return false;
      if (course && !courseValue.includes(course)) return false;
      if (status && statusValue !== status) return false;
      return true;
    });
  }, [areaFilter, contactSearch, contacts, courseFilter, sourceFilter, statusFilter, tagFilter]);

  const availableSources = useMemo(() => Array.from(new Set(contacts.map((c) => c.source).filter(Boolean) as string[])).sort(), [contacts]);
  const availableStatuses = useMemo(() => Array.from(new Set(contacts.map((c) => c.status).filter(Boolean) as string[])).sort(), [contacts]);

  const selectFilteredAudience = () => {
    if (audienceSource === 'contacts') {
      const ids = filteredContacts.map((c) => c._id || c.id || c.phone || c.userPhone).filter(Boolean).map(String);
      setSelectedContacts((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const phones = filteredContacts.map((c) => c.phone || c.userPhone).filter(Boolean).map(String);
      setSelectedPhones((prev) => Array.from(new Set([...prev, ...phones])));
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setCreateStep(1);
    setCreateError(null);
    setCampaignName('');
    setSelectedTemplateId('');
    setSelectedContacts([]);
    setTemplateVariables([]);
    setHeaderMediaUrl('');
    setButtonUrlParam('');
    setSelectedPhones([]);
    setAudienceMode('selected');
    setAudienceSource('contacts');
    setContactSearch('');
    setTagFilter('');
    setAreaFilter('');
    setSourceFilter('');
    setCourseFilter('');
    setStatusFilter('');

    try {
      setLoadingCreateData(true);
      const token = authService.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tRes, mRes] = await Promise.allSettled([
        fetch(`${API_URL}/templates?projectId=${projectId}`, { headers }),
        fetch(`${API_URL}/media-library/${projectId}`, { headers }),
      ]);

      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        const mPayload = await mRes.value.json();
        setMediaList(mPayload?.media || []);
      }

      if (tRes.status === 'fulfilled' && tRes.value.ok) {
        const tPayload = await tRes.value.json();
        const tList =
          tPayload?.data?.templates ||
          tPayload?.templates ||
          (Array.isArray(tPayload) ? tPayload : []);

        setTemplates(
          (tList || [])
            .map((t: any) => ({
              _id: t._id || t.id,
              name: t.name || t.templateName || 'Untitled Template',
              status: t.status,
              category: t.category,
              language: t.language,
              content: t.content,
              headerText: t.headerText,
              footerText: t.footerText,
              mediaType: t.mediaType,
              mediaUrl: t.mediaUrl,
              mediaFileName: t.mediaFileName,
              components: t.components,
              variableConfig: t.variableConfig || t.variables || [],
            }))
            .filter((t: TemplateItem) => Boolean(t._id))
        );
      }
      await loadCampaignAudience('', 'contacts');
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to load templates and contacts');
    } finally {
      setLoadingCreateData(false);
    }
  };

  const validateStep = (step: CreateStep) => {
    if (step === 1 && !campaignName.trim()) {
      setCreateError('Campaign name is required');
      return false;
    }
    if (step === 3 && audienceMode === 'selected' && selectedContacts.length === 0 && selectedPhones.length === 0) {
      setCreateError('Select at least one recipient');
      return false;
    }
    if (step === 4 && !selectedTemplateId) {
      setCreateError('Select one template');
      return false;
    }
    setCreateError(null);
    return true;
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones((prev) => (prev.includes(phone) ? prev.filter((x) => x !== phone) : [...prev, phone]));
  };

  const handleCreateSubmit = async () => {
    if (!validateStep(5)) return;

    try {
      setCreating(true);
      setCreateError(null);
      const token = authService.getToken();

      const payload = {
        name: campaignName.trim(),
        templateId: selectedTemplateId,
        variables: templateVariables,
        headerMediaUrl: headerMediaUrl.trim() || undefined,
        buttonUrlParam: buttonUrlParam.trim() || undefined,
        projectId,
        recipientFilters: {
          type: audienceMode === 'all' ? 'all_contacts' : 'contacts',
          selectedContactIds: audienceMode === 'all' || audienceSource !== 'contacts' ? [] : selectedContacts,
          selectedPhones: audienceMode === 'all' ? [] : selectedPhones,
        },
        scheduling: { sendNow: true },
      };

      const createRes = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errPayload = await createRes.json().catch(() => ({}));
        throw new Error(errPayload?.message || errPayload?.error || 'Failed to create campaign');
      }

      const created = await createRes.json();
      const campaignId =
        created?.campaign?._id ||
        created?.data?.campaign?._id ||
        created?.campaignId ||
        created?.data?.campaignId;

      if (campaignId) {
        await fetch(`${API_URL}/campaigns/${campaignId}/start?projectId=${projectId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }

      const listRes = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const listPayload = await listRes.json();
        const list = listPayload?.data?.campaigns || listPayload?.campaigns || [];
        setCampaigns(Array.isArray(list) ? list : []);
      }

      setShowCreateModal(false);
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const SortHeader = ({ label, sortK }: { label: string; sortK: SortKey }) => {
    const active = sortKey === sortK;
    const dir = active ? sortDir : null;
    return (
      <button onClick={() => handleSort(sortK)} className="flex items-center gap-1 hover:text-green-700 transition font-semibold w-full">
        {label}
        {dir === 'asc' ? <ChevronUp size={14} className="text-green-600" /> :
         dir === 'desc' ? <ChevronDown size={14} className="text-green-600" /> :
         <ChevronsUpDown size={14} className="text-gray-400" />}
      </button>
    );
  };

  const columns = [
    { key: 'name', label: 'Campaign' },
    {
      key: 'status', label: 'Status',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[val] || 'bg-gray-100 text-gray-700'}`}>
          {val || '—'}
        </span>
      ),
    },
    { key: 'recipients', label: 'Sent', render: (_: any, row: any) => row.recipients?.sent ?? '—' },
    { key: 'delivered', label: 'Delivered', render: (_: any, row: any) => row.stats?.totalDelivered ?? '—' },
    { key: 'read', label: <SortHeader label="Read" sortK="totalOpened" />, render: (_: any, row: any) => row.stats?.totalOpened ?? '—' },
    { key: 'replies', label: <SortHeader label="Replies" sortK="totalReplied" />, render: (_: any, row: any) => row.stats?.totalReplied ?? '—' },
    { key: 'qualified', label: 'Qualified', render: (_: any, row: any) => row.stats?.totalQualified ?? '—' },
    { key: 'won', label: <SortHeader label="Won" sortK="totalWon" />, render: (_: any, row: any) => row.stats?.totalWon ?? '—' },
    { key: 'spend', label: 'Est. Spend', render: (_: any, row: any) => `₹${((row.stats?.totalSent || 0) * 0.8).toFixed(2)}` },
    {
      key: 'createdAt', label: <SortHeader label="Created" sortK="createdAt" />,
      render: (val: string) => val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    },
  ];

  const actions = [
    {
      label: 'View', variant: 'primary' as const,
      onClick: (row: any) => router.push(`/projects/${projectId}/campaigns/${row._id}`),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Messages Sent</p>
          <p className="text-2xl font-bold text-gray-900">{campaigns.reduce((acc, c) => acc + (c.recipients?.sent || c.stats?.totalSent || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Delivered</p>
          <p className="text-2xl font-bold text-gray-900">{campaigns.reduce((acc, c) => acc + (c.stats?.totalDelivered || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Read / Opened</p>
          <p className="text-2xl font-bold text-gray-900">{campaigns.reduce((acc, c) => acc + (c.stats?.totalOpened || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Amount Spent</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sortedCampaigns}
        loading={loading}
        error={error}
        actions={actions}
        emptyMessage="No campaigns yet. Create your first campaign!"
      />

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Name', 'Source', 'Recipients', 'Template', 'Preview'].map((label, i) => {
                    const step = i + 1;
                    const active = step === createStep;
                    return (
                      <span
                        key={label}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 min-h-[250px] bg-white">
              {createError && (
                <div className="mb-3 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                  {createError}
                </div>
              )}

              {loadingCreateData ? (
                <p className="text-sm text-gray-600">Loading templates and contacts...</p>
              ) : (
                <>
                  {createStep === 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Campaign Name</label>
                      <input
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="offers"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {createStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Choose audience source</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {[
                          { key: 'contacts', label: 'Contacts', desc: 'Use saved WhatsApp contacts' },
                          { key: 'enquiries', label: 'Enquiries', desc: 'Use education enquiry list' },
                          { key: 'admissions', label: 'Admissions', desc: 'Use admitted students' },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setAudienceSource(option.key as AudienceSource);
                              setSelectedContacts([]);
                              setSelectedPhones([]);
                              setContactSearch('');
                              setTagFilter('');
                              setAreaFilter('');
                              setSourceFilter('');
                              setCourseFilter('');
                              setStatusFilter('');
                              setAudienceMode('selected');
                              loadCampaignAudience('', option.key as AudienceSource);
                            }}
                            className={`rounded-lg border px-3 py-3 text-left ${audienceSource === option.key ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="mt-1 text-xs opacity-75">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {createStep === 3 && (
                    <div className="space-y-3">
                      {audienceSource === 'contacts' ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setAudienceMode('selected')}
                            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${audienceMode === 'selected' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            Pick contacts
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAudienceMode('all');
                              setSelectedContacts([]);
                              setSelectedPhones([]);
                            }}
                            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${audienceMode === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            All opted-in contacts
                          </button>
                        </div>
                      ) : null}
                      {audienceMode === 'all' && audienceSource === 'contacts' ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          This campaign will send to every opted-in contact in this project. The backend will queue the send in the background.
                        </div>
                      ) : null}

                      {audienceMode !== 'all' && availableStatuses.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 pb-1">
                          <button
                            type="button"
                            onClick={() => setStatusFilter('')}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                              statusFilter === '' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            All ({contacts.length})
                          </button>
                          {availableStatuses.map((status) => {
                            const stLower = String(status).toLowerCase();
                            const count = contacts.filter((item) => String(item.status || '').toLowerCase() === stLower).length;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(stLower)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                  statusFilter === stLower ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <span className="capitalize">{status}</span> ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder={`Search ${audienceSource}`} disabled={audienceMode === 'all'} className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Tags: hot,neet" disabled={audienceMode === 'all'} className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Area" disabled={audienceMode === 'all'} className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <input value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} placeholder="Course" disabled={audienceMode === 'all'} className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} disabled={audienceMode === 'all'} className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">All sources</option>
                          {availableSources.map((source) => <option key={source} value={source}>{source}</option>)}
                        </select>
                      </div>
                      {audienceMode !== 'all' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                          <span>Showing {filteredContacts.length} of {contacts.length}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={selectFilteredAudience} className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Select all filtered</button>
                            <button type="button" onClick={() => { setSelectedContacts([]); setSelectedPhones([]); }} className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50">Clear selection</button>
                          </div>
                        </div>
                      )}
                      <div className={`border border-gray-200 rounded-lg max-h-48 overflow-auto ${audienceMode === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                        {loadingContacts ? (
                          <p className="p-3 text-sm text-gray-500">Loading contacts...</p>
                        ) : filteredContacts.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500">No contacts found.</p>
                        ) : (
                          filteredContacts.map((c) => {
                            const id = c._id || c.id || c.phone || c.userPhone;
                            if (!id) return null;
                            const phone = c.phone || c.userPhone || '';
                            const checked = audienceSource === 'contacts' ? selectedContacts.includes(id) : selectedPhones.includes(phone);
                            return (
                              <label key={id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                                <div>
	                                  <p className="text-sm text-gray-900 font-medium">{c.name || c.userName || 'Unnamed'}</p>
	                                  <p className="text-xs text-gray-500">{c.phone || c.userPhone || 'No number'}</p>
                                      <p className="text-xs text-gray-400">{[c.area, c.course, c.source, c.status].filter(Boolean).join(' | ')}</p>
                                      {!!c.tags?.length && <p className="text-xs text-green-700">{c.tags.join(', ')}</p>}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => audienceSource === 'contacts' ? toggleContact(id) : phone && togglePhone(phone)}
                                  disabled={audienceSource !== 'contacts' && !phone}
                                  className="h-4 w-4"
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {createStep === 4 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Template *</label>
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => {
                            const tmpId = e.target.value;
                            setSelectedTemplateId(tmpId);
                            const tmp = templates.find(t => t._id === tmpId);
                            if (tmp) {
                              let count = tmp.variableConfig?.length || 0;
                              if (count === 0 && tmp.components) {
                                // Auto-detect from text if no config provided
                                tmp.components.forEach((c: any) => {
                                  if (c.type === 'BODY' && typeof c.text === 'string') {
                                    const matches = c.text.match(/\{\{\d+\}\}/g);
                                    if (matches) {
                                      matches.forEach((m: string) => {
                                        const num = parseInt(m.replace(/[{}]/g, ''));
                                        if (num > count) count = num;
                                      });
                                    }
                                  }
                                });
                              }
                              setTemplateVariables(new Array(count).fill(''));
                            } else {
                              setTemplateVariables([]);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                        >
                          <option value="">-- Choose a template --</option>
                          {templates.map(t => (
                            <option key={t._id} value={t._id}>
                              {t.name} {t.status ? `(${t.status})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {templateVariables.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <h3 className="text-sm font-medium text-gray-800">Template Variables Mapping</h3>
                          <p className="text-xs text-gray-500">Insert static text or dynamic tags like {"{{name}}"}, {"{{course}}"}, {"{{area}}"}</p>
                          {templateVariables.map((val, idx) => {
                            const tmp = templates.find(t => t._id === selectedTemplateId);
                            const cfg = tmp?.variableConfig?.[idx];
                            const displayName = cfg?.displayName || `Variable {{${idx + 1}}}`;
                            
                            return (
                            <div key={idx} className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-700">
                                {displayName} <span className="font-mono text-gray-500 font-normal ml-1">{"{{"}{idx + 1}{"}}"}</span>
                              </label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  value={val}
                                  onChange={(e) => {
                                    const newVars = [...templateVariables];
                                    newVars[idx] = e.target.value;
                                    setTemplateVariables(newVars);
                                  }}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                  placeholder="e.g. 30 June or {{name}}"
                                />
                                <div className="flex gap-1">
                                  {['{{name}}', '{{phone}}', '{{area}}', '{{course}}'].map(tag => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => {
                                        const newVars = [...templateVariables];
                                        newVars[idx] = val ? `${val} ${tag}` : tag;
                                        setTemplateVariables(newVars);
                                      }}
                                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-100 text-gray-600"
                                    >
                                      + {tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedTemplateId && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-700 mb-2">Dynamic Media URL (Optional)</label>
                            <p className="text-xs text-gray-500 mb-2">If your template has a media header, override it here. E.g. {'{{invoice_url}}'} or select from Library.</p>
                            <div className="flex gap-2 items-center">
                              <select
                                className="px-3 py-2 border border-gray-300 rounded-lg bg-white w-48 text-sm text-gray-900"
                                onChange={(e) => {
                                  if (e.target.value) setHeaderMediaUrl(e.target.value);
                                }}
                                value={mediaList.find(m => m.mediaUrl === headerMediaUrl) ? headerMediaUrl : ''}
                              >
                                <option value="">Select from Library...</option>
                                {mediaList.map((m) => (
                                  <option key={m._id} value={m.mediaUrl}>{m.fileName}</option>
                                ))}
                              </select>
                              <input
                                value={headerMediaUrl}
                                onChange={(e) => setHeaderMediaUrl(e.target.value)}
                                placeholder="https://... or {{custom_url_variable}}"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-700 mb-2">Dynamic Button URL Parameter (Optional)</label>
                            <p className="text-xs text-gray-500 mb-2">If your template has a button with a dynamic URL suffix, map it here. (e.g. {'{{phone}}'} or {'12345'})</p>
                            <input
                              value={buttonUrlParam}
                              onChange={(e) => setButtonUrlParam(e.target.value)}
                              placeholder="e.g. {{phone}} or 12345"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {createStep === 5 && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                      <div className="space-y-3">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                          <p><span className="font-semibold">Campaign:</span> {campaignName || '—'}</p>
                          <p><span className="font-semibold">Source:</span> {audienceSource}</p>
                          <p><span className="font-semibold">Audience:</span> {audienceMode === 'all' ? 'All opted-in contacts' : `${audienceSource === 'contacts' ? selectedContacts.length : selectedPhones.length} selected`}</p>
                          <p><span className="font-semibold">Template:</span> {selectedTemplate?.name || '—'}</p>
                          <p><span className="font-semibold">Meta:</span> {selectedTemplate?.category || 'template'}{selectedTemplate?.language ? ` • ${selectedTemplate.language.toUpperCase()}` : ''}</p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#ece5dd] border border-[#e5ded4] p-2.5">
                        <p className="text-[10px] font-semibold text-gray-500 mb-2 text-center tracking-wide">PREVIEW</p>

                        {(() => {
                          const t = selectedTemplate;
                          if (!t) {
                            return <p className="text-xs text-gray-500 text-center py-8">Select a template</p>;
                          }

                          const headerComp = t.components?.find((c: any) => String(c?.type || '').toUpperCase() === 'HEADER');
                          const bodyComp = t.components?.find((c: any) => String(c?.type || '').toUpperCase() === 'BODY');
                          const footerComp = t.components?.find((c: any) => String(c?.type || '').toUpperCase() === 'FOOTER');
                          const buttonsComp = t.components?.find((c: any) => String(c?.type || '').toUpperCase() === 'BUTTONS');

                          const bodyText = bodyComp?.text || t.content || '';
                          const footerText = footerComp?.text || t.footerText || '';
                          const headerText = headerComp?.format === 'TEXT' ? (headerComp?.text || t.headerText || '') : '';
                          const mediaUrl = t.mediaUrl || headerComp?.example?.header_handle?.[0] || '';
                          const mediaType = String(t.mediaType || headerComp?.format || '').toLowerCase();
                          const hasImage = mediaType.includes('image');
                          const hasVideo = mediaType.includes('video');
                          const hasDoc = mediaType.includes('document') || mediaType.includes('pdf') || mediaType.includes('application');
                          const buttons = (buttonsComp?.buttons || []).slice(0, 2);

                          return (
                            <div className="rounded-[22px] border-[6px] border-[#e5ded4] bg-[#ece5dd] p-1.5">
                              <div className="rounded-[16px] overflow-hidden bg-white shadow-sm">
                                {hasImage && mediaUrl ? (
                                  <img src={mediaUrl} alt="header" className="w-full h-24 object-cover" />
                                ) : hasImage ? (
                                  <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-2xl">🖼️</div>
                                ) : hasVideo ? (
                                  <div className="w-full h-20 bg-gray-900 text-white flex items-center justify-center">▶</div>
                                ) : hasDoc ? (
                                  <div className="w-full h-14 bg-gray-50 border-b border-gray-100 text-xs text-gray-600 flex items-center justify-center">📄 Document</div>
                                ) : null}

                                <div className="px-2.5 py-2">
                                  {headerText && <p className="text-[11px] font-semibold text-gray-700 mb-1">{headerText}</p>}
                                  <p className="text-[11px] text-gray-800 leading-snug whitespace-pre-wrap">{bodyText || 'No content'}</p>
                                  {footerText && <p className="text-[10px] text-gray-400 mt-1">{footerText}</p>}
                                  <p className="text-[10px] text-gray-400 text-right mt-1">11:59 ✓✓</p>
                                </div>

                                {buttons.length > 0 && (
                                  <div className="border-t border-gray-100">
                                    {buttons.map((btn: any, i: number) => (
                                      <div key={i}>
                                        {i > 0 && <div className="border-t border-gray-100" />}
                                        <p className="py-1.5 text-[11px] text-center font-semibold" style={{ color: '#0096de' }}>
                                          {btn?.text || 'Button'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <button
                onClick={() => {
                  if (createStep === 1) {
                    setShowCreateModal(false);
                    return;
                  }
                  setCreateError(null);
                  setCreateStep((s) => (s - 1) as CreateStep);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {createStep === 1 ? 'Cancel' : 'Back'}
              </button>

              {createStep < 5 ? (
                <button
                  onClick={() => {
                    if (!validateStep(createStep)) return;
                    setCreateStep((s) => (s + 1) as CreateStep);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleCreateSubmit}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
