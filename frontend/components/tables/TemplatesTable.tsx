'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, CheckCircle, Clock, AlertCircle, Copy } from 'lucide-react';
import { TemplateStatus } from '@/lib/enums';

interface Template {
  _id: string;
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  content: string;
  status: TemplateStatus;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

interface TemplatesTableProps {
  templates: Template[];
  onView?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  isLoading?: boolean;
}

type SortKey = 'name' | 'category' | 'status' | 'usageCount' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function TemplatesTable({
  templates,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  isLoading = false,
}: TemplatesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | TemplateStatus>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'marketing' | 'utility' | 'authentication'>('all');

  const filteredAndSorted = useMemo(() => {
    let filtered = templates.filter((template) => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || template.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [templates, searchQuery, sortKey, sortOrder, filterStatus, filterCategory]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case TemplateStatus.APPROVED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case TemplateStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case TemplateStatus.REJECTED:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TemplateStatus.APPROVED:
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case TemplateStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
      case TemplateStatus.REJECTED:
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'utility':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
      case 'authentication':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Categories</option>
          <option value="marketing">Marketing</option>
          <option value="utility">Utility</option>
          <option value="authentication">Authentication</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Template Name <SortIcon columnKey="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Category <SortIcon columnKey="category" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Status <SortIcon columnKey="status" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('usageCount')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Usage <SortIcon columnKey="usageCount" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                Language
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading templates...
                </td>
              </tr>
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No templates found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((template) => (
                <tr
                  key={template._id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{template.content.substring(0, 60)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium inline-block ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(template.status)}
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusColor(template.status)}`}>
                        {template.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">{template.usageCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700 dark:text-gray-300">{template.language.toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(template)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(template)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onDuplicate && (
                        <button
                          onClick={() => onDuplicate(template)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(template)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredAndSorted.length} of {templates.length} templates
      </div>
    </div>
  );
}
