'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Edit, Trash2, Plus, X } from 'lucide-react';
import { API_URL } from '@/lib/config/api';
import { ErrorToast } from '@/components/ErrorToast';
import {
  fetchPlanCatalog,
  PRODUCT_LINE_LABELS,
  type CatalogFeature,
  type CatalogLimit,
  type MessageChargeField,
  type ProductLine,
} from '@/lib/pricing/planCatalog';

type AdminPlan = {
  _id: string;
  planId?: string;
  name: string;
  productLine?: ProductLine;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  setupFee: number;
  signupCredits: number;
  monthlyCredits: number;
  sortOrder?: number;
  isActive: boolean;
  isPopular: boolean;
  publishedToPublic: boolean;
  limits?: Record<string, number | null>;
  entitlements?: Record<string, boolean>;
  messageCharges?: Record<string, number | null>;
};

type ViewState = 'list' | 'form';

function mapEntitlements(raw: unknown): Record<string, boolean | string> {
  if (!raw || typeof raw !== 'object') return {};
  if (raw instanceof Map) return Object.fromEntries(raw) as Record<string, boolean | string>;
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => {
      if (typeof v === 'string') return [k, v];
      return [k, v === true];
    })
  );
}

function mapLimits(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) out[k] = '';
    else out[k] = String(v);
  }
  return out;
}

const emptyForm = () => ({
  name: '',
  description: '',
  monthlyPrice: '',
  yearlyPrice: '',
  setupFee: '0',
  signupCredits: '0',
  monthlyCredits: '0',
  sortOrder: '0',
  isActive: true,
  isPopular: false,
  publishedToPublic: true,
});

import { CatalogManager } from './CatalogManager';

export function PlanAdminEditor() {
  const [productLine, setProductLine] = useState<ProductLine>('whatsapp');
  const [view, setView] = useState<ViewState>('list');
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [catalog, setCatalog] = useState<{
    limits: CatalogLimit[];
    features: CatalogFeature[];
    messageCharges: MessageChargeField[];
    defaultMessageCharges: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [showDetails, setShowDetails] = useState<AdminPlan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [entitlements, setEntitlements] = useState<Record<string, boolean | string>>({});
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [messageCharges, setMessageCharges] = useState<Record<string, string>>({});

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const fetchPlans = useCallback(async () => {
    const t = token();
    if (!t) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/pricing/admin/plans`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (res.ok) {
        const list = (data.data?.data || data.data || []) as AdminPlan[];
        setPlans(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async (line: ProductLine) => {
    const t = token();
    if (!t) return;
    try {
      const cat = await fetchPlanCatalog(line, t);
      setCatalog({
        limits: cat.limits,
        features: cat.features,
        messageCharges: cat.messageCharges || [],
        defaultMessageCharges: cat.defaultMessageCharges || {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature catalog');
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    loadCatalog(productLine);
  }, [fetchPlans, loadCatalog, productLine]);

  const filteredPlans = useMemo(
    () => plans.filter((p) => (p.productLine || 'whatsapp') === productLine),
    [plans, productLine]
  );

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm());
    setEntitlements({});
    const lim: Record<string, string> = {};
    catalog?.limits.forEach((l) => {
      lim[l.key] = '';
    });
    setLimits(lim);
    const mc: Record<string, string> = {};
    (catalog?.messageCharges || []).forEach((row) => {
      const def = catalog?.defaultMessageCharges?.[row.key];
      mc[row.key] = def !== undefined ? String(def) : '';
    });
    setMessageCharges(mc);
    setView('form');
  };

  const openEdit = (plan: AdminPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: String(plan.monthlyPrice),
      yearlyPrice: String(plan.yearlyPrice),
      setupFee: String(plan.setupFee ?? 0),
      signupCredits: String(plan.signupCredits ?? 0),
      monthlyCredits: String(plan.monthlyCredits ?? 0),
      sortOrder: String(plan.sortOrder ?? 0),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      publishedToPublic: plan.publishedToPublic,
    });
    setEntitlements(mapEntitlements(plan.entitlements));
    setLimits(mapLimits(plan.limits));
    const mc: Record<string, string> = {};
    (catalog?.messageCharges || []).forEach((row) => {
      const v = plan.messageCharges?.[row.key];
      if (v !== null && v !== undefined) mc[row.key] = String(v);
      else {
        const def = catalog?.defaultMessageCharges?.[row.key];
        mc[row.key] = def !== undefined ? String(def) : '';
      }
    });
    setMessageCharges(mc);
    setView('form');
  };

  const toggleFeature = (key: string) => {
    setEntitlements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.monthlyPrice || !form.yearlyPrice) {
      setError('Name and prices are required');
      return;
    }
    const t = token();
    if (!t) return;

    const limitsPayload: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(limits)) {
      const trimmed = v.trim();
      limitsPayload[k] = trimmed === '' ? null : parseInt(trimmed, 10);
    }

    const messageChargesPayload: Record<string, number | null> = {};
    for (const row of catalog?.messageCharges || []) {
      const trimmed = (messageCharges[row.key] ?? '').trim();
      messageChargesPayload[row.key] =
        trimmed === '' ? null : parseFloat(trimmed);
    }

    const payload = {
      name: form.name.trim(),
      productLine,
      monthlyPrice: parseInt(form.monthlyPrice, 10),
      yearlyPrice: parseInt(form.yearlyPrice, 10),
      setupFee: parseInt(form.setupFee || '0', 10),
      signupCredits: parseInt(form.signupCredits || '0', 10),
      monthlyCredits: parseInt(form.monthlyCredits || '0', 10),
      sortOrder: parseInt(form.sortOrder || '0', 10),
      description: form.description,
      isActive: form.isActive,
      isPopular: form.isPopular,
      publishedToPublic: form.publishedToPublic,
      limits: limitsPayload,
      entitlements,
      messageCharges: messageChargesPayload,
    };

    try {
      setLoading(true);
      const url = editingPlan
        ? `${API_URL}/pricing/admin/plans/${editingPlan._id}`
        : `${API_URL}/pricing/admin/plans`;
      const res = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(editingPlan ? 'Plan updated' : 'Plan created');
        setView('list');
        setEditingPlan(null);
        await fetchPlans();
        setTimeout(() => setSuccess(null), 2500);
      } else {
        setError(data.message || 'Failed to save plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    const t = token();
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/pricing/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setSuccess('Plan deleted');
        await fetchPlans();
      }
    } catch {
      setError('Delete failed');
    }
  };

  if (view === 'form') {
    const featuresByCategory = (catalog?.features || []).reduce<Record<string, CatalogFeature[]>>(
      (acc, f) => {
        (acc[f.category] ||= []).push(f);
        return acc;
      },
      {}
    );

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => setView('list')}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to plans
          </button>
          <h2 className="text-xl font-bold">
            {editingPlan ? 'Edit' : 'Create'} {PRODUCT_LINE_LABELS[productLine]} plan
          </h2>

          <form onSubmit={savePlan} className="mt-6 space-y-8 rounded-xl border bg-white p-6 shadow-sm">
            <section className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Plan name</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Description</span>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Monthly price (INR)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.monthlyPrice}
                  onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Yearly price (INR)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.yearlyPrice}
                  onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Setup fee</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.setupFee}
                  onChange={(e) => setForm({ ...form, setupFee: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Sort order</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Signup credits</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.signupCredits}
                  onChange={(e) => setForm({ ...form, signupCredits: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Monthly credits</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.monthlyCredits}
                  onChange={(e) => setForm({ ...form, monthlyCredits: e.target.value })}
                />
              </label>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Usage limits</h3>
              <p className="mt-1 text-xs text-gray-500">Leave blank for unlimited</p>
              {productLine === 'healthcare' ? (
                <div className="mt-4 space-y-6">
                  {(
                    [
                      { title: 'Clinic', line: 'healthcare' as ProductLine },
                      { title: 'WhatsApp', line: 'whatsapp' as ProductLine },
                    ] as const
                  ).map((group) => (
                    <div key={group.line}>
                      <p className="text-xs font-semibold uppercase text-gray-400">{group.title}</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {(catalog?.limits || [])
                          .filter((lim) => lim.productLine === group.line)
                          .map((lim) => (
                            <label key={lim.key} className="block">
                              <span className="text-sm text-gray-700">{lim.label}</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="Unlimited"
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                                value={limits[lim.key] ?? ''}
                                onChange={(e) => setLimits({ ...limits, [lim.key]: e.target.value })}
                              />
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(catalog?.limits || []).map((lim) => (
                    <label key={lim.key} className="block">
                      <span className="text-sm text-gray-700">{lim.label}</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                        value={limits[lim.key] ?? ''}
                        onChange={(e) => setLimits({ ...limits, [lim.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>

            {(catalog?.messageCharges?.length ?? 0) > 0 ? (
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Message charges (INR per message)
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Meta pass-through rates shown on public pricing. Leave blank to use platform defaults.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {catalog.messageCharges.map((row) => (
                    <label key={row.key} className="block">
                      <span className="text-sm text-gray-700">{row.label}</span>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.0001"
                          placeholder={
                            catalog.defaultMessageCharges[row.key] !== undefined
                              ? String(catalog.defaultMessageCharges[row.key])
                              : '0'
                          }
                          className="w-full rounded-lg border py-2 pl-7 pr-3"
                          value={messageCharges[row.key] ?? ''}
                          onChange={(e) =>
                            setMessageCharges({ ...messageCharges, [row.key]: e.target.value })
                          }
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Features included</h3>
              {productLine === 'healthcare' ? (
                <p className="mt-1 text-xs text-gray-500">
                  Includes clinic modules and WhatsApp messaging features.
                </p>
              ) : null}
              <div className="mt-4 space-y-6">
                {Object.entries(featuresByCategory).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase text-gray-400">{category}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {items.map((f) => (
                        <label
                          key={f.key}
                          className={`flex ${f.type === 'text' ? 'flex-col items-start gap-1' : 'cursor-pointer items-center gap-2'} rounded-lg border px-3 py-2 hover:bg-gray-50`}
                        >
                          {f.type === 'text' ? (
                            <>
                              <span className="text-xs text-gray-500">{f.label}</span>
                              <input
                                type="text"
                                className="w-full rounded border px-2 py-1 text-sm"
                                placeholder="Text value..."
                                value={(typeof entitlements[f.key] === 'string' ? entitlements[f.key] : '') as string}
                                onChange={(e) => setEntitlements(prev => ({ ...prev, [f.key]: e.target.value }))}
                              />
                            </>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={!!entitlements[f.key]}
                                onChange={() => toggleFeature(f.key)}
                              />
                              <span className="text-sm text-gray-800">{f.label}</span>
                            </>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                />
                Popular badge
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.publishedToPublic}
                  onChange={(e) => setForm({ ...form, publishedToPublic: e.target.checked })}
                />
                Show on public pricing
              </label>
            </section>

            <div className="flex gap-3 border-t pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : editingPlan ? 'Update plan' : 'Create plan'}
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className="rounded-lg border px-5 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="fixed top-4 right-4 z-50 rounded border border-green-300 bg-green-100 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pricing plans</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create plans per product line, toggle features, and set usage limits for route gating.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCatalogManager(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Manage Catalog
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create plan
            </button>
          </div>
        </div>

        {showCatalogManager && (
          <CatalogManager
            productLine={productLine}
            catalog={catalog}
            onClose={() => setShowCatalogManager(false)}
            onCatalogChanged={() => loadCatalog(productLine)}
          />
        )}

        <div className="mb-6 inline-flex border border-gray-300 bg-white shadow-sm">
          {(['whatsapp', 'healthcare'] as ProductLine[]).map((line) => (
            <button
              key={line}
              type="button"
              onClick={() => setProductLine(line)}
              className={`border-r border-gray-300 px-4 py-2 text-sm font-semibold transition last:border-r-0 ${
                productLine === line ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {PRODUCT_LINE_LABELS[line]}
            </button>
          ))}
        </div>

        {showDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{showDetails.name}</h2>
                <button type="button" onClick={() => setShowDetails(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(showDetails, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Yearly</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !filteredPlans.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No plans for {PRODUCT_LINE_LABELS[productLine]}. Create one.
                  </td>
                </tr>
              ) : null}
              {filteredPlans.map((plan) => (
                <tr key={plan._id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {plan.name}
                    {plan.isPopular ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        POPULAR
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">₹{plan.monthlyPrice}</td>
                  <td className="px-4 py-3">₹{plan.yearlyPrice}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {plan.publishedToPublic ? (
                      <span className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        Public
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowDetails(plan)} title="View">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                      <button type="button" onClick={() => openEdit(plan)} title="Edit">
                        <Edit className="h-4 w-4 text-blue-600" />
                      </button>
                      <button type="button" onClick={() => deletePlan(plan._id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
