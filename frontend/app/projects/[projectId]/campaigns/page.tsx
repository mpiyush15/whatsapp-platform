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

type SortKey = 'createdAt' | 'totalOpened' | 'totalReplied' | 'totalConverted';
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
};

type ContactItem = {
  _id?: string;
  id?: string;
  name?: string;
  userName?: string;
  phone?: string;
  userPhone?: string;
};

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
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingCreateData, setLoadingCreateData] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');

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
    return 0;
  };

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
    if (!q) return contacts;
    return contacts.filter((c) => {
      const nm = (c.name || c.userName || '').toLowerCase();
      const ph = (c.phone || c.userPhone || '').toLowerCase();
      return nm.includes(q) || ph.includes(q);
    });
  }, [contacts, contactSearch]);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setCreateStep(1);
    setCreateError(null);
    setCampaignName('');
    setSelectedTemplateId('');
    setSelectedContacts([]);
    setContactSearch('');

    try {
      setLoadingCreateData(true);
      const token = authService.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tRes, cRes] = await Promise.allSettled([
        fetch(`${API_URL}/templates?projectId=${projectId}`, { headers }),
        fetch(`${API_URL}/contacts?projectId=${projectId}`, { headers }),
      ]);

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
            }))
            .filter((t: TemplateItem) => Boolean(t._id))
        );
      }

      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const cPayload = await cRes.value.json();
        const cList =
          cPayload?.data?.contacts ||
          cPayload?.contacts ||
          (Array.isArray(cPayload) ? cPayload : []);

        setContacts(
          (cList || []).map((c: any) => ({
            _id: c._id,
            id: c.id,
            name: c.name || c.userName,
            userName: c.userName || c.name,
            phone: c.phone || c.userPhone || c.whatsappNumber,
            userPhone: c.userPhone || c.phone || c.whatsappNumber,
          }))
        );
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to load templates and contacts');
    } finally {
      setLoadingCreateData(false);
    }
  };

  const validateStep = (step: 1 | 2 | 3 | 4) => {
    if (step === 1 && !campaignName.trim()) {
      setCreateError('Campaign name is required');
      return false;
    }
    if (step === 2 && selectedContacts.length === 0) {
      setCreateError('Select at least one contact');
      return false;
    }
    if (step === 3 && !selectedTemplateId) {
      setCreateError('Select one template');
      return false;
    }
    setCreateError(null);
    return true;
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateSubmit = async () => {
    if (!validateStep(4)) return;

    try {
      setCreating(true);
      setCreateError(null);
      const token = authService.getToken();

      const selectedContactObjects = contacts.filter((c) => {
        const id = c._id || c.id || c.phone || c.userPhone;
        return id ? selectedContacts.includes(id) : false;
      });

      const payload = {
        name: campaignName.trim(),
        templateId: selectedTemplateId,
        projectId,
        recipientFilters: {
          type: 'contacts',
          selectedContactIds: selectedContacts,
          selectedPhones: selectedContactObjects.map((c) => c.phone || c.userPhone).filter(Boolean),
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
    { key: 'conversions', label: <SortHeader label="Conversions" sortK="totalConverted" />, render: (_: any, row: any) => row.stats?.totalConverted ?? '—' },
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
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
        >
          <span className="text-lg leading-none">+</span>
          Create Campaign
        </button>
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
                  {['Name', 'Contacts', 'Template', 'Preview'].map((label, i) => {
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
                      <input
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search contacts by name or number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-auto">
                        {filteredContacts.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500">No contacts found.</p>
                        ) : (
                          filteredContacts.map((c) => {
                            const id = c._id || c.id || c.phone || c.userPhone;
                            if (!id) return null;
                            const checked = selectedContacts.includes(id);
                            return (
                              <label key={id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                                <div>
                                  <p className="text-sm text-gray-900 font-medium">{c.name || c.userName || 'Unnamed'}</p>
                                  <p className="text-xs text-gray-500">{c.phone || c.userPhone || 'No number'}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleContact(id)}
                                  className="h-4 w-4"
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {createStep === 3 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Select Template</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select template</option>
                        {templates.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name} {t.status ? `(${t.status})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {createStep === 4 && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                      <div className="space-y-3">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                          <p><span className="font-semibold">Campaign:</span> {campaignName || '—'}</p>
                          <p><span className="font-semibold">Contacts:</span> {selectedContacts.length}</p>
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
                  setCreateStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {createStep === 1 ? 'Cancel' : 'Back'}
              </button>

              {createStep < 4 ? (
                <button
                  onClick={() => {
                    if (!validateStep(createStep)) return;
                    setCreateStep((s) => (s + 1) as 1 | 2 | 3 | 4);
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
