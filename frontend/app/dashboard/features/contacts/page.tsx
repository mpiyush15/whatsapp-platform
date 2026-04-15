'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function ContactsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    const initPage = async () => {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      try {
        const response = await fetch(`${API_URL}/contacts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setContacts(data.data?.contacts || []);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }

      setLoading(false);
    };

    initPage();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-2">
            {user?.type === 'company' 
              ? `Manage contacts for ${user?.name}`
              : 'Manage your customer contacts'
            }
          </p>
        </div>
        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
          Add Contact
        </button>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {contacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No contacts yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{contact.name}</td>
                  <td className="px-6 py-3 text-gray-600">{contact.phone}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
