'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type TemplateItem = {
  _id: string;
  name: string;
  status?: string;
  category?: string;
};

type ContactItem = {
  _id?: string;
  id?: string;
  name?: string;
  userName?: string;
  phone?: string;
  userPhone?: string;
};

type Step = 1 | 2 | 3;

export default function CreateProjectCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [campaignName, setCampaignName] = useState('');

  // Step 2
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Step 3
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const token = authService.getToken();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setError('');

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

          const mappedTemplates: TemplateItem[] = (tList || []).map((t: any) => ({
            _id: t._id || t.id,
            name: t.name || t.templateName || 'Untitled Template',
            status: t.status,
            category: t.category,
          }));

          setTemplates(mappedTemplates.filter((t) => Boolean(t._id)));
        }

        if (cRes.status === 'fulfilled' && cRes.value.ok) {
          const cPayload = await cRes.value.json();
          const cList =
            cPayload?.data?.contacts ||
            cPayload?.contacts ||
            (Array.isArray(cPayload) ? cPayload : []);

          const mappedContacts: ContactItem[] = (cList || []).map((c: any) => ({
            _id: c._id,
            id: c.id,
            name: c.name || c.userName,
            userName: c.userName || c.name,
            phone: c.phone || c.userPhone,
            userPhone: c.userPhone || c.phone,
          }));

          setContacts(mappedContacts);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load templates and contacts');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [projectId, token]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter((c) => {
      const nm = (c.name || c.userName || '').toLowerCase();
      const ph = (c.phone || c.userPhone || '').toLowerCase();
      return nm.includes(q) || ph.includes(q);
    });
  }, [contacts, contactSearch]);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const validateStep = (s: Step) => {
    if (s === 1) {
      if (!campaignName.trim()) {
        setError('Campaign name is required');
        return false;
      }
    }

    if (s === 2) {
      if (!selectedTemplateId) {
        setError('Please select a template');
        return false;
      }
      if (selectedContacts.length === 0) {
        setError('Please select at least one contact for audience');
        return false;
      }
    }

    if (s === 3) {
      if (sendMode === 'schedule' && !scheduledAt) {
        setError('Please choose schedule date/time');
        return false;
      }
    }

    setError('');
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(3, prev + 1) as Step);
  };

  const prev = () => {
    setError('');
    setStep((prevStep) => Math.max(1, prevStep - 1) as Step);
  };

  const submitCampaign = async () => {
    if (!validateStep(3)) return;

    try {
      setSubmitting(true);
      setError('');

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
          selectedPhones: selectedContactObjects
            .map((c) => c.phone || c.userPhone)
            .filter(Boolean),
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-sm text-gray-600 mt-1">3-step flow: Name → Template + Audience → Schedule/Send</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-2 rounded-full ${step >= n ? 'bg-green-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loadingData ? (
          <div className="text-sm text-gray-600">Loading templates and contacts...</div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Step 1: Campaign Name</h2>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Campaign name</label>
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Summer Promo Blast"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Step 2: Select Template + Audience</h2>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-700">Audience from Contacts</label>
                    <span className="text-xs text-gray-500">Selected: {selectedContacts.length}</span>
                  </div>

                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search contacts by name or phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />

                  <div className="border border-gray-200 rounded-lg max-h-72 overflow-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No contacts found.</div>
                    ) : (
                      filteredContacts.map((c) => {
                        const id = c._id || c.id || c.phone || c.userPhone;
                        if (!id) return null;
                        const checked = selectedContacts.includes(id);
                        return (
                          <label key={id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.name || c.userName || 'Unnamed Contact'}</p>
                              <p className="text-xs text-gray-600">{c.phone || c.userPhone || 'No number'}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleContact(id)}
                              className="h-4 w-4 text-green-600 rounded border-gray-300"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Step 3: Schedule or Send</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setSendMode('now')}
                    className={`text-left p-4 border rounded-xl transition ${
                      sendMode === 'now' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Send Now</p>
                    <p className="text-sm text-gray-600 mt-1">Create and start immediately</p>
                  </button>

                  <button
                    onClick={() => setSendMode('schedule')}
                    className={`text-left p-4 border rounded-xl transition ${
                      sendMode === 'schedule' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Schedule</p>
                    <p className="text-sm text-gray-600 mt-1">Send later at selected date/time</p>
                  </button>
                </div>

                {sendMode === 'schedule' && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Schedule date & time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <p><span className="font-semibold">Campaign:</span> {campaignName || '—'}</p>
                  <p><span className="font-semibold">Template:</span> {templates.find((t) => t._id === selectedTemplateId)?.name || '—'}</p>
                  <p><span className="font-semibold">Audience:</span> {selectedContacts.length} contacts</p>
                  <p><span className="font-semibold">Mode:</span> {sendMode === 'now' ? 'Send Now' : `Schedule (${scheduledAt || 'not set'})`}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => (step === 1 ? router.push(`/projects/${projectId}/campaigns`) : prev())}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            onClick={next}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={submitCampaign}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : sendMode === 'now' ? 'Submit & Send' : 'Submit Campaign'}
          </button>
        )}
      </div>
    </div>
  );
}
