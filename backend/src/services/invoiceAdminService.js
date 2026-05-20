import Account from '../models/Account.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import invoicePersistenceService from './invoicePersistenceService.js';
import logger from '../utils/logger.js';

const COMPLETED_STATUSES = ['completed', 'success', 'paid', 'PAID'];

function normalizeBillingCycle(value) {
  const v = String(value || 'monthly').toLowerCase();
  if (v === 'quarterly' || v === '3-months') return 'quarterly';
  if (v === 'annual' || v === 'yearly') return 'yearly';
  return 'monthly';
}

function mapInvoiceRow(invoice, accountMap) {
  const account = accountMap.get(invoice.accountId);
  const total = Number(invoice.total ?? invoice.amount ?? 0);
  return {
    _id: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.paidDate || invoice.createdAt,
    dueDate: invoice.dueDate,
    totalAmount: total,
    paidAmount: invoice.status === 'paid' ? total : 0,
    amount: total,
    status: invoice.status,
    accountId: invoice.accountId,
    accountName: account?.name || invoice.accountId,
    orderId: invoice.orderId,
    paymentId: invoice.paymentId,
    billTo: {
      name: account?.name || invoice.accountId,
      email: account?.email || '',
    },
    items: invoice.items || [],
    createdAt: invoice.createdAt,
  };
}

export async function listPlatformInvoices({ limit = 200 } = {}) {
  const invoices = await Invoice.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Number(limit) || 200))
    .lean();

  const accountIds = [...new Set(invoices.map((i) => i.accountId).filter(Boolean))];
  const accounts = await Account.find({ accountId: { $in: accountIds } })
    .select('accountId name email')
    .lean();
  const accountMap = new Map(accounts.map((a) => [a.accountId, a]));

  const rows = invoices.map((inv) => mapInvoiceRow(inv, accountMap));

  const missingCount = await countPaymentsMissingInvoices();

  const totalRevenue = rows
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + Number(r.totalAmount || 0), 0);

  return { invoices: rows, total: rows.length, missingCount, totalRevenue };
}

export async function countPaymentsMissingInvoices() {
  const completed = await Payment.find({
    status: { $in: COMPLETED_STATUSES },
  })
    .select('invoiceId orderId')
    .lean();

  const invoiceIds = completed.map((p) => p.invoiceId).filter(Boolean);
  const orderIds = completed.map((p) => p.orderId).filter(Boolean);

  const [byId, byOrder] = await Promise.all([
    invoiceIds.length
      ? Invoice.find({ _id: { $in: invoiceIds } }).select('_id orderId').lean()
      : [],
    orderIds.length
      ? Invoice.find({ orderId: { $in: orderIds } }).select('_id orderId').lean()
      : [],
  ]);

  const invoiceById = new Set(byId.map((i) => String(i._id)));
  const invoiceByOrder = new Set([...byId, ...byOrder].map((i) => i.orderId).filter(Boolean));

  return completed.filter((payment) => {
    if (payment.invoiceId && invoiceById.has(String(payment.invoiceId))) return false;
    if (payment.orderId && invoiceByOrder.has(payment.orderId)) return false;
    return true;
  }).length;
}

async function resolveSubscriptionForPayment(payment) {
  if (payment.subscriptionId) {
    const sub = await Subscription.findById(payment.subscriptionId);
    if (sub) return sub;
  }

  const active = await Subscription.findOne({
    accountId: payment.accountId,
    status: 'active',
  }).sort({ updatedAt: -1 });
  if (active) return active;

  const billingCycle = normalizeBillingCycle(payment.billingCycle);
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
  else endDate.setMonth(endDate.getMonth() + 1);

  return Subscription.findOneAndUpdate(
    { accountId: payment.accountId },
    {
      $set: {
        accountId: payment.accountId,
        projectId: payment.projectId || null,
        planName: payment.planName || 'starter',
        billingCycle,
        amount: Number(payment.amount || 0),
        currency: payment.currency || 'INR',
        status: 'active',
        startDate,
        endDate,
        renewalDate: endDate,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function backfillInvoicesFromPayments({ limit = 50 } = {}) {
  const payments = await Payment.find({
    status: { $in: COMPLETED_STATUSES },
  })
    .sort({ updatedAt: -1 })
    .limit(Math.min(200, Number(limit) || 50))
    .lean();

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const payment of payments) {
    try {
      const existing =
        (payment.invoiceId && (await Invoice.findById(payment.invoiceId))) ||
        (payment.orderId && (await Invoice.findOne({ orderId: payment.orderId })));
      if (existing) {
        if (!payment.invoiceId) {
          await Payment.updateOne(
            { _id: payment._id },
            { $set: { invoiceId: String(existing._id) } }
          );
        }
        skipped += 1;
        continue;
      }

      const subscription = await resolveSubscriptionForPayment(payment);
      if (!subscription) {
        failed += 1;
        continue;
      }

      const invoice = await invoicePersistenceService.createOrGetPaidInvoice({
        orderId: payment.orderId,
        payment,
        subscriptionId: String(subscription._id),
        planName: payment.planName || subscription.planName || 'starter',
        billingCycle: normalizeBillingCycle(payment.billingCycle || subscription.billingCycle),
      });

      await Payment.updateOne(
        { _id: payment._id },
        { $set: { invoiceId: String(invoice._id), subscriptionId: String(subscription._id) } }
      );
      created += 1;
    } catch (error) {
      failed += 1;
      logger.error('Invoice backfill failed:', {
        orderId: payment.orderId,
        message: error.message,
      });
    }
  }

  return { created, skipped, failed, processed: payments.length };
}

export default {
  listPlatformInvoices,
  backfillInvoicesFromPayments,
  countPaymentsMissingInvoices,
};
