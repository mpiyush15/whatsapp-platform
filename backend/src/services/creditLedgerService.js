import Account from '../models/Account.js';
import AccountCreditLedger from '../models/AccountCreditLedger.js';
import logger from '../utils/logger.js';

class CreditLedgerService {
  normalizeSignedAmount(entryType, amount) {
    const numericAmount = Number(amount || 0);
    if (numericAmount <= 0) {
      throw new Error('INVALID_CREDIT_AMOUNT');
    }

    const debitTypes = new Set(['usage_debit', 'refund_debit']);
    return debitTypes.has(entryType) ? -numericAmount : numericAmount;
  }

  billingCycleMultiplier(billingCycle) {
    const normalized = String(billingCycle || '').toLowerCase();
    if (normalized === 'yearly' || normalized === 'annual') return 12;
    if (normalized === 'quarterly' || normalized === '3-months') return 3;
    return 1;
  }

  async postLedgerEntry({
    accountId,
    entryType,
    amount,
    source = 'system',
    referenceType = 'system',
    referenceId = null,
    idempotencyKey = null,
    note = '',
    metadata = {},
  }) {
    if (!accountId || !entryType) {
      throw new Error('LEDGER_INPUT_MISSING');
    }

    const signedAmount = this.normalizeSignedAmount(entryType, amount);

    let claimedLedger = null;
    let resumeProcessing = false;

    if (idempotencyKey) {
      let existingDoc = await AccountCreditLedger.findOne({ idempotencyKey });
      let wasInserted = false;

      if (!existingDoc) {
        try {
          existingDoc = await AccountCreditLedger.create({
            accountId,
            entryType,
            source,
            amount: Number(amount),
            referenceType,
            referenceId,
            idempotencyKey,
            note,
            metadata,
            status: 'processing',
          });
          wasInserted = true;
        } catch (error) {
          if (error?.code !== 11000) throw error;
          existingDoc = await AccountCreditLedger.findOne({ idempotencyKey });
        }
      }

      if (existingDoc?.status === 'posted') {
        return {
          posted: true,
          isDuplicate: true,
          ledger: existingDoc,
          balanceAfter: existingDoc.balanceAfter,
        };
      }

      claimedLedger = existingDoc;
      resumeProcessing = !wasInserted && existingDoc?.status === 'processing';
    }

    const account = resumeProcessing
      ? await Account.findOne({ accountId })
      : await Account.findOneAndUpdate(
          { accountId },
          { $inc: { creditBalance: signedAmount } },
          { new: true }
        );

    if (!account) {
      if (claimedLedger?._id) {
        await AccountCreditLedger.updateOne(
          { _id: claimedLedger._id },
          { $set: { status: 'failed', error: 'ACCOUNT_NOT_FOUND' } }
        );
      }
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    const balanceAfter = Number(account.creditBalance || 0);
    const balanceBefore = balanceAfter - signedAmount;

    let ledger = null;

    if (claimedLedger?._id) {
      ledger = await AccountCreditLedger.findOneAndUpdate(
        { _id: claimedLedger._id },
        {
          $set: {
            signedAmount,
            balanceBefore,
            balanceAfter,
            status: 'posted',
            error: null,
            updatedAt: new Date(),
          }
        },
        { new: true }
      );
    } else {
      ledger = await AccountCreditLedger.create({
        accountId,
        entryType,
        source,
        amount: Number(amount),
        signedAmount,
        balanceBefore,
        balanceAfter,
        referenceType,
        referenceId,
        idempotencyKey,
        note,
        metadata,
        status: 'posted',
      });
    }

    logger.info('💰 Credit ledger posted', {
      accountId,
      entryType,
      amount,
      signedAmount,
      balanceBefore,
      balanceAfter,
      referenceType,
      referenceId,
      idempotencyKey,
    });

    return {
      posted: true,
      isDuplicate: false,
      ledger,
      balanceAfter,
      signedAmount,
    };
  }

  async grantSubscriptionCredits({
    accountId,
    plan,
    billingCycle,
    orderId,
    paymentId,
    invoiceId,
    eventKey,
  }) {
    const monthlyCredits = Number(plan?.monthlyCredits || 0);
    const multiplier = this.billingCycleMultiplier(billingCycle);
    const totalCredits = monthlyCredits * multiplier;

    if (!totalCredits || totalCredits <= 0) {
      return {
        posted: false,
        skipped: true,
        creditsGranted: 0,
        message: 'No credits configured for plan',
      };
    }

    const idempotencyKey = `credits:subscription:${orderId}`;

    const result = await this.postLedgerEntry({
      accountId,
      entryType: 'subscription_credit',
      amount: totalCredits,
      source: 'subscription_billing',
      referenceType: 'order',
      referenceId: String(orderId),
      idempotencyKey,
      note: `${plan?.name || 'Plan'} credits grant for ${billingCycle} cycle`,
      metadata: {
        planName: plan?.name || null,
        monthlyCredits,
        multiplier,
        billingCycle,
        orderId,
        paymentId,
        invoiceId,
        eventKey,
      },
    });

    return {
      ...result,
      creditsGranted: totalCredits,
      idempotencyKey,
    };
  }

  async grantSignupCredits({
    accountId,
    plan,
    source = 'system',
    referenceType = 'system',
    referenceId = null,
    eventKey = null,
  }) {
    const signupCredits = Number(plan?.signupCredits || 0);

    if (!signupCredits || signupCredits <= 0) {
      return {
        posted: false,
        skipped: true,
        creditsGranted: 0,
        message: 'No signup credits configured for plan',
      };
    }

    const idempotencyKey = `credits:signup:${accountId}`;

    const result = await this.postLedgerEntry({
      accountId,
      entryType: 'manual_credit',
      amount: signupCredits,
      source,
      referenceType,
      referenceId: referenceId ? String(referenceId) : String(accountId),
      idempotencyKey,
      note: `${plan?.name || 'Plan'} signup credits grant`,
      metadata: {
        rule: 'signup_credits',
        planName: plan?.name || null,
        signupCredits,
        eventKey,
      },
    });

    return {
      ...result,
      creditsGranted: signupCredits,
      idempotencyKey,
    };
  }

  async postAdminAdjustment({
    accountId,
    entryType,
    amount,
    reason,
    referenceId,
    actor,
    idempotencyKey,
  }) {
    const allowed = new Set(['manual_credit', 'usage_debit', 'refund_debit', 'correction']);
    if (!allowed.has(entryType)) {
      throw new Error('INVALID_CREDIT_ENTRY_TYPE');
    }

    if (!reason || String(reason).trim().length < 3) {
      throw new Error('CREDIT_REASON_REQUIRED');
    }

    return this.postLedgerEntry({
      accountId,
      entryType,
      amount: Number(amount),
      source: 'admin_manual',
      referenceType: 'manual',
      referenceId: referenceId ? String(referenceId) : null,
      idempotencyKey: idempotencyKey || `credits:admin:${accountId}:${entryType}:${Date.now()}`,
      note: String(reason).trim(),
      metadata: {
        actor: actor || null,
      },
    });
  }

  async getAccountCredits({ accountId, limit = 50, offset = 0 }) {
    const account = await Account.findOne({ accountId }).select('accountId creditBalance');
    const ledger = await AccountCreditLedger.find({ accountId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    return {
      accountId,
      creditBalance: Number(account?.creditBalance || 0),
      ledger,
    };
  }
}

export default new CreditLedgerService();
