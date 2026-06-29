/**
 * SUPERADMIN: Invoices (alias — prefer /api/admin/invoices)
 */

import express from 'express';
import Invoice from '../../models/Invoice.js';
import Account from '../../models/Account.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const accountIds = [...new Set(invoices.map((i) => i.accountId).filter(Boolean))];
    const accounts = await Account.find({ accountId: { $in: accountIds } })
      .select('accountId name email')
      .lean();
    const accountMap = new Map(accounts.map((a) => [a.accountId, a]));

    const rows = invoices.map((inv) => {
      const account = accountMap.get(inv.accountId);
      const total = Number(inv.total ?? inv.amount ?? 0);
      return {
        ...inv,
        _id: String(inv._id),
        totalAmount: total,
        invoiceDate: inv.paidDate || inv.createdAt,
        accountName: account?.name,
        billTo: { name: account?.name, email: account?.email },
      };
    });

    return sendSuccess(res, { invoices: rows, total: rows.length }, 'All invoices');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const invoices = await Invoice.find({ accountId: customerId })
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(res, { invoices }, `Invoices for ${customerId}`);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
