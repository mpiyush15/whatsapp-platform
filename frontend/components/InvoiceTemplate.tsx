'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PaymentStatus } from '@/lib/enums';

interface InvoiceTemplateProps {
  invoice: any;
  organization: any;
}

export default function InvoiceTemplate({ invoice, organization }: InvoiceTemplateProps) {
  const invoiceDate = new Date(invoice?.invoiceDate || invoice?.date || new Date());
  const dueDate = new Date(invoice?.dueDate || new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000));

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(`${invoice?.invoiceNumber || 'Invoice'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download invoice');
    }
  };

  return (
    <>
      <div id="invoice-content" className="w-full bg-white p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-sm text-gray-600 mt-1">{invoice?.invoiceNumber || 'INV-000000'}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-blue-600">REPLYSYS</p>
            <p className="text-xs text-gray-500">WhatsApp Business Platform</p>
          </div>
        </div>

        {/* Invoice Details & Dates */}
        <div className="grid grid-cols-3 gap-8 mb-10">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Invoice Date</p>
            <p className="text-sm font-bold text-gray-900">{invoiceDate.toLocaleDateString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Due Date</p>
            <p className="text-sm font-bold text-gray-900">{dueDate.toLocaleDateString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
            <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${
              invoice?.status === PaymentStatus.PAID
                ? 'bg-green-100 text-green-700' 
                : invoice?.status === PaymentStatus.SENT
                ? 'bg-blue-100 text-blue-700'
                : invoice?.status === PaymentStatus.OVERDUE
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {(invoice?.status || PaymentStatus.SENT).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-10">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Bill To</p>
          <p className="text-sm font-bold text-gray-900">{organization?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600">{organization?.email || 'N/A'}</p>
          {organization?.pan && <p className="text-sm text-gray-600">PAN: {organization.pan}</p>}
        </div>

        {/* Amount Section */}
        <div className="mb-10 bg-gray-50 p-6 rounded border border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Plan Details</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-bold text-gray-900 capitalize">{invoice?.plan || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Billing Cycle:</span>
                  <span className="font-bold text-gray-900 capitalize">{invoice?.billingCycle || 'Monthly'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account ID:</span>
                  <span className="font-mono font-bold text-gray-900">{invoice?.accountId || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Amount</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-bold text-gray-900">₹{(invoice?.amount || invoice?.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (GST):</span>
                  <span className="font-bold text-gray-900">₹0</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-lg text-blue-600">₹{(invoice?.amount || invoice?.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="mb-10 text-sm text-gray-600 border-t border-gray-200 pt-6">
          <p className="font-semibold text-gray-900 mb-2">Need Help?</p>
          <p>Email: <a href="mailto:support@replysys.com" className="text-blue-600 hover:underline">support@replysys.com</a></p>
          <p>Phone: <a href="tel:9766504856" className="text-blue-600 hover:underline">+91 97665 04856</a></p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center print:hidden mt-8">
          <button
            onClick={handleDownloadPDF}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            ⬇️ Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </>
  );
}
