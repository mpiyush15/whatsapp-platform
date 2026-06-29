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

  const steps = [
    { num: 1, title: 'Name Workspace', description: 'Basic details' },
    { num: 2, title: 'Select Type', description: 'Industry modules' },
    { num: 3, title: 'Review', description: 'Confirm & create' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-content-in">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] md:h-[600px] overflow-hidden flex flex-col md:flex-row relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-wizard-title"
      >
        {/* Left Column: Timeline Stepper */}
        <div className="w-full md:w-[280px] bg-stone-50 border-b md:border-b-0 md:border-r border-gray-200 p-6 md:p-8 flex flex-col shrink-0">
          <h2 id="create-project-wizard-title" className="text-xl font-bold text-gray-900 mb-8 hidden md:block">
            Setup Workspace
          </h2>
          
          <div className="relative flex-1">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute left-4 top-4 bottom-8 w-0.5 bg-gray-200"></div>
            
            <ul className="flex md:flex-col justify-between md:justify-start md:space-y-8 relative z-10">
              {steps.map(s => {
                const isActive = step === s.num;
                const isCompleted = step > s.num;
                
                return (
                  <li key={s.num} className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 transition-colors z-10
                      ${isCompleted ? 'bg-teal-600 border-teal-600 text-white' : 
                        isActive ? 'bg-white border-teal-600 text-teal-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{s.num}</span>}
                    </div>
                    <div className="text-center md:text-left">
                      <p className={`font-bold text-xs md:text-sm ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>{s.title}</p>
                      <p className="text-[10px] md:text-xs text-gray-500 hidden md:block">{s.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="max-w-md mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Name your workspace</h3>
                <p className="text-sm text-gray-500 mb-8">
                  This helps identify your business or department. One workspace typically maps to one WhatsApp Business number.
                </p>
                <div className="space-y-2">
                  <label htmlFor="workspace-name" className="block text-sm font-bold text-gray-700">Workspace Name</label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. City Care Clinic"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-2xl mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose workspace type</h3>
                <p className="text-sm text-gray-500 mb-8">
                  This pre-configures your modules, dashboard layout, and intelligent chatbot flows for your specific industry.
                </p>
                
                {loadingPresets ? (
                  <div className="flex items-center gap-3 text-gray-500 py-12 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span className="font-medium">Loading industry templates...</span>
                  </div>
                ) : presets.length === 0 ? (
                  <p className="text-sm text-gray-500 py-12 text-center">No industry templates available.</p>
                ) : (
                  <div className="grid gap-4">
                    {presets.map((preset) => {
                      const selected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPresetId(preset.id)}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden ${
                            selected
                              ? 'border-teal-500 bg-gradient-to-br from-teal-50/80 to-white shadow-lg shadow-teal-100/50'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white hover:bg-stone-50'
                          }`}
                        >
                          {/* Active edge indicator */}
                          {selected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500 rounded-l-2xl"></div>}
                          
                          <div className="flex items-start gap-5 relative z-10">
                            {/* Icon Box */}
                            <div className={`mt-0.5 p-4 rounded-xl border transition-all duration-300 ${
                              selected 
                                ? 'bg-teal-50 border-teal-200 shadow-md shadow-teal-100/50 scale-105' 
                                : 'bg-white border-gray-200 text-gray-500 group-hover:scale-105'
                            }`}>
                              {VERTICAL_ICONS[preset.vertical] || VERTICAL_ICONS.whatsapp}
                            </div>
                            
                            <div className="flex-1 min-w-0 py-1">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className={`text-lg font-bold tracking-tight transition-colors ${
                                  selected ? 'text-teal-900' : 'text-gray-900'
                                }`}>
                                  {preset.label}
                                </span>
                                {selected && (
                                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 shadow-sm">
                                    <Check className="w-3.5 h-3.5 text-teal-700" />
                                  </div>
                                )}
                              </div>
                              
                              <p className={`text-sm leading-relaxed transition-colors ${
                                selected ? 'text-teal-800/80' : 'text-gray-500'
                              }`}>
                                {preset.description}
                              </p>
                              
                              {preset.features?.length ? (
                                <ul className="mt-4 flex flex-wrap gap-2">
                                  {preset.features.slice(0, 4).map((f) => (
                                    <li
                                      key={f}
                                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                        selected 
                                          ? 'bg-white border border-teal-200 text-teal-700 shadow-sm' 
                                          : 'bg-gray-100/80 border border-transparent text-gray-600 group-hover:bg-white group-hover:border-gray-200'
                                      }`}
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
              <div className="max-w-md mt-4">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 border border-teal-100">
                  <Check className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & create</h3>
                <p className="text-sm text-gray-500 mb-8">
                  Confirm your workspace details. You can configure WhatsApp and invite team members after creation.
                </p>
                
                <div className="bg-stone-50 rounded-2xl border border-gray-200 p-1 divide-y divide-gray-200/60">
                  <div className="p-4 flex justify-between items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">Workspace name</span>
                    <span className="font-bold text-gray-900 text-right">{name.trim()}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">Industry template</span>
                    <span className="font-bold text-gray-900 text-right">{selectedPreset.label}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">Vertical</span>
                    <span className="font-bold text-gray-900 text-right capitalize">
                      {selectedPreset.vertical}
                    </span>
                  </div>
                </div>

                {selectedPreset.vertical === 'healthcare' && (
                  <div className="mt-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                    <p className="font-bold mb-1 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Healthcare Onboarding</p>
                    <p className="text-emerald-800/80 leading-relaxed">
                      After creation, you'll land on the healthcare hub. Connect WhatsApp, install the clinic template pack, and submit templates to Meta for this WABA.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between px-6 md:px-10 py-5 border-t border-gray-100 bg-white shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              disabled={submitting}
              className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {step > 1 && <ArrowLeft className="w-4 h-4" />}
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !selectedPresetId)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleCreate} 
                disabled={submitting || !canSubmit}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(13,148,136,0.3)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.4)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Workspace…
                  </>
                ) : (
                  <>
                    Create Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
