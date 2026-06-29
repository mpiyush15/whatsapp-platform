'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, CheckCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  holderName: string;
  isDefault: boolean;
  createdAt: string;
}

interface PaymentMethodsProps {
  organizationId?: string;
}

export default function PaymentMethods({ organizationId }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, [organizationId]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(
        `${API_URL}/billing/payment-methods${organizationId ? `?orgId=${organizationId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(
        `${API_URL}/billing/payment-methods/${methodId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(
        `${API_URL}/billing/payment-methods/${methodId}/set-default`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `Card ending in ${method.last4}`;
      case 'bank':
        return `${method.bankName} - ${method.holderName}`;
      case 'wallet':
        return `Wallet - ${method.holderName}`;
      default:
        return 'Payment Method';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your payment methods for billing</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Payment Method
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-6 h-6 text-gray-600 flex-shrink-0" />
                  
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{getPaymentMethodLabel(method)}</p>
                    <p className="text-xs text-gray-500">
                      Added on {new Date(method.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    {method.expiryMonth && method.expiryYear && (
                      <p className="text-xs text-gray-500">
                        Expires: {method.expiryMonth}/{method.expiryYear}
                      </p>
                    )}
                  </div>

                  {method.isDefault && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-800">Default</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No payment methods added yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Payment Method
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Payment Method</h3>
            <p className="text-gray-600 text-sm mb-4">
              Payment method integration coming soon. For now, please contact support to add a payment method.
            </p>
            <button
              onClick={() => setShowAddForm(false)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
