import Account from '../models/Account.js';
import AccountCreditLedger from '../models/AccountCreditLedger.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';

class BillingReconciliationService {
  async getInternalAccountIds() {
    const internalAccounts = await Account.find({ isInternal: true }).select('accountId').lean();
    return internalAccounts
      .map(account => String(account.accountId || ''))
      .filter(Boolean);
  }

  buildCompletedPaymentFilter() {
    return {
      status: { $in: ['completed', 'success', 'paid', 'PAID'] },
    };
  }

  async getStuckPayments({ olderThanMinutes = 30, limit = 100 } = {}) {
    const cutoff = new Date(Date.now() - Number(olderThanMinutes) * 60 * 1000);
    const internalAccountIds = await this.getInternalAccountIds();

    return Payment.find({
      ...(internalAccountIds.length > 0 ? { accountId: { $nin: internalAccountIds } } : {}),
      $or: [
        {
          status: { $in: ['pending', 'processing'] },
          updatedAt: { $lt: cutoff },
        },
        {
          lifecycleState: 'processing',
          lifecycleProcessingAt: { $lt: cutoff },
        }
      ]
    })
      .sort({ updatedAt: 1 })
      .limit(Number(limit))
      .select('accountId orderId status lifecycleState lifecycleProcessingAt lifecycleLastError amount billingCycle invoiceId subscriptionId updatedAt createdAt');
  }

  async getMissingInvoices({ limit = 100 } = {}) {
    const internalAccountIds = await this.getInternalAccountIds();
    const paymentFilter = {
      ...this.buildCompletedPaymentFilter(),
      ...(internalAccountIds.length > 0 ? { accountId: { $nin: internalAccountIds } } : {}),
    };

    const completedPayments = await Payment.find(paymentFilter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit) * 3)
      .select('accountId orderId status invoiceId subscriptionId amount billingCycle updatedAt createdAt');

    const invoiceIds = completedPayments.map(payment => payment.invoiceId).filter(Boolean);
    const invoices = invoiceIds.length > 0
      ? await Invoice.find({ _id: { $in: invoiceIds } }).select('_id orderId invoiceNumber')
      : [];

    const invoiceMap = new Map(invoices.map(invoice => [String(invoice._id), invoice]));

    return completedPayments
      .filter(payment => !payment.invoiceId || !invoiceMap.has(String(payment.invoiceId)))
      .slice(0, Number(limit))
      .map(payment => ({
        paymentId: String(payment._id),
        accountId: payment.accountId,
        orderId: payment.orderId,
        status: payment.status,
        invoiceId: payment.invoiceId || null,
        subscriptionId: payment.subscriptionId || null,
        amount: payment.amount,
        billingCycle: payment.billingCycle,
        updatedAt: payment.updatedAt,
        createdAt: payment.createdAt,
      }));
  }

  async getMissingSubscriptions({ limit = 100 } = {}) {
    const internalAccountIds = await this.getInternalAccountIds();
    const paymentFilter = {
      ...this.buildCompletedPaymentFilter(),
      ...(internalAccountIds.length > 0 ? { accountId: { $nin: internalAccountIds } } : {}),
    };

    const completedPayments = await Payment.find(paymentFilter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit) * 3)
      .select('accountId orderId status invoiceId subscriptionId amount billingCycle updatedAt createdAt');

    const subscriptionIds = completedPayments.map(payment => payment.subscriptionId).filter(Boolean);
    const subscriptions = subscriptionIds.length > 0
      ? await Subscription.find({ _id: { $in: subscriptionIds } }).select('_id accountId status')
      : [];

    const subscriptionMap = new Map(subscriptions.map(subscription => [String(subscription._id), subscription]));

    return completedPayments
      .filter(payment => !payment.subscriptionId || !subscriptionMap.has(String(payment.subscriptionId)))
      .slice(0, Number(limit))
      .map(payment => ({
        paymentId: String(payment._id),
        accountId: payment.accountId,
        orderId: payment.orderId,
        status: payment.status,
        subscriptionId: payment.subscriptionId || null,
        invoiceId: payment.invoiceId || null,
        amount: payment.amount,
        billingCycle: payment.billingCycle,
        updatedAt: payment.updatedAt,
        createdAt: payment.createdAt,
      }));
  }

  async getCreditMismatches({ limit = 100 } = {}) {
    const internalAccountIds = await this.getInternalAccountIds();

    const ledgerTotals = await AccountCreditLedger.aggregate([
      {
        $match: {
          status: 'posted',
          ...(internalAccountIds.length > 0 ? { accountId: { $nin: internalAccountIds } } : {}),
        }
      },
      {
        $group: {
          _id: '$accountId',
          ledgerBalance: { $sum: { $ifNull: ['$signedAmount', 0] } },
          ledgerEntries: { $sum: 1 },
          lastLedgerAt: { $max: '$createdAt' },
        }
      }
    ]);

    const ledgerMap = new Map(ledgerTotals.map(item => [String(item._id), item]));

    const accounts = await Account.find({
      ...(internalAccountIds.length > 0 ? { accountId: { $nin: internalAccountIds }, isInternal: { $ne: true } } : {}),
      $or: [
        { creditBalance: { $ne: 0 } },
        { accountId: { $in: Array.from(ledgerMap.keys()) } },
      ]
    })
      .limit(Number(limit) * 3)
      .select('accountId email name creditBalance plan billingCycle status updatedAt');

    return accounts
      .map(account => {
        const ledger = ledgerMap.get(String(account.accountId));
        const cachedBalance = Number(account.creditBalance || 0);
        const derivedBalance = Number(ledger?.ledgerBalance || 0);
        const delta = cachedBalance - derivedBalance;

        return {
          accountId: account.accountId,
          email: account.email,
          name: account.name,
          cachedBalance,
          derivedBalance,
          delta,
          ledgerEntries: Number(ledger?.ledgerEntries || 0),
          lastLedgerAt: ledger?.lastLedgerAt || null,
          plan: account.plan,
          billingCycle: account.billingCycle,
          status: account.status,
        };
      })
      .filter(item => item.delta !== 0)
      .slice(0, Number(limit));
  }

  async recomputeAccountCreditBalance(accountId) {
    const [account, totals] = await Promise.all([
      Account.findOne({ accountId }),
      AccountCreditLedger.aggregate([
        { $match: { accountId, status: 'posted' } },
        {
          $group: {
            _id: '$accountId',
            derivedBalance: { $sum: { $ifNull: ['$signedAmount', 0] } },
            ledgerEntries: { $sum: 1 },
          }
        }
      ])
    ]);

    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    if (account.isInternal === true) {
      throw new Error('INTERNAL_ACCOUNT_EXEMPT');
    }

    const derivedBalance = Number(totals?.[0]?.derivedBalance || 0);
    const before = Number(account.creditBalance || 0);

    account.creditBalance = derivedBalance;
    await account.save();

    return {
      accountId,
      before,
      after: derivedBalance,
      deltaApplied: derivedBalance - before,
      ledgerEntries: Number(totals?.[0]?.ledgerEntries || 0),
    };
  }

  async getOverview({ olderThanMinutes = 30, sampleLimit = 20 } = {}) {
    const [stuckPayments, missingInvoices, missingSubscriptions, creditMismatches] = await Promise.all([
      this.getStuckPayments({ olderThanMinutes, limit: sampleLimit }),
      this.getMissingInvoices({ limit: sampleLimit }),
      this.getMissingSubscriptions({ limit: sampleLimit }),
      this.getCreditMismatches({ limit: sampleLimit }),
    ]);

    return {
      summary: {
        stuckPayments: stuckPayments.length,
        missingInvoices: missingInvoices.length,
        missingSubscriptions: missingSubscriptions.length,
        creditMismatches: creditMismatches.length,
      },
      samples: {
        stuckPayments,
        missingInvoices,
        missingSubscriptions,
        creditMismatches,
      }
    };
  }
}

export default new BillingReconciliationService();
