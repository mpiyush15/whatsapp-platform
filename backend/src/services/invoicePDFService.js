import PDFDocument from 'pdfkit';
import { uploadToS3 } from './s3Service.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Generate Invoice PDF
 * Creates a professional PDF invoice and returns buffer
 */
export const generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      let buffers = [];

      // Collect PDF data
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header - Company Info
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 50);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Replysys', 50, 85)
        .text('Email: support@replysys.com', 50, 100)
        .text('Phone: 8087131777', 50, 115);

      // Invoice Details
      doc
        .fontSize(10)
        .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 350, 85)
        .text(`Invoice Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`, 350, 105)
        .text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 350, 125);

      // Billing To
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, 160)
        .font('Helvetica')
        .fontSize(10)
        .text(invoiceData.billTo.name || 'Customer', 50, 180)
        .text(invoiceData.billTo.email || '', 50, 195)
        .text(invoiceData.billTo.company || '', 50, 210)
        .text(invoiceData.billTo.address || '', 50, 225);

      // Line Items Table
      const tableTop = 280;
      const col1 = 50;
      const col2 = 250;
      const col3 = 360;
      const col4 = 480;

      // Table Header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', col1, tableTop)
        .text('Qty', col2, tableTop)
        .text('Unit Price', col3, tableTop)
        .text('Amount', col4, tableTop);

      // Horizontal line
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Line items
      let y = tableTop + 30;
      invoiceData.lineItems.forEach((item) => {
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(item.description, col1, y, { width: 180 })
          .text(item.quantity.toString(), col2, y)
          .text(`₹${item.unitPrice.toFixed(2)}`, col3, y)
          .text(`₹${item.amount.toFixed(2)}`, col4, y);
        y += 30;
      });

      // Totals section
      const totalY = y + 20;
      doc.moveTo(50, totalY).lineTo(550, totalY).stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Subtotal:', col3, totalY + 15)
        .text(`₹${invoiceData.subtotal.toFixed(2)}`, col4, totalY + 15);

      if (invoiceData.taxAmount > 0) {
        doc
          .text(`Tax (${invoiceData.taxRate}%):`, col3, totalY + 35)
          .text(`₹${invoiceData.taxAmount.toFixed(2)}`, col4, totalY + 35);
      }

      if (invoiceData.discountAmount > 0) {
        doc
          .text('Discount:', col3, totalY + 55)
          .text(`₹${invoiceData.discountAmount.toFixed(2)}`, col4, totalY + 55);
      }

      // Total
      const finalY = invoiceData.taxAmount > 0 ? totalY + 75 : totalY + 55;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total Amount Due:', col3 - 20, finalY)
        .text(`₹${invoiceData.totalAmount.toFixed(2)}`, col4, finalY);

      // Payment Status
      const statusY = finalY + 50;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Status: ${invoiceData.status.toUpperCase()}`, 50, statusY);

      if (invoiceData.paidAmount > 0) {
        doc
          .font('Helvetica')
          .text(`Paid Amount: ₹${invoiceData.paidAmount.toFixed(2)}`, 50, statusY + 20);
      }

      // Footer
      doc
        .fontSize(8)
        .text(
          'Thank you for your business!',
          50,
          700,
          { align: 'center' }
        )
        .text(
          'This invoice is generated automatically. Please contact support for any queries.',
          50,
          715,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate and upload invoice PDF to S3
 */
export const generateAndUploadInvoicePDF = async (invoiceData, accountId) => {
  try {
    logger.info(`📄 Generating PDF for invoice: ${invoiceData.invoiceNumber}`);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Upload to S3
    const { s3Url, s3Key } = await uploadToS3(
      pdfBuffer,
      accountId,
      'document',
      'application/pdf',
      `${invoiceData.invoiceNumber}.pdf`
    );

    logger.info(`✅ Invoice PDF uploaded to S3: ${s3Url}`);

    return {
      s3Url,
      s3Key,
      fileName: `${invoiceData.invoiceNumber}.pdf`
    };
  } catch (error) {
    logger.error('❌ Error generating/uploading invoice PDF:', error.message);
    throw error;
  }
};

export default {
  generateInvoicePDF,
  generateAndUploadInvoicePDF
};
