'use client';

import { useState } from 'react';
import { Trash2, Plus, X, Edit } from 'lucide-react';
import { API_URL } from '@/lib/config/api';
import { type ProductLine } from '@/lib/pricing/planCatalog';

type CatalogManagerProps = {
  productLine: ProductLine;
  onClose: () => void;
  onCatalogChanged: () => void;
  catalog: any;
};

export function CatalogManager({ productLine, onClose, onCatalogChanged, catalog }: CatalogManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newField, setNewField] = useState({
    label: '',
    type: 'feature',
    category: 'General',
    unit: ''
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = token();
    if (!t) return;
    try {
      setLoading(true);
      setError(null);
      
      const key = newField.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      const url = editingKey 
        ? `${API_URL}/pricing/admin/catalog/${editingKey}`
        : `${API_URL}/pricing/admin/catalog`;
      
      const res = await fetch(url, {
        method: editingKey ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newField,
          key,
          productLine
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to ${editingKey ? 'update' : 'create'} field`);
      }
      
      setNewField({ label: '', type: 'feature', category: 'General', unit: '' });
      setEditingKey(null);
      onCatalogChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating field');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this field? It will be removed from all plans.')) return;
    const t = token();
    if (!t) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/pricing/admin/catalog/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete field');
      }
      
      onCatalogChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting field');
    } finally {
      setLoading(false);
    }
  };

  const dynamicLimits = (catalog?.limits || []).filter((l: any) => !l.isSystem);
  const dynamicFeatures = (catalog?.features || []).filter((f: any) => !f.isSystem);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Manage Dynamic Fields ({productLine})</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleCreate} className="mb-8 rounded-lg border bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingKey ? 'Edit Field' : 'Create New Field'}</h3>
            {editingKey && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingKey(null);
                  setNewField({ label: '', type: 'feature', category: 'General', unit: '' });
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Label</span>
              <input
                required
                className="mt-1 w-full rounded border p-2 text-sm"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="e.g. Max Posters"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Type</span>
              <select
                className="mt-1 w-full rounded border p-2 text-sm"
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
              >
                <option value="feature">Toggle Feature (Yes/No)</option>
                <option value="limit">Numeric Limit</option>
                <option value="text">Text Feature (e.g. Email/Dedicated)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Category Group</span>
              <input
                className="mt-1 w-full rounded border p-2 text-sm"
                value={newField.category}
                onChange={(e) => setNewField({ ...newField, category: e.target.value })}
                placeholder="e.g. Automation"
              />
            </label>
            {newField.type === 'limit' && (
              <label className="block">
                <span className="text-xs text-gray-600">Unit (optional)</span>
                <input
                  className="mt-1 w-full rounded border p-2 text-sm"
                  value={newField.unit}
                  onChange={(e) => setNewField({ ...newField, unit: e.target.value })}
                  placeholder="e.g. count, gb"
                />
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingKey ? 'Update Field' : 'Add Field'}
          </button>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Custom Features</h3>
          {dynamicFeatures.length === 0 ? (
            <p className="text-xs text-gray-500">No custom features added.</p>
          ) : (
            <ul className="divide-y rounded border">
              {dynamicFeatures.map((f: any) => (
                <li key={f.key} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium">{f.label}</p>
                    <p className="text-xs text-gray-500">Category: {f.category} | Key: {f.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingKey(f.key);
                        setNewField({ label: f.label, type: f.type || 'feature', category: f.category, unit: f.unit || '' });
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(f.key)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold">Custom Limits</h3>
          {dynamicLimits.length === 0 ? (
            <p className="text-xs text-gray-500">No custom limits added.</p>
          ) : (
            <ul className="divide-y rounded border">
              {dynamicLimits.map((l: any) => (
                <li key={l.key} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium">{l.label}</p>
                    <p className="text-xs text-gray-500">Unit: {l.unit || 'none'} | Key: {l.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingKey(l.key);
                        setNewField({ label: l.label, type: l.type || 'limit', category: l.category, unit: l.unit || '' });
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(l.key)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
