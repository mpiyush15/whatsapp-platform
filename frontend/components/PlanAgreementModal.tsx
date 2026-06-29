'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface PlanAgreementModalProps {
  isOpen: boolean;
  planName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PlanAgreementModal({
  isOpen,
  planName,
  onClose,
  onConfirm,
  isLoading = false
}: PlanAgreementModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 px-8 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Thanks for choosing Replysys
            </h2>
            <p className="text-gray-600 mt-1">for your {planName} plan</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Few Things to Know Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Few things to know before you get started
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Meta Business Manager Access</p>
                  <p className="text-sm text-gray-600">You must have admin access to your Meta Business Manager</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">WhatsApp Commerce Policy</p>
                  <p className="text-sm text-gray-600">Your business must adhere to WhatsApp Commerce Policy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seamless Payments Card */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-6">
            <div className="flex gap-3 items-start mb-4">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <h4 className="text-lg font-bold text-blue-900">For Seamless Payments, Please Ensure</h4>
            </div>

            <div className="space-y-3 ml-8">
              <div className="flex gap-2 items-start">
                <span className="text-blue-600 font-bold">•</span>
                <p className="text-sm text-blue-800">
                  <strong>International transactions</strong> should be enabled on your card
                </p>
              </div>

              <div className="flex gap-2 items-start">
                <span className="text-blue-600 font-bold">•</span>
                <p className="text-sm text-blue-800">
                  <strong>Online transactions</strong> should be enabled on your card
                </p>
              </div>

              <div className="flex gap-2 items-start">
                <span className="text-blue-600 font-bold">•</span>
                <p className="text-sm text-blue-800">
                  Ensure your <strong>online and international transaction limit</strong> is more than what you're trying to pay on Replysys
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <a
                  href="#"
                  className="text-blue-600 font-semibold hover:text-blue-700 text-sm underline"
                >
                  To know more about payments? Click here
                </a>
              </div>
            </div>
          </div>

          {/* Terms & Agreement Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="flex gap-3 cursor-pointer items-start">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  I am well aware of the above. By signing up, you agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 font-semibold hover:underline"
                  >
                    Terms & Conditions
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 font-semibold hover:underline"
                  >
                    Privacy Policy
                  </a>
                  , and consent to receive marketing communications from Replysys and our service partners. Your
                  information will also be shared with Replysys's Service Partners to facilitate your Replysys signup,
                  product inquiries and enable your use of the Replysys service.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg border border-gray-300 font-semibold text-gray-900 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreedToTerms || isLoading}
            className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
