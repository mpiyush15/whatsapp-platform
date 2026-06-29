import Invoice from '../models/Invoice.js';
import logger from '../utils/logger.js';

class InvoicePersistenceService {
  sanitizeOrderPart(orderId) {
    return String(orderId || 'ORDER').replace(/[^a-zA-Z0-9]/g, '').slice(-18).toUpperCase();
  }

  buildInvoiceNumber({ accountId, orderId }) {
    const orderPart = this.sanitizeOrderPart(orderId);
    return `INV-${accountId}-${orderPart}`;
  }

  async findById(invoiceId) {
    if (!invoiceId) return null;
    return Invoice.findById(invoiceId);
  }

  async findByOrderId(orderId) {
    if (!orderId) return null;
    return Invoice.findOne({ orderId });
  }

  async createOrGetPaidInvoice({
    orderId,
    payment,
    subscriptionId,
    planName,
    billingCycle,
  }) {
    if (!orderId || !payment?.accountId || !subscriptionId) {
      throw new Error('INVOICE_INPUT_MISSING');
    }

    if (payment.invoiceId) {
      const linkedInvoice = await this.findById(payment.invoiceId);
      if (linkedInvoice) return linkedInvoice;
    }

    const existingByOrder = await this.findByOrderId(orderId);
    if (existingByOrder) return existingByOrder;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceNumber = this.buildInvoiceNumber({
      accountId: payment.accountId,
      orderId,
    });

    const payload = {
      accountId: payment.accountId,
      projectId: payment.projectId || null,
      orderId,
      paymentId: String(payment._id),
      invoiceNumber,
      subscriptionId: String(subscriptionId),
      amount: Number(payment.amount || 0),
      currency: payment.currency || 'INR',
      tax: 0,
      total: Number(payment.amount || 0),
      status: 'paid',
      dueDate,
      paidDate: new Date(),
      items: [
        {
          description: `${planName} Plan - ${billingCycle} subscription`,
          quantity: 1,
          unitPrice: Number(payment.amount || 0),
          total: Number(payment.amount || 0)
        }
      ],
      emailSent: false,
    };

    try {
      const created = await Invoice.create(payload);
      return created;
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await this.findByOrderId(orderId);
        if (duplicate) return duplicate;
      }
      logger.error('❌ Invoice create failed:', { orderId, message: error.message });
      throw error;
    }
  }
}

export default new InvoicePersistenceService();
