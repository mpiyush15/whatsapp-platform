'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, MapPin, Building2, Mail, Phone } from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  businessName?: string;
  city?: string;
  type: 'customer' | 'lead' | 'other';
  tags?: string[];
  lastMessageAt?: string;
  messageCount: number;
  isOptedIn: boolean;
  createdAt: string;
}

interface ContactsTableProps {
  contacts: Contact[];
  onView?: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  isLoading?: boolean;
}

type SortKey = 'name' | 'city' | 'businessName' | 'messageCount' | 'type' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function ContactsTable({
  contacts,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}: ContactsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'lead' | 'other'>('all');

  // Filter and sort contacts
  const filteredAndSorted = useMemo(() => {
    let filtered = contacts.filter((contact) => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        contact.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || contact.type === filterType;
      
      return matchesSearch && matchesType;
    });

    // Sort
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
  }, [contacts, searchQuery, sortKey, sortOrder, filterType]);

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

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, city, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="customer">Customer</option>
          <option value="lead">Lead</option>
          <option value="other">Other</option>
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
                  Name <SortIcon columnKey="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('city')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Location <SortIcon columnKey="city" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('businessName')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Business <SortIcon columnKey="businessName" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                Phone
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Type <SortIcon columnKey="type" />
                </button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => handleSort('messageCount')}
                  className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                >
                  Messages <SortIcon columnKey="messageCount" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((contact) => (
                <tr
                  key={contact._id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                      {contact.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {contact.city ? (
                      <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {contact.city}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {contact.businessName ? (
                      <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        {contact.businessName}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Phone className="w-4 h-4 text-green-500" />
                      {contact.whatsappNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contact.type === 'customer'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : contact.type === 'lead'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {contact.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {contact.messageCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(contact)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(contact)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(contact)}
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

      {/* Summary */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredAndSorted.length} of {contacts.length} contacts
      </div>
    </div>
  );
}
