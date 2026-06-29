// backend/src/routes/adminFinancialRoutes.js
/**
 * Superadmin financial routes for revenue & expense management.
 * All endpoints require Superadmin JWT auth.
 */
import express from 'express';
import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';
import Loan from '../models/Loan.js';
import adAccountBillingService from '../services/adAccountBillingService.js';

const router = express.Router();

// GET summary: total revenue, total expenses, profit
router.get('/summary', async (req, res) => {
  try {
    const revAgg = await Payment.aggregate([
      { $match: { status: { $in: ['completed', 'COMPLETED', 'success', 'SUCCESS', 'paid', 'PAID'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expAgg = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalRevenue = revAgg[0]?.total || 0;
    const totalExpense = expAgg[0]?.total || 0;
    const profit = totalRevenue - totalExpense;

    // Aggregate loans
    const activeLoans = await Loan.find({ repaymentStatus: 'active' });
    let totalActiveDebt = 0;
    let totalMonthlyEMI = 0;
    let weightedRoiSum = 0;

    activeLoans.forEach(loan => {
      totalActiveDebt += loan.amount;
      
      // Calculate EMI if not explicitly defined
      let emi = loan.monthlyEMI;
      if (emi === undefined || emi === null) {
        const r = (loan.roi / 12) / 100;
        const n = loan.tenure;
        emi = r > 0 ? (loan.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.amount / n;
      }
      totalMonthlyEMI += emi;
      weightedRoiSum += (loan.roi * loan.amount);
    });

    const averageRoi = totalActiveDebt > 0 ? (weightedRoiSum / totalActiveDebt) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpense,
        profit,
        totalActiveDebt,
        totalMonthlyEMI,
        averageRoi
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to compute summary' });
  }
});

// POST new expense (global or recurring)
router.post('/expenses', async (req, res) => {
  const { type, amount, date, description, isRecurring, frequency, domain } = req.body;
  if (!type || typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ success: false, message: 'Invalid expense payload' });
  }
  try {
    const expense = new Expense({
      type,
      amount,
      date: date ? new Date(date) : undefined,
      description,
      isRecurring: !!isRecurring,
      frequency: isRecurring ? (frequency || null) : null,
      domain: domain || null
    });
    await expense.save();
    res.json({ success: true, data: expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to save expense' });
  }
});

// GET list of expenses (optional filter by domain)
router.get('/expenses', async (req, res) => {
  const filter = {};
  if (req.query.domain) filter.domain = req.query.domain;
  try {
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json({ success: true, data: expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

// DELETE an expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});


// GET analytics: time-based revenue, expense, profit and category breakdown
router.get('/analytics', async (req, res) => {
  try {
    // 1. Monthly
    const monthlyRev = await Payment.aggregate([
      { $match: { status: { $in: ['completed', 'COMPLETED', 'success', 'SUCCESS', 'paid', 'PAID'] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      }
    ]);
    const monthlyExp = await Expense.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const monthlyMap = {};
    monthlyRev.forEach(item => {
      monthlyMap[item._id] = { label: item._id, revenue: item.total, expense: 0, profit: item.total };
    });
    monthlyExp.forEach(item => {
      if (!monthlyMap[item._id]) {
        monthlyMap[item._id] = { label: item._id, revenue: 0, expense: item.total, profit: -item.total };
      } else {
        monthlyMap[item._id].expense = item.total;
        monthlyMap[item._id].profit = monthlyMap[item._id].revenue - item.total;
      }
    });
    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.label.localeCompare(b.label));

    // 2. Quarterly
    const quarterlyRev = await Payment.aggregate([
      { $match: { status: { $in: ['completed', 'COMPLETED', 'success', 'SUCCESS', 'paid', 'PAID'] } } },
      {
        $group: {
          _id: {
            $concat: [
              { $dateToString: { format: "%Y", date: "$createdAt" } },
              "-Q",
              { $toString: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } } }
            ]
          },
          total: { $sum: "$amount" }
        }
      }
    ]);
    const quarterlyExp = await Expense.aggregate([
      {
        $group: {
          _id: {
            $concat: [
              { $dateToString: { format: "%Y", date: "$date" } },
              "-Q",
              { $toString: { $ceil: { $divide: [{ $month: "$date" }, 3] } } }
            ]
          },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const quarterlyMap = {};
    quarterlyRev.forEach(item => {
      quarterlyMap[item._id] = { label: item._id, revenue: item.total, expense: 0, profit: item.total };
    });
    quarterlyExp.forEach(item => {
      if (!quarterlyMap[item._id]) {
        quarterlyMap[item._id] = { label: item._id, revenue: 0, expense: item.total, profit: -item.total };
      } else {
        quarterlyMap[item._id].expense = item.total;
        quarterlyMap[item._id].profit = quarterlyMap[item._id].revenue - item.total;
      }
    });
    const quarterlyData = Object.values(quarterlyMap).sort((a, b) => a.label.localeCompare(b.label));

    // 3. Yearly
    const yearlyRev = await Payment.aggregate([
      { $match: { status: { $in: ['completed', 'COMPLETED', 'success', 'SUCCESS', 'paid', 'PAID'] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      }
    ]);
    const yearlyExp = await Expense.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$date" } },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const yearlyMap = {};
    yearlyRev.forEach(item => {
      yearlyMap[item._id] = { label: item._id, revenue: item.total, expense: 0, profit: item.total };
    });
    yearlyExp.forEach(item => {
      if (!yearlyMap[item._id]) {
        yearlyMap[item._id] = { label: item._id, revenue: 0, expense: item.total, profit: -item.total };
      } else {
        yearlyMap[item._id].expense = item.total;
        yearlyMap[item._id].profit = yearlyMap[item._id].revenue - item.total;
      }
    });
    const yearlyData = Object.values(yearlyMap).sort((a, b) => a.label.localeCompare(b.label));

    // 4. Expenses by Category
    const expensesByCategory = await Expense.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$type", "Uncategorized"] },
          amount: { $sum: "$amount" }
        }
      },
      { $project: { category: "$_id", amount: 1, _id: 0 } },
      { $sort: { amount: -1 } }
    ]);

    // 5. Recent items
    const recentExpenses = await Expense.find().sort({ date: -1 }).limit(10);
    const recentRevenue = await Payment.find({ status: { $in: ['completed', 'COMPLETED', 'success', 'SUCCESS', 'paid', 'PAID'] } })
      .select('orderId amount createdAt gateway paymentMethod planName')
      .sort({ createdAt: -1 })
      .limit(10);

    // 6. Loans data
    const activeLoans = await Loan.find({ repaymentStatus: 'active' }).sort({ startDate: -1 });
    const allLoans = await Loan.find().sort({ startDate: -1 });

    res.json({
      success: true,
      data: {
        monthly: monthlyData,
        quarterly: quarterlyData,
        yearly: yearlyData,
        expensesByCategory,
        recentExpenses,
        recentRevenue,
        loans: allLoans,
        activeLoansCount: activeLoans.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate financial analytics' });
  }
});

// GET all loans
router.get('/loans', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ startDate: -1 });
    res.json({ success: true, data: loans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
});

// POST new loan
router.post('/loans', async (req, res) => {
  const { lender, amount, roi, tenure, startDate, repaymentStatus, monthlyEMI, description } = req.body;
  if (!lender || typeof amount !== 'number' || amount < 0 || typeof roi !== 'number' || roi < 0 || typeof tenure !== 'number' || tenure < 1) {
    return res.status(400).json({ success: false, message: 'Invalid loan payload' });
  }
  try {
    // Calculate EMI if not provided or provided as 0
    let calculatedEMI = monthlyEMI;
    if (!calculatedEMI) {
      const r = (roi / 12) / 100;
      const n = tenure;
      calculatedEMI = r > 0 ? (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : amount / n;
    }

    const loan = new Loan({
      lender,
      amount,
      roi,
      tenure,
      startDate: startDate ? new Date(startDate) : undefined,
      repaymentStatus: repaymentStatus || 'active',
      monthlyEMI: calculatedEMI,
      description
    });
    await loan.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to save loan' });
  }
});

// PUT update loan
router.put('/loans/:id', async (req, res) => {
  const { lender, amount, roi, tenure, startDate, repaymentStatus, monthlyEMI, description } = req.body;
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (lender !== undefined) loan.lender = lender;
    if (amount !== undefined) loan.amount = amount;
    if (roi !== undefined) loan.roi = roi;
    if (tenure !== undefined) loan.tenure = tenure;
    if (startDate !== undefined) loan.startDate = new Date(startDate);
    if (repaymentStatus !== undefined) loan.repaymentStatus = repaymentStatus;
    if (description !== undefined) loan.description = description;

    // Re-calculate EMI if amount, roi, or tenure changes and emi isn't manually specified
    if (amount !== undefined || roi !== undefined || tenure !== undefined) {
      if (!monthlyEMI) {
        const r = ((roi !== undefined ? roi : loan.roi) / 12) / 100;
        const n = (tenure !== undefined ? tenure : loan.tenure);
        loan.monthlyEMI = r > 0 ? ((amount !== undefined ? amount : loan.amount) * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : (amount !== undefined ? amount : loan.amount) / n;
      } else {
        loan.monthlyEMI = monthlyEMI;
      }
    } else if (monthlyEMI !== undefined) {
      loan.monthlyEMI = monthlyEMI;
    }

    await loan.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update loan' });
  }
});

// DELETE a loan
router.delete('/loans/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    res.json({ success: true, message: 'Loan deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete loan' });
  }
});

// GET Ad Account Billing Summary
router.get('/ad-billing/summary', async (req, res) => {
  try {
    const summary = await adAccountBillingService.getAdAccountSpendSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch ad account summary' });
  }
});

export default router;
