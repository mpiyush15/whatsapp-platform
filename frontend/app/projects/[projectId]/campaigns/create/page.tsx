'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';

const normPhone = (p: string) => String(p || '').replace(/\D/g, '');

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type TemplateItem = {
  _id: string;
  name: string;
  status?: string;
  category?: string;
  variables?: string[];
  variableConfig?: any[];
};

type AudienceSource = 'contacts' | 'enquiries' | 'admissions';
type Step = 1 | 2 | 3 | 4;

type AudienceItem = {
  id: string;
  recordId: string;
  phone: string;
  name: string;
  email?: string;
  tags: string[];
  area?: string;
  course?: string;
  source?: string;
  status?: string;
  type: AudienceSource;
};

const audienceConfig: Record<AudienceSource, { title: string; subtitle: string }> = {
  contacts: {
    title: 'Contacts',
    subtitle: 'Raw manual or bulk uploaded campaign contacts.',
  },
  enquiries: {
    title: 'Enquiries',
    subtitle: 'Students currently in the education enquiry pipeline.',
  },
  admissions: {
    title: 'Admissions',
    subtitle: 'Admitted students only.',
  },
};

function getHeaders(token: string | null) {
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function mapContact(c: any): AudienceItem | null {
  const phone = normPhone(c.phone || c.whatsappNumber || c.userPhone);
  const recordId = String(c._id || c.id || phone || '');
  if (!phone || !recordId) return null;
  return {
    id: `contacts:${recordId}`,
    recordId,
    phone,
    name: c.name || c.userName || phone,
    email: c.email || '',
    tags: Array.isArray(c.tags) ? c.tags : [],
    area: c.customAttributes?.area || '',
    course: c.customAttributes?.courseInterest || '',
    source: c.source || 'Manual',
    status: c.leadStatus || c.type || 'contact',
    type: 'contacts',
  };
}

function mapEnquiry(e: any, type: AudienceSource): AudienceItem | null {
  const phone = normPhone(e.phone || e.contactId?.phone || e.contactId?.whatsappNumber);
  const recordId = String(e._id || '');
  if (!phone || !recordId) return null;
  return {
    id: `${type}:${recordId}`,
    recordId,
    phone,
    name: e.name || phone,
    email: e.email || '',
    tags: Array.isArray(e.tags) ? e.tags : [],
    area: e.studentDetails?.address || '',
    course: e.courseId?.name || '',
    source: e.source || e.contactId?.source || 'Manual',
    status: e.status || '',
    type,
  };
}

export default function CreateProjectCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const fromCampaignId = searchParams.get('fromCampaign');
  const followUpAudience = searchParams.get('audience') as 'repliers' | 'opened' | null;
  const parentCampaignName = searchParams.get('parentName') || 'Campaign';
  const isFollowUp = Boolean(fromCampaignId && followUpAudience);

  const [step, setStep] = useState<Step>(1);
  const [campaignName, setCampaignName] = useState('');
  const [audienceSource, setAudienceSource] = useState<AudienceSource>('contacts');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [buttonUrlParam, setButtonUrlParam] = useState('');
  const [mediaList, setMediaList] = useState<any[]>([]);

  const [contacts, setContacts] = useState<AudienceItem[]>([]);
  const [enquiries, setEnquiries] = useState<AudienceItem[]>([]);
  const [admissions, setAdmissions] = useState<AudienceItem[]>([]);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  const [extraPhones, setExtraPhones] = useState<string[]>([]);
  const [projectVertical, setProjectVertical] = useState<string>('general');

  const [searchFilter, setSearchFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const followUpAppliedRef = useRef(false);

  const token = authService.getToken();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setError('');
        const headers = getHeaders(token);

        const [templateRes, contactRes, enquiryRes, admissionRes, projectRes, mediaRes] = await Promise.allSettled([
          fetch(`${API_URL}/templates?projectId=${projectId}`, { headers }),
          fetch(`${API_URL}/contacts?projectId=${projectId}&limit=1000&rawOnly=1`, { headers }),
          fetch(`${API_URL}/education/enquiries?projectId=${projectId}`, { headers }),
          fetch(`${API_URL}/education/enquiries?projectId=${projectId}&status=admitted`, { headers }),
          fetch(`${API_URL}/projects/${projectId}`, { headers }),
          fetch(`${API_URL}/media-library?projectId=${projectId}`, { headers }),
        ]);

        if (templateRes.status === 'fulfilled' && templateRes.value.ok) {
          const payload = await templateRes.value.json();
          const rows = payload?.data?.templates || payload?.templates || (Array.isArray(payload) ? payload : []);
          setTemplates((rows || [])
            .map((t: any) => ({
              _id: t._id,
              name: t.name || t.templateName || 'Untitled Template',
              status: t.status,
              category: t.category,
              variables: t.variables || [],
            }))
            .filter((t: TemplateItem) => Boolean(t._id)));
        }

        if (contactRes.status === 'fulfilled' && contactRes.value.ok) {
          const payload = await contactRes.value.json();
          const rows = payload?.data?.contacts || payload?.contacts || (Array.isArray(payload) ? payload : []);
          setContacts((rows || []).map(mapContact).filter(Boolean) as AudienceItem[]);
        }

        if (enquiryRes.status === 'fulfilled' && enquiryRes.value.ok) {
          const payload = await enquiryRes.value.json();
          const rows = payload?.data || payload?.enquiries || [];
          setEnquiries((rows || [])
            .filter((e: any) => e.status !== 'admitted')
            .map((e: any) => mapEnquiry(e, 'enquiries'))
            .filter(Boolean) as AudienceItem[]);
        }

        if (admissionRes.status === 'fulfilled' && admissionRes.value.ok) {
          const payload = await admissionRes.value.json();
          const rows = payload?.data || payload?.enquiries || [];
          setAdmissions((rows || []).map((e: any) => mapEnquiry(e, 'admissions')).filter(Boolean) as AudienceItem[]);
        }

        if (projectRes.status === 'fulfilled' && projectRes.value.ok) {
          const payload = await projectRes.value.json();
          const vertical = payload?.project?.vertical || payload?.data?.vertical || 'general';
          setProjectVertical(vertical);
        }

        if (mediaRes.status === 'fulfilled' && mediaRes.value.ok) {
          const payload = await mediaRes.value.json();
          setMediaList(payload.media || []);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load campaign data');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [projectId, token]);

  const sourceItems = useMemo(() => {
    if (audienceSource === 'contacts') return contacts;
    if (audienceSource === 'enquiries') return enquiries;
    return admissions;
  }, [admissions, audienceSource, contacts, enquiries]);

  useEffect(() => {
    setSelectedAudienceIds([]);
    setExtraPhones([]);
    setSearchFilter('');
    setTagFilter('');
    setAreaFilter('');
    setSourceFilter('');
    setCourseFilter('');
    setStatusFilter('');
  }, [audienceSource]);

  useEffect(() => {
    if (!isFollowUp || !fromCampaignId || followUpAppliedRef.current || loadingData) return;

    const applyFollowUpAudience = async () => {
      try {
        setFollowUpLoading(true);
        const label = followUpAudience === 'repliers' ? 'repliers' : 'opened';
        setCampaignName(`Follow-up (${label}): ${decodeURIComponent(parentCampaignName)}`);
        setAudienceSource('contacts');

        const res = await fetch(
          `${API_URL}/campaigns/${fromCampaignId}/recipients?projectId=${projectId}&refresh=0`,
          { headers: getHeaders(token) }
        );
        if (!res.ok) {
          setFollowUpNote('Could not load audience from parent campaign.');
          return;
        }

        const payload = await res.json();
        const rows: Array<{ phone: string; outboundStatus: string; replied: boolean }> =
          payload?.recipients || payload?.data?.recipients || [];

        const targetPhones = new Set<string>();
        for (const row of rows) {
          const ph = normPhone(row.phone);
          if (!ph) continue;
          if (followUpAudience === 'repliers' && row.replied) targetPhones.add(ph);
          if (followUpAudience === 'opened' && row.outboundStatus === 'read') targetPhones.add(ph);
        }

        const matchedIds: string[] = [];
        for (const item of contacts) {
          if (targetPhones.has(item.phone)) {
            matchedIds.push(item.id);
            targetPhones.delete(item.phone);
          }
        }

        setSelectedAudienceIds(matchedIds);
        setExtraPhones(Array.from(targetPhones));
        followUpAppliedRef.current = true;
        setFollowUpNote(`Pre-selected ${matchedIds.length + targetPhones.size} contacts from parent campaign (${label}).`);
        if (matchedIds.length > 0) {
          setShowSelectedOnly(true);
        }
        setStep(3);
      } catch {
        setFollowUpNote('Failed to load follow-up audience.');
      } finally {
        setFollowUpLoading(false);
      }
    };

    applyFollowUpAudience();
  }, [contacts, followUpAudience, fromCampaignId, isFollowUp, loadingData, parentCampaignName, projectId, token]);

  const filteredItems = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const tagTerms = tagFilter.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    const area = areaFilter.trim().toLowerCase();
    const source = sourceFilter.trim().toLowerCase();
    const course = courseFilter.trim().toLowerCase();
    const status = statusFilter.trim().toLowerCase();

    return sourceItems.filter((item) => {
      const tags = item.tags.map((tag) => tag.toLowerCase());
      const tagText = tags.join(' ');
      const name = item.name.toLowerCase();
      const phone = item.phone.toLowerCase();
      const areaValue = String(item.area || '').toLowerCase();
      const sourceValue = String(item.source || '').toLowerCase();
      const courseValue = String(item.course || '').toLowerCase();
      const statusValue = String(item.status || '').toLowerCase();

      if (q && !name.includes(q) && !phone.includes(q) && !tagText.includes(q) && !areaValue.includes(q) && !courseValue.includes(q)) return false;
      if (tagTerms.length > 0 && !tagTerms.every((tag) => tags.includes(tag))) return false;
      if (area && !areaValue.includes(area)) return false;
      if (source && sourceValue !== source) return false;
      if (course && !courseValue.includes(course)) return false;
      if (status && statusValue !== status) return false;
      if (showSelectedOnly && !selectedAudienceIds.includes(item.id)) return false;
      return true;
    }).sort((a, b) => {
      const aSelected = selectedAudienceIds.includes(a.id);
      const bSelected = selectedAudienceIds.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [areaFilter, courseFilter, searchFilter, sourceFilter, sourceItems, statusFilter, tagFilter, showSelectedOnly, selectedAudienceIds]);

  const availableSources = useMemo(
    () => Array.from(new Set(sourceItems.map((item) => item.source).filter(Boolean) as string[])).sort(),
    [sourceItems]
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set(sourceItems.map((item) => item.status).filter(Boolean) as string[])).sort(),
    [sourceItems]
  );

  const selectedItems = useMemo(
    () => sourceItems.filter((item) => selectedAudienceIds.includes(item.id)),
    [selectedAudienceIds, sourceItems]
  );

  const toggleAudienceItem = (id: string) => {
    setSelectedAudienceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectFilteredItems = () => {
    setSelectedAudienceIds((prev) => Array.from(new Set([...prev, ...filteredItems.map((item) => item.id)])));
  };

  const clearAudienceFilters = () => {
    setSearchFilter('');
    setTagFilter('');
    setAreaFilter('');
    setSourceFilter('');
    setCourseFilter('');
    setStatusFilter('');
  };

  const clearSelection = () => {
    setSelectedAudienceIds([]);
    setExtraPhones([]);
  };

  const validateStep = (s: Step) => {
    if (s === 1 && !campaignName.trim()) {
      setError('Campaign name is required');
      return false;
    }

    if (s === 2 && !audienceSource) {
      setError('Please choose an audience source');
      return false;
    }

    if (s === 3) {
      if (!selectedTemplateId) {
        setError('Please select a template');
        return false;
      }
      if (selectedItems.length === 0 && extraPhones.length === 0) {
        setError(`Please select at least one ${audienceConfig[audienceSource].title.toLowerCase()} record`);
        return false;
      }
    }

    if (s === 4 && sendMode === 'schedule' && !scheduledAt) {
      setError('Please choose schedule date/time');
      return false;
    }

    setError('');
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(4, prev + 1) as Step);
  };

  const prev = () => {
    setError('');
    setStep((prevStep) => Math.max(1, prevStep - 1) as Step);
  };

  const submitCampaign = async () => {
    if (!validateStep(4)) return;

    try {
      setSubmitting(true);
      setError('');

      const selectedPhones = Array.from(new Set([...selectedItems.map((item) => item.phone), ...extraPhones].filter(Boolean)));
      const selectedContactIds = audienceSource === 'contacts' ? selectedItems.map((item) => item.recordId) : [];

      const payload = {
        name: campaignName.trim(),
        templateId: selectedTemplateId,
        projectId,
        variables: templateVariables,
        headerMediaUrl: headerMediaUrl.trim() || undefined,
        buttonUrlParam: buttonUrlParam.trim() || undefined,
        recipientFilters: {
          type: 'contacts',
          audienceSource,
          selectedRecordIds: selectedItems.map((item) => item.recordId),
          selectedContactIds,
          selectedPhones,
          filters: {
            search: searchFilter,
            tags: tagFilter,
            area: areaFilter,
            source: sourceFilter,
            courseInterest: courseFilter,
            status: statusFilter,
          },
          ...(isFollowUp && fromCampaignId ? { followUpFromCampaignId: fromCampaignId, followUpAudience } : {}),
        },
        scheduling: {
          sendNow: sendMode === 'now',
          scheduledAt: sendMode === 'schedule' ? scheduledAt : null,
        },
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

      if (!campaignId) {
        router.push(`/projects/${projectId}/campaigns`);
        return;
      }

      if (sendMode === 'now') {
        await fetch(`${API_URL}/campaigns/${campaignId}/start?projectId=${projectId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }

      router.push(`/projects/${projectId}/campaigns/${campaignId}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selectedItems.length + extraPhones.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isFollowUp ? 'Follow-up campaign' : 'Create campaign'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {isFollowUp
            ? `Retargeting ${followUpAudience === 'repliers' ? 'people who replied' : 'people who opened'} from "${decodeURIComponent(parentCampaignName)}"`
            : 'Name, source, audience, template, send'}
        </p>
      </div>

      {followUpLoading && (
        <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">
          Loading audience from parent campaign...
        </div>
      )}

      {followUpNote && !followUpLoading && (
        <div className="mb-4 p-4 rounded-lg border-2 border-blue-400 bg-blue-50 text-blue-900 text-sm shadow-sm">
          <div className="flex items-start">
            <span className="text-xl mr-2">🎯</span>
            <div>
              <p className="font-semibold text-base">{followUpNote}</p>
              {extraPhones.length > 0 && (
                <p className="mt-1 text-blue-700 font-medium">
                  + {extraPhones.length} unsaved number(s) included by phone.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-6">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`h-2 rounded-full ${step >= n ? 'bg-green-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loadingData ? (
          <div className="text-sm text-gray-600">Loading campaign data...</div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Step 1: Campaign name</h2>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Campaign name</label>
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Andheri NEET follow-up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Step 2: Audience source</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(audienceConfig) as AudienceSource[])
                    .filter(source => projectVertical === 'education' || source === 'contacts')
                    .map((source) => {
                      const count = source === 'contacts' ? contacts.length : source === 'enquiries' ? enquiries.length : admissions.length;
                      const selected = audienceSource === source;
                      return (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setAudienceSource(source)}
                          className={`text-left rounded-xl border p-4 transition ${
                            selected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{audienceConfig[source].title}</p>
                          <p className="mt-1 text-sm text-gray-600">{audienceConfig[source].subtitle}</p>
                          <p className="mt-3 text-xs font-medium text-gray-500">{count} available</p>
                        </button>
                      );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Step 3: Select {audienceConfig[audienceSource].title}</h2>
                    <p className="text-sm text-gray-600">Filter this source, select one by one, or select all filtered.</p>
                  </div>
                  <div className="text-sm font-medium text-gray-600">Selected: {selectedCount}</div>
                </div>
                
                {availableStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('')}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        statusFilter === '' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({sourceItems.length})
                    </button>
                    {availableStatuses.map((status) => {
                      const stLower = String(status).toLowerCase();
                      const count = sourceItems.filter((item) => String(item.status || '').toLowerCase() === stLower).length;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusFilter(stLower)}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                            statusFilter === stLower ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="capitalize">{status}</span> ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTemplateId(val);
                      const tmp = templates.find(t => t._id === val);
                      if (tmp?.variables?.length) {
                        const initVars = new Array(tmp.variables.length).fill('');
                        if (tmp.variableConfig && tmp.variableConfig.length > 0) {
                          tmp.variableConfig.forEach((cfg, idx) => {
                            if (idx < initVars.length) {
                              if (cfg.autoMap === 'Contact Name') initVars[idx] = '{{name}}';
                              else if (cfg.autoMap === 'Phone Number') initVars[idx] = '{{phone}}';
                              else if (cfg.autoMap === 'Email') initVars[idx] = '{{email}}';
                            }
                          });
                        }
                        setTemplateVariables(initVars);
                      } else {
                        setTemplateVariables([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a template</option>
                    {templates.map((t) => (
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
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 30 June or {{name}}"
                          />
                          <div className="flex gap-1">
                            {['{{name}}', '{{course}}', '{{area}}'].map(tag => (
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

                {selectedTemplateId && (() => {
                  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    if (!e.target.files || e.target.files.length === 0) return;
                    try {
                      setIsUploadingMedia(true);
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await fetch(`${API_URL}/campaigns/upload-attachment?projectId=${projectId}`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                      });
                      if (!res.ok) throw new Error('Upload failed');
                      const data = await res.json();
                      if (data.url) setHeaderMediaUrl(data.url);
                    } catch (err: any) {
                      alert(err.message || 'Failed to upload file');
                    } finally {
                      setIsUploadingMedia(false);
                    }
                  };

                  return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Dynamic Media URL (Optional)</label>
                      <p className="text-xs text-gray-500 mb-2">If your template has a media header (Image, Video, Document), you can override it here. E.g., {'{{invoice_url}}'} to map a dynamic URL per contact, or select a file from your Media Library.</p>
                      <div className="flex gap-2 items-center">
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white w-48 text-sm"
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <label className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition ${isUploadingMedia ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
                          {isUploadingMedia ? 'Uploading...' : 'Upload File'}
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploadingMedia} />
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Dynamic Button URL Extension (Optional)</label>
                      <p className="text-xs text-gray-500 mb-2">If your template has a dynamic URL button, provide the extension (e.g. {'{{tracking_id}}'} or '12345') to be appended to the button's base URL.</p>
                      <div className="flex gap-2">
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white w-48 text-sm flex-shrink-0"
                          onChange={(e) => {
                            if (e.target.value) setButtonUrlParam(e.target.value);
                          }}
                          value={mediaList.find(m => m._id === buttonUrlParam) ? buttonUrlParam : ''}
                        >
                          <option value="">Select Document...</option>
                          {mediaList.filter(m => m.fileType === 'document' || m.fileType === 'pdf').map((m) => (
                            <option key={m._id} value={m._id}>{m.fileName}</option>
                          ))}
                        </select>
                        <input
                          value={buttonUrlParam}
                          onChange={(e) => setButtonUrlParam(e.target.value)}
                          placeholder="e.g. {{tracking_id}} or user-specific-id"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  );
                })()}

                <div className="grid grid-cols-1 gap-2 lg:grid-cols-6">
                  <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Name or phone" className="rounded-lg border border-gray-300 px-3 py-2 text-sm lg:col-span-2" />
                  <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Tags: hot,neet" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Area" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} placeholder="Course" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="">All sources</option>
                    {availableSources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                  <span>Showing {filteredItems.length} of {sourceItems.length} {audienceConfig[audienceSource].title.toLowerCase()}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectFilteredItems} className="rounded-md bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700">
                      Select all filtered
                    </button>
                    <button type="button" onClick={clearSelection} className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
                      Clear selection
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowSelectedOnly(!showSelectedOnly)} 
                      className={`rounded-md border px-3 py-1.5 font-medium transition ${
                        showSelectedOnly 
                          ? 'border-green-600 bg-green-50 text-green-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {showSelectedOnly ? 'Showing selected' : 'Show selected only'}
                    </button>
                    <button type="button" onClick={clearAudienceFilters} className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="max-h-[28rem] overflow-auto rounded-lg border border-gray-200">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No records found for this source.</div>
                  ) : (
                    filteredItems.map((item) => {
                      const checked = selectedAudienceIds.includes(item.id);
                      return (
                        <label key={item.id} className="flex items-start justify-between gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-gray-50">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-600">{item.phone}{item.email ? ` | ${item.email}` : ''}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {[item.area, item.course, item.source, item.status].filter(Boolean).join(' | ') || 'No filter details'}
                            </p>
                            {item.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.tags.slice(0, 6).map((tag) => (
                                  <span key={tag} className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAudienceItem(item.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Step 4: Schedule or send</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendMode('now')}
                    className={`text-left p-4 border rounded-xl transition ${sendMode === 'now' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <p className="font-semibold text-gray-900">Send now</p>
                    <p className="text-sm text-gray-600 mt-1">Create and start immediately</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendMode('schedule')}
                    className={`text-left p-4 border rounded-xl transition ${sendMode === 'schedule' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <p className="font-semibold text-gray-900">Schedule</p>
                    <p className="text-sm text-gray-600 mt-1">Send later at selected date/time</p>
                  </button>
                </div>

                {sendMode === 'schedule' && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Schedule date and time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <p><span className="font-semibold">Campaign:</span> {campaignName || '-'}</p>
                  <p><span className="font-semibold">Audience source:</span> {audienceConfig[audienceSource].title}</p>
                  <p><span className="font-semibold">Template:</span> {templates.find((t) => t._id === selectedTemplateId)?.name || '-'}</p>
                  <p><span className="font-semibold">Audience:</span> {selectedCount} recipients</p>
                  <p><span className="font-semibold">Mode:</span> {sendMode === 'now' ? 'Send now' : `Schedule (${scheduledAt || 'not set'})`}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 1 ? router.push(`/projects/${projectId}/campaigns`) : prev())}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submitCampaign}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : sendMode === 'now' ? 'Submit and send' : 'Submit campaign'}
          </button>
        )}
      </div>
    </div>
  );
}
