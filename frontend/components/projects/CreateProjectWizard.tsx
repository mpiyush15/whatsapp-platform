'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Stethoscope,
  ShoppingBag,
  MessageCircle,
  FlaskConical,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PROJECT_PRESETS, type ProjectPreset } from '@/lib/projectPresets';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

type CreateProjectWizardProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { projectId: string; name: string; vertical?: string }, redirectPath: string) => void;
  getAuthHeaders: () => Record<string, string>;
};

const VERTICAL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-5 h-5 text-teal-600" />,
  healthcare: <Stethoscope className="w-5 h-5 text-emerald-600" />,
  ecommerce: <ShoppingBag className="w-5 h-5 text-violet-600" />,
  pathology: <FlaskConical className="w-5 h-5 text-sky-600" />,
};

export default function CreateProjectWizard({
  open,
  onClose,
  onCreated,
  getAuthHeaders,
}: CreateProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [presets, setPresets] = useState<ProjectPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || null;

  const reset = useCallback(() => {
    setStep(1);
    setName('');
    setSelectedPresetId(null);
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    const load = async () => {
      setLoadingPresets(true);
      try {
        const res = await fetch(`${API_URL}/projects/presets/list`, { headers: getAuthHeaders() });
        if (res.ok) {
          const json = await res.json();
          const list: ProjectPreset[] = json.data?.presets || [];
          if (list.length) {
            setPresets(list);
            setSelectedPresetId(list[0].id);
          } else {
            setPresets([...PROJECT_PRESETS]);
            setSelectedPresetId(PROJECT_PRESETS[0].id);
          }
        } else {
          setPresets([...PROJECT_PRESETS]);
          setSelectedPresetId(PROJECT_PRESETS[0].id);
          setError('Could not load types from server — showing defaults.');
        }
      } catch {
        setPresets([...PROJECT_PRESETS]);
        setSelectedPresetId(PROJECT_PRESETS[0].id);
        setError('Could not load types from server — showing defaults.');
      } finally {
        setLoadingPresets(false);
      }
    };
    load();
  }, [open, getAuthHeaders, reset]);

  if (!open) return null;

  const canNextFromStep1 = name.trim().length >= 2;
  const canSubmit = canNextFromStep1 && selectedPresetId;

  const handleCreate = async () => {
    if (!canSubmit || !selectedPreset) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          vertical: selectedPreset.vertical,
          presetId: selectedPreset.id,
          clinicType: selectedPreset.clinicType,
          labType: selectedPreset.labType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create project');
        return;
      }
      const redirectPath = json.data?.redirectPath || `/projects/${json.data?.projectId}`;
      onCreated(
        {
          projectId: json.data.projectId,
          name: json.data.name,
          vertical: json.data.vertical,
        },
        redirectPath,
      );
      onClose();
    } catch {
      setError('Network error while creating project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-wizard-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 id="create-project-wizard-title" className="text-xl font-bold text-gray-900">
              Create project
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${step >= n ? 'bg-teal-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Name your project</h3>
              <p className="text-sm text-gray-600 mb-4">
                One project maps to one WhatsApp Business number (e.g. clinic or brand name).
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Care Clinic"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose project type</h3>
              <p className="text-sm text-gray-600 mb-4">
                This sets modules, home screen, and onboarding checklist.
              </p>
              {loadingPresets ? (
                <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading presets…
                </div>
              ) : presets.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No project types available.</p>
              ) : (
                <div className="space-y-3">
                  {presets.map((preset) => {
                    const selected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                          selected
                            ? 'border-teal-600 bg-teal-50/50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-white border border-gray-100">
                            {VERTICAL_ICONS[preset.vertical] || VERTICAL_ICONS.whatsapp}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-gray-900">{preset.label}</span>
                              {selected && <Check className="w-5 h-5 text-teal-600 shrink-0" />}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                            {preset.features?.length ? (
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {preset.features.slice(0, 4).map((f) => (
                                  <li
                                    key={f}
                                    className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                                  >
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedPreset && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & create</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Project name</dt>
                  <dd className="font-medium text-gray-900 text-right">{name.trim()}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900 text-right">{selectedPreset.label}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Vertical</dt>
                  <dd className="font-medium text-gray-900 text-right capitalize">
                    {selectedPreset.vertical}
                  </dd>
                </div>
              </dl>
              {selectedPreset.vertical === 'healthcare' && (
                <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                  <p className="font-medium mb-1">Healthcare onboarding</p>
                  <p>
                    After create you&apos;ll land on the healthcare hub. Connect WhatsApp, install the
                    template pack, and submit templates to Meta for this clinic&apos;s WABA.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !selectedPresetId)}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={handleCreate} disabled={submitting || !canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create project'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
