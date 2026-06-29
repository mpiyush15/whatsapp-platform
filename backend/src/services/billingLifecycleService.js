import Subscription from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import Account from '../models/Account.js';
import logger from '../utils/logger.js';
import paymentPersistenceService from './paymentPersistenceService.js';
import invoicePersistenceService from './invoicePersistenceService.js';
import creditLedgerService from './creditLedgerService.js';
import billingNotificationService from './billingNotificationService.js';

class BillingLifecycleService {
  parseWebhookPayload(body = {}) {
    let orderId;
    let orderStatus;

    if (body.data?.order) {
      orderId = body.data.order.order_id;
      orderStatus = body.data.payment?.payment_status || body.data.order.order_status;
    } else if (body.order) {
      orderId = body.order.order_id;
      orderStatus = body.payment?.payment_status || body.order.order_status;
    } else if (body.order_id) {
      orderId = body.order_id;
      orderStatus = body.payment?.payment_status || body.order_status || body.status;
    } else {
      orderId = body.orderId;
      orderStatus = body.orderStatus || body.status;
    }

    return { orderId, orderStatus };
  }

  isSuccessfulPaymentStatus(orderStatus) {
    return ['SUCCESS', 'PAID', 'completed', 'success'].includes(String(orderStatus || '').toUpperCase())
      || ['completed', 'success'].includes(String(orderStatus || '').toLowerCase());
  }

  extractPaymentReference(body = {}) {
    return (
      body?.data?.payment?.cf_payment_id ||
      body?.data?.payment?.payment_id ||
      body?.payment?.cf_payment_id ||
      body?.payment?.payment_id ||
      body?.referenceId ||
      body?.transactionId ||
      body?.paymentId ||
      null
    );
  }

  buildEventKey({ orderId, orderStatus, paymentReference }) {
    const normalizedStatus = String(orderStatus || 'unknown').toUpperCase();
    const normalizedPaymentRef = paymentReference ? String(paymentReference) : 'no-payment-ref';
    return `${String(orderId)}:${normalizedStatus}:${normalizedPaymentRef}`;
  }

  normalizeBillingCycle(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'quarterly' || normalized === '3-months') return 'quarterly';
    if (normalized === 'annual' || normalized === 'yearly') return 'yearly';
    return 'monthly';
  }

  calculateSubscriptionDates(billingCycle) {
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingCycle === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return { startDate, endDate, renewalDate: endDate };
  }

  resolvePlanName(orderId, payment) {
    if (payment?.planName) return payment.planName;
    if (payment?.pricingSnapshot?.planName) return payment.pricingSnapshot.planName;

    // Support both modern (ORDER_PLAN_STARTER_...) and legacy (ORDER_STARTER_...) formats
    let planMatch = String(orderId || '').match(/ORDER_PLAN_([A-Z]+)_/);
    if (!planMatch) {
      planMatch = String(orderId || '').match(/ORDER_([A-Z]+)_/);
    }
    
    if (!planMatch) return null;
    return planMatch[1].charAt(0) + planMatch[1].slice(1).toLowerCase();
  }

  async processPaymentLifecycle({ body = {}, source = 'webhook', requestId = 'n/a' } = {}) {
    const { orderId, orderStatus } = this.parseWebhookPayload(body);
    const paymentReference = this.extractPaymentReference(body);
    const eventKey = this.buildEventKey({ orderId, orderStatus, paymentReference });

    logger.info(`💳 [${requestId}] Billing lifecycle start`, { source, orderId, orderStatus, paymentReference, eventKey });

    if (!orderId) {
      return {
        processed: false,
        error: 'ORDER_ID_MISSING',
        message: 'Order id missing in payload'
      };
    }

    if (!this.isSuccessfulPaymentStatus(orderStatus)) {
      return {
        processed: true,
        skipped: true,
        orderId,
        orderStatus,
        message: 'Non-paid status, skipped'
      };
    }

    // Atomic claim: only one process may execute side effects for an event key.
    let payment = await paymentPersistenceService.claimLifecycleEvent(orderId, eventKey);

    if (!payment) {
      const existing = await paymentPersistenceService.findByOrderIdLean(orderId);

      if (!existing) {
        return {
          processed: false,
          orderId,
          error: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found'
        };
      }

      if (Array.isArray(existing.completedEventKeys) && existing.completedEventKeys.includes(eventKey)) {
        return {
          processed: true,
          isDuplicate: true,
          orderId,
          paymentStatus: existing.status,
          subscriptionId: existing.subscriptionId || null,
          invoiceId: existing.invoiceId || null,
          message: 'Payment event already processed'
        };
      }

      if (Array.isArray(existing.processingEventKeys) && existing.processingEventKeys.includes(eventKey)) {
        return {
          processed: true,
          isDuplicate: true,
          inProgress: true,
          orderId,
          paymentStatus: existing.status,
          message: 'Payment event is already being processed'
        };
      }

      return {
        processed: false,
        orderId,
        error: 'EVENT_CLAIM_FAILED',
        message: 'Failed to claim payment event'
      };
    }

    try {
      const accountId = payment.accountId;
      if (!accountId) {
        throw new Error('ACCOUNT_ID_MISSING');
      }

      const account = await Account.findOne({ accountId });
      const paymentOrderType = String(
        payment?.metadata?.orderType
          || payment?.pricingSnapshot?.orderType
          || (payment?.pricingSnapshot?.selectedBillingCycle === 'one_time' ? 'credits' : 'subscription')
      ).toLowerCase();

      if (account?.isInternal === true) {
        const finalizedPayment = await paymentPersistenceService.markLifecycleCompleted({
          paymentId: payment._id,
          eventKey,
          subscriptionId: null,
          invoiceId: null,
          webhookData: body,
        });

        logger.info(`⏭️ [${requestId}] Skipped billing lifecycle side-effects for internal org`, {
          accountId,
          orderId,
          eventKey,
        });

        return {
          processed: true,
          skipped: true,
          reason: 'INTERNAL_ACCOUNT_BILLING_EXEMPT',
          orderId,
          accountId,
          eventKey,
          paymentStatus: finalizedPayment?.status || 'completed',
          subscriptionId: null,
          invoiceId: null,
          creditsGranted: 0,
          creditBalance: Number(account.creditBalance || 0),
          message: 'Internal account is billing-exempt; lifecycle side-effects skipped'
        };
      }

      if (paymentOrderType === 'credits') {
        const creditsToGrant = Number(
          payment?.metadata?.credits
          || payment?.pricingSnapshot?.credits
          || 0
        );

        if (!account || creditsToGrant <= 0) {
          throw new Error('INVALID_CREDIT_TOPUP_PAYLOAD');
        }

        const creditGrantResult = await creditLedgerService.postLedgerEntry({
          accountId,
          entryType: 'manual_credit',
          amount: creditsToGrant,
          source: 'system',
          referenceType: 'order',
          referenceId: String(orderId),
          idempotencyKey: `credits:topup:${orderId}`,
          note: 'Credit top-up via Cashfree',
          metadata: {
            orderType: 'credits',
            orderId,
            paymentId: String(payment._id),
            eventKey,
            rupeeAmount: Number(payment.amount || 0),
            gateway: payment.gateway || payment.paymentGateway || 'cashfree',
          },
        });

        const finalizedPayment = await paymentPersistenceService.markLifecycleCompleted({
          paymentId: payment._id,
          eventKey,
          subscriptionId: null,
          invoiceId: null,
          webhookData: body,
        });

        return {
          processed: true,
          orderId,
          paymentStatus: finalizedPayment?.status || 'completed',
          subscriptionId: null,
          invoiceId: null,
          accountId,
          eventKey,
          creditsGranted: Number(creditsToGrant || 0),
          creditBalance: Number(creditGrantResult?.balanceAfter || account.creditBalance || 0),
          creditEntryId: creditGrantResult?.ledger?._id ? String(creditGrantResult.ledger._id) : null,
          message: 'Credit top-up processed successfully'
        };
      }

      let planName = this.resolvePlanName(orderId, payment);
      let plan = null;

      if (payment?.planId) {
        plan = await PricingPlan.findById(payment.planId);
        if (plan) planName = plan.name;
      }

      if (!plan && planName) {
        plan = await PricingPlan.findOne({
          name: { $regex: new RegExp(`^${String(planName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        });
      }

      if (!account || !planName || !plan) {
        throw new Error('ACCOUNT_OR_PLAN_MISSING');
      }

      const billingCycle = this.normalizeBillingCycle(payment.billingCycle);
      const { startDate, endDate, renewalDate } = this.calculateSubscriptionDates(billingCycle);
      const planLimits = plan?.limits || {};
      const resolvedMessagesLimit = Number.isFinite(Number(planLimits.messages))
        ? Number(planLimits.messages)
        : Number(account?.limits?.messagesPerDay || 100);
      const resolvedContactsLimit = Number.isFinite(Number(planLimits.contacts))
        ? Number(planLimits.contacts)
        : Number(account?.limits?.contacts || 100);
      const resolvedPhoneNumbersLimit = Number.isFinite(Number(planLimits.phoneNumbers))
        ? Number(planLimits.phoneNumbers)
        : Number(account?.limits?.phoneNumbers || 1);

      const productLine = plan.productLine || 'whatsapp';
      const planEntitlements = plan.entitlements instanceof Map
        ? Object.fromEntries(plan.entitlements)
        : (plan.entitlements || {});

      const subscription = await Subscription.findOneAndUpdate(
        { accountId, productLine },
        {
          $set: {
            accountId,
            projectId: payment.projectId || null,
            productLine,
            pricingPlanId: plan.planId,
            planName,
            billingCycle,
            amount: Number(payment.amount || 0),
            currency: payment.currency || 'INR',
            status: 'active',
            startDate,
            endDate,
            renewalDate,
            features: {
              phoneNumbers: resolvedPhoneNumbersLimit,
              messagesPerDay: resolvedMessagesLimit,
              contacts: resolvedContactsLimit,
            },
            planLimits: planLimits,
            entitlements: planEntitlements,
            updatedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      const invoice = await invoicePersistenceService.createOrGetPaidInvoice({
        orderId,
        payment,
        subscriptionId: String(subscription._id),
        planName,
        billingCycle,
      });

      account.plan = String(planName || account.plan || 'starter').toLowerCase();
      account.billingCycle = billingCycle;
      account.status = 'active';
      account.subscriptionId = String(subscription._id);
      account.limits = {
        ...(account.limits || {}),
        phoneNumbers: resolvedPhoneNumbersLimit,
        messagesPerDay: resolvedMessagesLimit,
        messages: resolvedMessagesLimit,
        contacts: resolvedContactsLimit,
        campaigns: Number(planLimits.campaigns) || account.limits?.campaigns || 0,
        templates: Number(planLimits.templates) || account.limits?.templates || 0,
        users: Number(planLimits.users) || account.limits?.users || 0,
        apiCalls: Number(planLimits.apiCalls) || account.limits?.apiCalls || 0,
        storageGB: Number(planLimits.storageGB) || account.limits?.storageGB || 0,
        chatbots: Number(planLimits.chatbots) || account.limits?.chatbots || 0,
        patients: Number(planLimits.patients) || account.limits?.patients || 0,
        appointments: Number(planLimits.appointments) || account.limits?.appointments || 0,
        prescriptions: Number(planLimits.prescriptions) || account.limits?.prescriptions || 0,
        doctors: Number(planLimits.doctors) || account.limits?.doctors || 0,
        healthcareUsers: Number(planLimits.healthcareUsers) || account.limits?.healthcareUsers || 0,
      };
      account.nextBillingDate = renewalDate;
      account.lastPaymentDate = new Date();
      account.totalPayments = Number(account.totalPayments || 0) + Number(payment.amount || 0);
      await account.save();

      const creditGrantResult = await creditLedgerService.grantSubscriptionCredits({
        accountId,
        plan,
        billingCycle,
        orderId,
        paymentId: String(payment._id),
        invoiceId: String(invoice._id),
        eventKey,
      });

      const finalizedPayment = await paymentPersistenceService.markLifecycleCompleted({
        paymentId: payment._id,
        eventKey,
        subscriptionId: String(subscription._id),
        invoiceId: String(invoice._id),
        webhookData: body,
      });

      // Non-blocking notifications orchestration (email/whatsapp/in-app failures must not rollback billing state)
      let notificationResult = null;
      try {
        notificationResult = await billingNotificationService.dispatchPostPaymentNotifications({
          account,
          invoice,
          planName,
          billingCycle,
          renewalDate,
          orderId,
        });

        const invoiceEmailSent = Array.isArray(notificationResult?.results)
          && notificationResult.results.some(
            item => item?.channel === 'email' && item?.eventType === 'invoice_generated' && item?.sent === true
          );

        if (invoiceEmailSent && invoice.emailSent !== true) {
          invoice.emailSent = true;
          await invoice.save();
        }
      } catch (notificationError) {
        logger.error(`⚠️ [${requestId}] Post-payment notifications failed:`, notificationError.message);
      }

      return {
        processed: true,
        orderId,
        paymentStatus: finalizedPayment?.status || 'completed',
        subscriptionId: String(subscription._id),
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        accountId,
        eventKey,
        creditsGranted: Number(creditGrantResult?.creditsGranted || 0),
        creditBalance: Number(creditGrantResult?.balanceAfter || account.creditBalance || 0),
        creditEntryId: creditGrantResult?.ledger?._id ? String(creditGrantResult.ledger._id) : null,
        notifications: notificationResult,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      logger.error(`❌ [${requestId}] FATAL ERROR in processPaymentLifecycle for order ${orderId}:`, error);

      await paymentPersistenceService.markLifecycleFailed({
        paymentId: payment._id,
        eventKey,
        errorMessage: error.message,
      });

      return {
        processed: false,
        orderId,
        eventKey,
        error: error.message || 'PROCESSING_FAILED',
        message: 'Payment lifecycle processing failed'
      };
    }
  }
}

export default new BillingLifecycleService();
