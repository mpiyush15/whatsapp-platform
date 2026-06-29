'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PaymentLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentLogs: any[];
}

const currency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);

export function PaymentLogsModal({ isOpen, onClose, paymentLogs }: PaymentLogsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-black">Payment Logs</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {paymentLogs && paymentLogs.length > 0 ? (
                <ul className="space-y-4">
                  {paymentLogs.map((log, index) => (
                    <li key={index} className="border-b pb-2">
                      <p><strong>Amount:</strong> {currency(Number(log.amount || 0))}</p>
                      <p><strong>Date:</strong> {new Date(log.date).toLocaleDateString()}</p>
                      <p><strong>Method:</strong> {log.method}</p>
                      {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No payment logs found.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
