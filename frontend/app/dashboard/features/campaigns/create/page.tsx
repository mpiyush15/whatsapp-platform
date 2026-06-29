'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorToast } from '@/components/ErrorToast';
import { authService } from '@/lib/auth';
import { CampaignType, CampaignStatus, CampaignTargetType, CampaignTriggerType } from '@/lib/enums';

interface CampaignData {
  name: string;
  description: string;
  type: CampaignType;
  audience: {
    type: CampaignTargetType;
    segmentIds: string[];
    customFilters: {
      tags: string[];
      attributes: Record<string, any>;
      excludeUnsubscribed: boolean;
    };
    estimatedReach: number;
  };
  message: {
    type: 'text' | 'template' | 'media' | 'interactive';
    content: string;
    templateId?: string;
    templateName?: string;
    variables: string[];
    mediaUrls: string[];
    mediaType?: string;
    buttons: Array<{
      text: string;
      type: 'call' | 'url' | 'quickreply';
      value: string;
    }>;
  };
  scheduling: {
    sendNow: boolean;
    startDate?: string;
    endDate?: string;
    timezone: string;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    deliveryTime?: string;
    daysOfWeek?: number[];
  };
  abTest: {
    enabled: boolean;
    variants: Array<{
      id: string;
      name: string;
      message: any;
      splitPercentage: number;
    }>;
    winnerCriteria?: 'clicks' | 'conversions' | 'engagement' | 'opens';
    testDurationDays?: number;
  };
  automation: {
    enabled: boolean;
    triggers: Array<{
      type: CampaignTriggerType;
      condition: Record<string, any>;
    }>;
    workflow: Array<{
      stepId: string;
      delayHours: number;
      message: any;
      conditions: Array<Record<string, any>>;
    }>;
  };
}

const INITIAL_CAMPAIGN: CampaignData = {
  name: '',
  description: '',
  type: CampaignType.BROADCAST,
  audience: {
    type: CampaignTargetType.ALL,
    segmentIds: [],
    customFilters: {
      tags: [],
      attributes: {},
      excludeUnsubscribed: true
    },
    estimatedReach: 0
  },
  message: {
    type: 'text',
    content: '',
    variables: [],
    mediaUrls: [],
    buttons: []
  },
  scheduling: {
    sendNow: true,
    timezone: 'Asia/Kolkata',
    frequency: 'once'
  },
  abTest: {
    enabled: false,
    variants: []
  },
  automation: {
    enabled: false,
    triggers: [],
    workflow: []
  }
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const user = authService.getCurrentUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [campaign, setCampaign] = useState<CampaignData>(INITIAL_CAMPAIGN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableSegments, setAvailableSegments] = useState<Array<{id: string; name: string; count: number}>>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [buttonUrlParam, setButtonUrlParam] = useState('');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Fetch initial data on component mount
  useEffect(() => {
    if (!user?.accountId) return;

    const fetchInitialData = async () => {
      try {
        const token = authService.getToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [segmentsRes, templatesRes, mediaRes] = await Promise.allSettled([
          fetch(`/api/campaigns/segments`, { headers }),
          fetch(`/api/templates`, { headers }),
          fetch(`/api/media-library`, { headers })
        ]);

        if (segmentsRes.status === 'fulfilled' && segmentsRes.value.ok) {
          const data = await segmentsRes.value.json();
          setAvailableSegments(data.segments || []);
        }
        if (templatesRes.status === 'fulfilled' && templatesRes.value.ok) {
          const data = await templatesRes.value.json();
          const rows = data.data?.templates || data.templates || (Array.isArray(data) ? data : []);
          setTemplates((rows || []).map((t: any) => ({
            _id: t._id,
            name: t.name || t.templateName || 'Untitled Template',
            variableConfig: t.variableConfig || [],
          })));
        }
        if (mediaRes.status === 'fulfilled' && mediaRes.value.ok) {
          const data = await mediaRes.value.json();
          setMediaList(data.media || []);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };

    fetchInitialData();
  }, [user?.accountId]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const updateCampaign = (updates: Partial<CampaignData>) => {
    setCampaign(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!campaign.name.trim()) errors.name = 'Campaign name is required';
        if (campaign.name.length < 3) errors.name = 'Campaign name must be at least 3 characters';
        if (campaign.name.length > 100) errors.name = 'Campaign name must be less than 100 characters';
        break;

      case 2: // Audience
        if (campaign.audience.type === 'segment' && campaign.audience.segmentIds.length === 0) {
          errors.audience = 'Please select at least one segment';
        }
        break;

      case 3: // Message
        if (!campaign.message.content.trim()) {
          errors.message = 'Message content is required';
        }
        if (campaign.message.content.length > 1000) {
          errors.message = 'Message must be less than 1000 characters';
        }
        break;

      case 4: // Scheduling
        if (!campaign.scheduling.sendNow) {
          if (!campaign.scheduling.startDate) {
            errors.startDate = 'Start date is required for scheduled campaigns';
          }
        }
        break;

      case 5: // A/B Testing
        if (campaign.abTest.enabled) {
          if (campaign.abTest.variants.length < 2) {
            errors.variants = 'A/B testing requires at least 2 variants';
          }
          if (!campaign.abTest.winnerCriteria) {
            errors.winnerCriteria = 'Please select a winner criteria';
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, 6));
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    try {
      setLoading(true);
      setError('');

      const token = authService.getToken();
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(campaign)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const result = await response.json();
      router.push(`/dashboard/campaigns/${result.campaign._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Campaign name and type' },
    { number: 2, title: 'Audience', description: 'Target your recipients' },
    { number: 3, title: 'Message', description: 'Compose your message' },
    { number: 4, title: 'Scheduling', description: 'Set timing and frequency' },
    { number: 5, title: 'A/B Testing', description: 'Test variations' },
    { number: 6, title: 'Review', description: 'Confirm and create' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
          <p className="mt-2 text-gray-600">Follow the steps to create a new campaign</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                      step.number === currentStep
                        ? 'bg-green-600 text-white'
                        : step.number < currentStep
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {step.number < currentStep ? '✓' : step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step.number < currentStep
                          ? 'bg-green-600'
                          : 'bg-gray-200'
                      }`}
                    ></div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-2">
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {currentStep === 1 && <Step1BasicInfo campaign={campaign} setCampaign={updateCampaign} errors={validationErrors} />}
          {currentStep === 2 && <Step2Audience campaign={campaign} setCampaign={updateCampaign} errors={validationErrors} segments={availableSegments} />}
          {currentStep === 3 && <Step3Message 
            campaign={campaign} 
            setCampaign={updateCampaign} 
            errors={validationErrors}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            templateVariables={templateVariables}
            setTemplateVariables={setTemplateVariables}
            headerMediaUrl={headerMediaUrl}
            setHeaderMediaUrl={setHeaderMediaUrl}
            buttonUrlParam={buttonUrlParam}
            setButtonUrlParam={setButtonUrlParam}
            mediaList={mediaList}
            isUploadingMedia={isUploadingMedia}
            setIsUploadingMedia={setIsUploadingMedia}
          />}
          {currentStep === 4 && <Step4Scheduling campaign={campaign} setCampaign={updateCampaign} errors={validationErrors} />}
          {currentStep === 5 && <Step5ABTesting campaign={campaign} setCampaign={updateCampaign} errors={validationErrors} />}
          {currentStep === 6 && <Step6Review campaign={campaign} />}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          {currentStep < 6 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creating...
                </>
              ) : (
                '✓ Create Campaign'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// STEP 1: Basic Info
function Step1BasicInfo({
  campaign,
  setCampaign,
  errors
}: {
  campaign: CampaignData;
  setCampaign: (updates: Partial<CampaignData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={campaign.name}
          onChange={(e) => setCampaign({ name: e.target.value })}
          placeholder="e.g., Summer Sale 2026"
          className={`w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Description
        </label>
        <textarea
          value={campaign.description}
          onChange={(e) => setCampaign({ description: e.target.value })}
          placeholder="What is this campaign about?"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Campaign Type *
        </label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'broadcast', label: '📢 Broadcast', desc: 'Send once to all' },
            { value: 'drip', label: '💧 Drip', desc: 'Series over time' },
            { value: 'automation', label: '⚙️ Automation', desc: 'Trigger-based' },
            { value: 'ab-test', label: '🧪 A/B Test', desc: 'Test variants' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setCampaign({ type: type.value as any })}
              className={`p-4 border-2 rounded-lg text-left transition ${
                campaign.type === type.value
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              <p className="font-semibold text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-600">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// STEP 2: Audience
function Step2Audience({
  campaign,
  setCampaign,
  errors,
  segments = []
}: {
  campaign: CampaignData;
  setCampaign: (updates: Partial<CampaignData>) => void;
  errors: Record<string, string>;
  segments?: Array<{id: string; name: string; count: number}>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Audience Type *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'all', label: 'All Contacts', desc: 'Everyone' },
            { value: 'segment', label: 'Segments', desc: 'By segment' },
            { value: 'custom', label: 'Custom Filters', desc: 'Advanced' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() =>
                setCampaign({
                  audience: { ...campaign.audience, type: type.value as any }
                })
              }
              className={`p-4 border-2 rounded-lg text-left transition ${
                campaign.audience.type === type.value
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              <p className="font-semibold text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-600">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {campaign.audience.type === 'segment' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-4">
            Select Segments
          </label>
          {segments && segments.length > 0 ? (
            <div className="space-y-2">
              {segments.map((segment) => (
                <label key={segment.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={campaign.audience.segmentIds.includes(segment.id)}
                    onChange={(e) => {
                      const segmentIds = e.target.checked
                        ? [...campaign.audience.segmentIds, segment.id]
                        : campaign.audience.segmentIds.filter((s) => s !== segment.id);
                      setCampaign({
                        audience: { ...campaign.audience, segmentIds }
                      });
                    }}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium">{segment.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({segment.count} contacts)</span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
              📝 No segments found. Add tags to your contacts to create segments.
            </div>
          )}
          {errors.audience && <p className="mt-2 text-sm text-red-600">{errors.audience}</p>}
        </div>
      )}

      {campaign.audience.type === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Custom Tags (comma-separated)
          </label>
          <input
            type="text"
            defaultValue={campaign.audience.customFilters.tags.join(', ')}
            onChange={(e) =>
              setCampaign({
                audience: {
                  ...campaign.audience,
                  customFilters: {
                    ...campaign.audience.customFilters,
                    tags: e.target.value.split(',').map((t) => t.trim())
                  }
                }
              })
            }
            placeholder="e.g., premium, bulk-buyer, vip"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          />
          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={campaign.audience.customFilters.excludeUnsubscribed}
              onChange={(e) =>
                setCampaign({
                  audience: {
                    ...campaign.audience,
                    customFilters: {
                      ...campaign.audience.customFilters,
                      excludeUnsubscribed: e.target.checked
                    }
                  }
                })
              }
            />
            <span className="text-gray-700">Exclude unsubscribed contacts</span>
          </label>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Estimated Reach:</strong> {campaign.audience.estimatedReach} contacts
        </p>
      </div>
    </div>
  );
}

// STEP 3: Message
function Step3Message({
  campaign,
  setCampaign,
  errors,
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  templateVariables,
  setTemplateVariables,
  headerMediaUrl,
  setHeaderMediaUrl,
  buttonUrlParam,
  setButtonUrlParam,
  mediaList,
  isUploadingMedia,
  setIsUploadingMedia
}: {
  campaign: CampaignData;
  setCampaign: (updates: Partial<CampaignData>) => void;
  errors: Record<string, string>;
  templates: any[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  templateVariables: string[];
  setTemplateVariables: (vars: string[]) => void;
  headerMediaUrl: string;
  setHeaderMediaUrl: (url: string) => void;
  buttonUrlParam: string;
  setButtonUrlParam: (param: string) => void;
  mediaList: any[];
  isUploadingMedia: boolean;
  setIsUploadingMedia: (val: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Message Type
        </label>
        <select
          value={campaign.message.type}
          onChange={(e) =>
            setCampaign({
              message: { ...campaign.message, type: e.target.value as any }
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
        >
          <option value="text">Text Message</option>
          <option value="template">Template</option>
          <option value="media">Media (Image/Video)</option>
          <option value="interactive">Interactive (Buttons)</option>
        </select>
      </div>

      {campaign.message.type !== 'template' && (
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Message Content *
        </label>
        <textarea
          value={campaign.message.content}
          onChange={(e) =>
            setCampaign({
              message: { ...campaign.message, content: e.target.value }
            })
          }
          placeholder="Write your message here..."
          rows={6}
          className={`w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors.message ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <div className="mt-2 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {campaign.message.content.length} / 1000 characters
          </p>
          {errors.message && <p className="text-sm text-red-600">{errors.message}</p>}
        </div>
      </div>
      )}

      {campaign.message.type === 'template' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Select Template *</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const tmpId = e.target.value;
                setSelectedTemplateId(tmpId);
                const tmp = templates.find(t => t._id === tmpId);
                if (tmp) {
                  setCampaign({ message: { ...campaign.message, templateId: tmp._id, templateName: tmp.name, content: '' } });
                  setTemplateVariables(new Array(tmp.variableConfig?.length || 0).fill(''));
                } else {
                  setCampaign({ message: { ...campaign.message, templateId: '', templateName: '', content: '' } });
                  setTemplateVariables([]);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="">-- Choose a template --</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            {errors.templateId && <p className="mt-1 text-sm text-red-600">{errors.templateId}</p>}
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
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="e.g. 30 June or {{name}}"
                    />
                    <div className="flex gap-1">
                      {['{{name}}', '{{phone}}', '{{email}}'].map(tag => (
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
                <p className="text-xs text-gray-500 mb-2">If your template has a media header (Image, Video, Document), you can override it here. E.g., {'{{invoice_url}}'} to map a dynamic URL per contact, or select a file from your Media Library.</p>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Dynamic Button URL Parameter (Optional)</label>
                <p className="text-xs text-gray-500 mb-2">If your template has a button with a dynamic URL suffix, map it here. (e.g. {'{{phone}}'} or {'some-id-123'})</p>
                <input
                  value={buttonUrlParam}
                  onChange={(e) => setButtonUrlParam(e.target.value)}
                  placeholder="e.g. {{phone}} or 12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {campaign.message.type === 'interactive' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-4">
            Add Buttons
          </label>
          <div className="space-y-3 mb-4">
            {campaign.message.buttons.map((button, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Button text"
                  value={button.text}
                  onChange={(e) => {
                    const buttons = [...campaign.message.buttons];
                    buttons[index].text = e.target.value;
                    setCampaign({ message: { ...campaign.message, buttons } });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
                <button
                  onClick={() => {
                    const buttons = campaign.message.buttons.filter((_, i) => i !== index);
                    setCampaign({ message: { ...campaign.message, buttons } });
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const buttons = [
                ...campaign.message.buttons,
                { text: '', type: 'quickreply' as const, value: '' }
              ];
              setCampaign({ message: { ...campaign.message, buttons } });
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            + Add Button
          </button>
        </div>
      )}
    </div>
  );
}

// STEP 4: Scheduling
function Step4Scheduling({
  campaign,
  setCampaign,
  errors
}: {
  campaign: CampaignData;
  setCampaign: (updates: Partial<CampaignData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={campaign.scheduling.sendNow}
            onChange={(e) =>
              setCampaign({
                scheduling: { ...campaign.scheduling, sendNow: e.target.checked }
              })
            }
          />
          <span className="text-gray-900 font-medium">Send immediately</span>
        </label>
      </div>

      {!campaign.scheduling.sendNow && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={campaign.scheduling.startDate || ''}
              onChange={(e) =>
                setCampaign({
                  scheduling: { ...campaign.scheduling, startDate: e.target.value }
                })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white text-gray-900 ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={campaign.scheduling.endDate || ''}
              onChange={(e) =>
                setCampaign({
                  scheduling: { ...campaign.scheduling, endDate: e.target.value }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Frequency
        </label>
        <select
          value={campaign.scheduling.frequency}
          onChange={(e) =>
            setCampaign({
              scheduling: { ...campaign.scheduling, frequency: e.target.value as any }
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
        >
          <option value="once">Send once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Timezone
        </label>
        <select
          value={campaign.scheduling.timezone}
          onChange={(e) =>
            setCampaign({
              scheduling: { ...campaign.scheduling, timezone: e.target.value }
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
        </select>
      </div>
    </div>
  );
}

// STEP 5: A/B Testing
function Step5ABTesting({
  campaign,
  setCampaign,
  errors
}: {
  campaign: CampaignData;
  setCampaign: (updates: Partial<CampaignData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={campaign.abTest.enabled}
            onChange={(e) =>
              setCampaign({
                abTest: { ...campaign.abTest, enabled: e.target.checked }
              })
            }
          />
          <span className="text-gray-900 font-medium">Enable A/B testing</span>
        </label>
      </div>

      {campaign.abTest.enabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Winner Criteria *
            </label>
            <select
              value={campaign.abTest.winnerCriteria || ''}
              onChange={(e) =>
                setCampaign({
                  abTest: { ...campaign.abTest, winnerCriteria: e.target.value as any }
                })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white text-gray-900 ${
                errors.winnerCriteria ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select criteria...</option>
              <option value="clicks">Most Clicks</option>
              <option value="conversions">Most Conversions</option>
              <option value="engagement">Best Engagement</option>
              <option value="opens">Most Opens</option>
            </select>
            {errors.winnerCriteria && (
              <p className="mt-1 text-sm text-red-600">{errors.winnerCriteria}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Test Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={campaign.abTest.testDurationDays || 7}
              onChange={(e) =>
                setCampaign({
                  abTest: {
                    ...campaign.abTest,
                    testDurationDays: parseInt(e.target.value)
                  }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              Note: Add variants in the message step for A/B testing
            </p>
            {errors.variants && <p className="text-sm text-red-600">{errors.variants}</p>}
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 A/B testing helps you optimize your campaigns. The winning variant will continue after the test period.
        </p>
      </div>
    </div>
  );
}

// STEP 6: Review
function Step6Review({ campaign }: { campaign: CampaignData }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Summary</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Campaign Name</p>
            <p className="font-semibold text-gray-900">{campaign.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-semibold text-gray-900 capitalize">{campaign.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Audience</p>
            <p className="font-semibold text-gray-900 capitalize">{campaign.audience.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estimated Reach</p>
            <p className="font-semibold text-gray-900">{campaign.audience.estimatedReach} contacts</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Message Type</p>
            <p className="font-semibold text-gray-900 capitalize">{campaign.message.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Scheduling</p>
            <p className="font-semibold text-gray-900">
              {campaign.scheduling.sendNow ? 'Send Now' : 'Scheduled'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Preview</h3>
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg max-w-sm">
          <p className="text-gray-900">{campaign.message.content}</p>
          {campaign.message.buttons.length > 0 && (
            <div className="mt-4 space-y-2">
              {campaign.message.buttons.map((button, index) => (
                <button
                  key={index}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled
                >
                  {button.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-700">
          ⚠️ Please review all details carefully before creating the campaign. Changes can be made after creation.
        </p>
      </div>
    </div>
  );
}
