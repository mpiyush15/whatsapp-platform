// frontend/app/dashboard/superadmin/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config/api";
import { authService } from "@/lib/auth";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  Landmark,
  CreditCard,
  Layers,
  Percent,
  Trash2,
  Loader2,
  Megaphone,
  AlertTriangle,
} from "lucide-react";

type TimeframeData = {
  label: string;
  revenue: number;
  expense: number;
  profit: number;
};

type CategoryData = {
  category: string;
  amount: number;
};

type Expense = {
  _id: string;
  type: string;
  amount: number;
  date: string;
  description?: string;
  isRecurring?: boolean;
  frequency?: string;
};

type RevenueTransaction = {
  orderId: string;
  amount: number;
  createdAt: string;
  gateway?: string;
  paymentMethod?: string;
  planName?: string;
};

type Loan = {
  _id: string;
  lender: string;
  amount: number;
  roi: number;
  tenure: number;
  startDate: string;
  repaymentStatus: 'active' | 'paid' | 'defaulted';
  monthlyEMI?: number;
  description?: string;
};

type AnalyticsData = {
  monthly: TimeframeData[];
  quarterly: TimeframeData[];
  yearly: TimeframeData[];
  expensesByCategory: CategoryData[];
  recentExpenses: Expense[];
  recentRevenue: RevenueTransaction[];
  loans?: Loan[];
  activeLoansCount?: number;
};

type AdBillingSummary = {
  accountId: string;
  amountSpent: number;
  spendCap: number;
  currency: string;
  usagePercentage: number;
  status: string;
  isMock: boolean;
};

const CHART_COLORS = ["#6366f1", "#10b981", "#f43f5e", "#eab308", "#a855f7", "#ec4899", "#14b8a6"];

const plans = [
  { name: "Starter Plan", price: 2999 },
  { name: "Growth Plan", price: 5999 },
  { name: "Enterprise Plan", price: 12999 },
];

export default function PremiumAccountsPage() {
  const [timeframe, setTimeframe] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Top-level page tab selection: report, expenses, revenue, loans, ads
  const [pageTab, setPageTab] = useState<"report" | "expenses" | "revenue" | "loans" | "ads">("report");
  const [adSummary, setAdSummary] = useState<AdBillingSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");

  // Break-even state values
  const [arpuRate, setArpuRate] = useState<number>(2999);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("custom");

  // Loan form / modal state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [newLoan, setNewLoan] = useState({
    lender: "",
    amount: 0,
    roi: 0,
    tenure: 12,
    startDate: new Date().toISOString().split("T")[0],
    repaymentStatus: "active" as "active" | "paid" | "defaulted",
    monthlyEMI: 0,
    description: "",
  });

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRecurring, setSelectedRecurring] = useState<string>("all");

  // Expense form state
  const [newExp, setNewExp] = useState({
    type: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    description: "",
    isRecurring: false,
    frequency: "",
  });

  const token = typeof window !== "undefined" ? authService.getToken() : null;

  const fetchAnalytics = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [analyticsRes, expensesRes, adRes] = await Promise.all([
        fetch(`${API_URL}/superadmin/finance/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/superadmin/finance/expenses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/superadmin/finance/ad-billing/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      const analyticsJson = await analyticsRes.json();
      const expensesJson = await expensesRes.json();
      
      if (adRes.ok) {
        const adJson = await adRes.json();
        if (adJson.success) {
          setAdSummary(adJson.data);
        }
      }

      if (analyticsJson.success) {
        setAnalytics(analyticsJson.data);
      } else {
        setError(analyticsJson.message || "Failed to load financial analytics");
      }

      if (expensesJson.success) {
        setExpenses(expensesJson.data);
      }
    } catch (e) {
      setError("Unable to connect to financial services");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(true);
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.type || newExp.amount <= 0) {
      alert("Please provide a valid category type and amount.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/superadmin/finance/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newExp),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setSelectedLoanId("");
        setNewExp({
          type: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
          description: "",
          isRecurring: false,
          frequency: "",
        });
        fetchAnalytics();
      } else {
        alert(json.message || "Failed to save expense");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API_URL}/superadmin/finance/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchAnalytics();
        alert("Expense deleted successfully.");
      } else {
        alert(json.message || "Failed to delete expense");
      }
    } catch {
      alert("Error deleting expense.");
    }
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.lender || newLoan.amount <= 0 || newLoan.roi < 0 || newLoan.tenure < 1) {
      alert("Please provide valid lender, amount, ROI, and tenure.");
      return;
    }
    try {
      setSubmittingLoan(true);
      const url = editingLoanId 
        ? `${API_URL}/superadmin/finance/loans/${editingLoanId}` 
        : `${API_URL}/superadmin/finance/loans`;
      const method = editingLoanId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newLoan),
      });
      const json = await res.json();
      if (json.success) {
        setIsLoanModalOpen(false);
        setEditingLoanId(null);
        setNewLoan({
          lender: "",
          amount: 0,
          roi: 0,
          tenure: 12,
          startDate: new Date().toISOString().split("T")[0],
          repaymentStatus: "active",
          monthlyEMI: 0,
          description: "",
        });
        fetchAnalytics();
      } else {
        alert(json.message || "Failed to save loan");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loan/debt record?")) return;
    try {
      const res = await fetch(`${API_URL}/superadmin/finance/loans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchAnalytics();
        alert("Loan record deleted successfully.");
      } else {
        alert(json.message || "Failed to delete loan");
      }
    } catch {
      alert("Error deleting loan.");
    }
  };

  const handleEditLoanClick = (loan: Loan) => {
    setEditingLoanId(loan._id);
    setNewLoan({
      lender: loan.lender,
      amount: loan.amount,
      roi: loan.roi,
      tenure: loan.tenure,
      startDate: new Date(loan.startDate).toISOString().split("T")[0],
      repaymentStatus: loan.repaymentStatus,
      monthlyEMI: loan.monthlyEMI || 0,
      description: loan.description || "",
    });
    setIsLoanModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Loading Financial Dashboard...</p>
        </div>
      </div>
    );
  }

  // Get current active timeframe series
  const chartData = analytics ? analytics[timeframe] : [];

  // Calculate totals for active timeframe
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate loan / debt statistics
  const activeLoans = (analytics?.loans || []).filter(l => l.repaymentStatus === 'active');
  const totalActiveDebt = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalMonthlyEMILoad = activeLoans.reduce((sum, l) => {
    let emi = l.monthlyEMI;
    if (emi === undefined || emi === null || emi === 0) {
      const r = (l.roi / 12) / 100;
      const n = l.tenure;
      emi = r > 0 ? (l.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : l.amount / n;
    }
    return sum + emi;
  }, 0);
  const totalInterestToPay = activeLoans.reduce((sum, l) => {
    let emi = l.monthlyEMI;
    if (emi === undefined || emi === null || emi === 0) {
      const r = (l.roi / 12) / 100;
      const n = l.tenure;
      emi = r > 0 ? (l.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : l.amount / n;
    }
    const totalRep = emi * l.tenure;
    const interest = totalRep - l.amount;
    return sum + interest;
  }, 0);
  const weightedRoiSum = activeLoans.reduce((sum, l) => sum + (l.roi * l.amount), 0);
  const averageRoi = totalActiveDebt > 0 ? (weightedRoiSum / totalActiveDebt) : 0;

  // Calculate total monthly recurring expenses
  const totalMonthlyRecurringExpenses = expenses.reduce((sum, exp) => {
    if (!exp.isRecurring) return sum;
    const freq = (exp.frequency || 'monthly').toLowerCase();
    let monthlyAmount = exp.amount;
    if (freq === 'daily') monthlyAmount = exp.amount * 30;
    else if (freq === 'weekly') monthlyAmount = exp.amount * 4.33;
    else if (freq === 'yearly') monthlyAmount = exp.amount / 12;
    return sum + monthlyAmount;
  }, 0);

  const totalMonthlyFixedCosts = totalMonthlyRecurringExpenses + totalMonthlyEMILoad;

  // Expenses Category data preparation
  const categoryData = analytics?.expensesByCategory || [];
  const totalCategoryAmount = categoryData.reduce((sum, c) => sum + c.amount, 0);

  // Get filtered expenses for expenses tab
  const filteredExpenses = (expenses || []).filter((exp) => {
    const matchesCategory = selectedCategory === "all" || exp.type === selectedCategory;
    const matchesRecurring = selectedRecurring === "all" || 
      (selectedRecurring === "recurring" && exp.isRecurring) || 
      (selectedRecurring === "onetime" && !exp.isRecurring);
    return matchesCategory && matchesRecurring;
  });

  // Calculate totals based on filtered expenses
  const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const filteredRecurring = filteredExpenses.filter((exp) => exp.isRecurring).reduce((sum, exp) => sum + exp.amount, 0);
  const filteredOnetime = filteredExpenses.filter((exp) => !exp.isRecurring).reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Glassmorphic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Superadmin Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Financial Operations</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time revenue flows, business expenses, and metrics analytics.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {pageTab === "loans" ? (
            <button
              onClick={() => {
                setEditingLoanId(null);
                setNewLoan({
                  lender: "",
                  amount: 0,
                  roi: 0,
                  tenure: 12,
                  startDate: new Date().toISOString().split("T")[0],
                  repaymentStatus: "active",
                  monthlyEMI: 0,
                  description: "",
                });
                setIsLoanModalOpen(true);
              }}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 transition px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-rose-600/20"
            >
              <Plus className="h-4 w-4" /> Record Loan / Debt
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl text-rose-400 text-sm">
          <TrendingDown className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Selector & Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-2">
        {/* Tabs Selector Navigation */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setPageTab("report")}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              pageTab === "report" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Financial Report
          </button>
          <button
            onClick={() => setPageTab("expenses")}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              pageTab === "expenses" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setPageTab("revenue")}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              pageTab === "revenue" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Incoming Revenue
          </button>
          <button
            onClick={() => setPageTab("loans")}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              pageTab === "loans" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Loans & Debts
          </button>
          <button
            onClick={() => setPageTab("ads")}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              pageTab === "ads" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Ad Spend
          </button>
        </div>

        {/* Filters (aligned to right, visible only in expenses tab) */}
        {pageTab === "expenses" && (
          <div className="flex items-center gap-4 bg-slate-900/30 border border-slate-850 px-4 py-2 rounded-xl">
            {/* Category Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Category Filter</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">All Categories</option>
                <option value="Hosting & Infrastructure">Hosting & Infrastructure</option>
                <option value="Domain & SSL">Domain & SSL</option>
                <option value="WhatsApp Charges">WhatsApp Charges</option>
                <option value="AI Tools">AI Tools</option>
                <option value="Software Subscriptions">Software Subscriptions</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
                <option value="Sales & Outreach">Sales & Outreach</option>
                <option value="Travel & Transportation">Travel & Transportation</option>
                <option value="Internet & Telecom">Internet & Telecom</option>
                <option value="Accounting & CA">Accounting & CA</option>
                <option value="Payment Gateway Fees">Payment Gateway Fees</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            {/* Recurring Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Cost Type Filter</span>
              <select
                value={selectedRecurring}
                onChange={(e) => setSelectedRecurring(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">All Types</option>
                <option value="recurring">Recurring Only</option>
                <option value="onetime">One-time Only</option>
              </select>
            </div>

            {/* Clear Button */}
            {(selectedCategory !== "all" || selectedRecurring !== "all") && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedRecurring("all");
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition pt-3"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: FINANCIAL REPORT */}
      {pageTab === "report" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Timeframe selector header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              Performance Metrics
            </h2>
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {(["monthly", "quarterly", "yearly"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    timeframe === tf
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Analytics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card: Total Revenue */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-white tracking-tight">
                  ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-xs font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  <span>Flowing from dynamic client subscriptions</span>
                </div>
              </div>
            </div>

            {/* Card: Total Expense */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition"></div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-white tracking-tight">
                  ₹{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs font-semibold">
                  <TrendingDown className="h-3 w-3" />
                  <span>Operating costs and infrastructure</span>
                </div>
              </div>
            </div>

            {/* Card: Net Profit */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition"></div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Profit</span>
                <div className={`p-2 rounded-lg ${netProfit >= 0 ? "bg-indigo-500/10 text-indigo-400" : "bg-rose-500/10 text-rose-400"}`}>
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-3xl font-extrabold tracking-tight ${netProfit >= 0 ? "text-indigo-400" : "text-rose-400"}`}>
                  ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${netProfit >= 0 ? "text-indigo-400" : "text-rose-400"}`}>
                  <Percent className="h-3 w-3" />
                  <span>Earnings after infrastructure deduction</span>
                </div>
              </div>
            </div>

            {/* Card: Profit Margin */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 h-24 w-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition"></div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Profit Margin</span>
                <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-white tracking-tight">
                  {profitMargin.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-violet-400 text-xs font-semibold">
                  <Percent className="h-3 w-3" />
                  <span>Total profitability efficiency</span>
                </div>
              </div>
            </div>

            {/* Card: Total Active Debt */}
            <div 
              onClick={() => setPageTab("loans")}
              className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-rose-500/50 hover:bg-slate-905 cursor-pointer transition"
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition"></div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Active Debt</span>
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-450">
                  <Landmark className="h-5 w-5 text-rose-400" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-rose-400 tracking-tight">
                  ₹{totalActiveDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-rose-500/80 text-xs font-semibold">
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                  <span>Avg ROI we pay: {averageRoi.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Charts & Visualizations */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Composed Chart: Revenue vs Expenses over Time */}
            <div className="xl:col-span-2 bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Financial Breakdown over Time</h3>
                <span className="text-xs text-slate-400 font-medium capitalize">{timeframe} Series</span>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", borderRadius: "12px" }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, ""]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                    <Area type="monotone" dataKey="revenue" fill="url(#colorRev)" stroke="#10b981" strokeWidth={2} name="Revenue" />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} name="Expense" />
                    <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Net Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Expenses by Category */}
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-indigo-500" />
                  Expense Distribution
                </h3>
                <span className="text-xs text-slate-400 font-medium">By Category</span>
              </div>

              {categoryData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8">
                  <PieIcon className="h-12 w-12 mb-3 text-slate-700" />
                  <p className="text-sm">No expense records found</p>
                </div>
              ) : (
                <>
                  {/* Pie Visualizer */}
                  <div className="h-[220px] w-full flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px" }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString()}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category list with percentages */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] pr-2">
                    {categoryData.map((item, idx) => {
                      const percentage = totalCategoryAmount > 0 ? (item.amount / totalCategoryAmount) * 100 : 0;
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}></span>
                              <span className="capitalize">{item.category}</span>
                            </div>
                            <span className="text-slate-400">₹{item.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Break-even Projections Section */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  Liabilities & Break-even Projections
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Determines the number of active clients required to offset fixed costs and active loan repayments.
                </p>
              </div>

              {/* Calculator Settings */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Plan Template</span>
                  <select
                    className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    value={selectedPlanId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPlanId(val);
                      if (val !== "custom") {
                        const matched = plans.find(p => p.name === val);
                        if (matched) setArpuRate(matched.price);
                      }
                    }}
                  >
                    <option value="custom">Custom Rate</option>
                    {plans.map(p => (
                      <option key={p.name} value={p.name}>{p.name} (₹{p.price}/mo)</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">ARPU (₹ / Client / Mo)</span>
                  <input
                    type="number"
                    min={1}
                    className="w-28 bg-slate-905 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                    value={arpuRate}
                    onChange={(e) => {
                      setArpuRate(Number(e.target.value));
                      setSelectedPlanId("custom");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cost Summary Column */}
              <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Monthly Fixed Expenses</span>
                  <div className="space-y-2 text-sm mt-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Recurring Expenses:</span>
                      <span className="font-semibold text-slate-200">₹{totalMonthlyRecurringExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Active Loan EMI Obligations:</span>
                      <span className="font-semibold text-rose-400">₹{totalMonthlyEMILoad.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="h-px bg-slate-800 my-1"></div>
                    <div className="flex justify-between font-bold text-white">
                      <span>Total Fixed Liabilities:</span>
                      <span>₹{totalMonthlyFixedCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">EMI obligations are synced dynamically from your active loans.</p>
              </div>

              {/* Break-even Targets */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Monthly target */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl text-center flex flex-col justify-center space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">Monthly Break-even</span>
                  <h4 className="text-4xl font-extrabold text-white">
                    {arpuRate > 0 ? Math.ceil(totalMonthlyFixedCosts / arpuRate) : 0}
                  </h4>
                  <p className="text-[10px] text-slate-400">Clients @ ₹{arpuRate.toLocaleString()}/mo</p>
                  <p className="text-[9px] text-slate-500">Target Monthly Rev: ₹{totalMonthlyFixedCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>

                {/* Quarterly target */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl text-center flex flex-col justify-center space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Quarterly Break-even</span>
                  <h4 className="text-4xl font-extrabold text-white">
                    {arpuRate > 0 ? Math.ceil((totalMonthlyFixedCosts * 3) / arpuRate) : 0}
                  </h4>
                  <p className="text-[10px] text-slate-400">Clients @ ₹{arpuRate.toLocaleString()}/mo</p>
                  <p className="text-[9px] text-slate-500">Target Quarterly Rev: ₹{(totalMonthlyFixedCosts * 3).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>

                {/* Annual target */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl text-center flex flex-col justify-center space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Annual Break-even</span>
                  <h4 className="text-4xl font-extrabold text-white">
                    {arpuRate > 0 ? Math.ceil((totalMonthlyFixedCosts * 12) / arpuRate) : 0}
                  </h4>
                  <p className="text-[10px] text-slate-400">Clients @ ₹{arpuRate.toLocaleString()}/mo</p>
                  <p className="text-[9px] text-slate-500">Target Annual Rev: ₹{(totalMonthlyFixedCosts * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES LOG */}
      {pageTab === "expenses" && (
        <div className="space-y-6 animate-fadeIn">
          


          {/* Amount Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Filtered Card */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Filtered Cost</span>
              <h3 className="text-3xl font-extrabold text-rose-400 tracking-tight mt-2">
                ₹{filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Sum of filtered expense records</p>
            </div>

            {/* Recurring Total Card */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recurring Share</span>
              <h3 className="text-3xl font-extrabold text-indigo-400 tracking-tight mt-2">
                ₹{filteredRecurring.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Sum of matching recurring costs</p>
            </div>

            {/* One-time Total Card */}
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">One-Time Share</span>
              <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight mt-2">
                ₹{filteredOnetime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Sum of matching ad-hoc costs</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                Operational Expenses Log
              </h3>
              <span className="text-xs text-slate-400 font-medium font-mono">Showing {filteredExpenses.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/25">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Recurring</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                        No expense records found matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-900/20 transition text-sm">
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {new Date(exp.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {exp.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-[240px] truncate" title={exp.description}>
                          {exp.description || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {exp.isRecurring ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Yes ({exp.frequency})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-bold">
                          ₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INCOMING REVENUE */}
      {pageTab === "revenue" && (
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-500" />
              Incoming Realized Revenue Ledger
            </h3>
            <span className="text-xs text-slate-400 font-medium">Showing last 10 entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/25">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Plan Name</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {(analytics?.recentRevenue || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      No incoming payment logs found.
                    </td>
                  </tr>
                ) : (
                  (analytics?.recentRevenue || []).map((rev) => (
                    <tr key={rev.orderId} className="hover:bg-slate-900/20 transition text-sm">
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {rev.orderId}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-semibold">
                        {rev.planName || "Add-on Purchase"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-700">
                          {rev.paymentMethod || "UPI"} ({rev.gateway || "Cashfree"})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                        +₹{rev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOANS & DEBTS */}
      {pageTab === "loans" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Amount Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Active Debt</span>
              <h3 className="text-2xl font-extrabold text-rose-400 tracking-tight mt-2">
                ₹{totalActiveDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Total principal balance we owe</p>
            </div>

            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Monthly EMI Load</span>
              <h3 className="text-2xl font-extrabold text-indigo-400 tracking-tight mt-2">
                ₹{totalMonthlyEMILoad.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Monthly repayment obligations</p>
            </div>

            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Interest Obligations</span>
              <h3 className="text-2xl font-extrabold text-violet-400 tracking-tight mt-2">
                ₹{totalInterestToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Total interest to pay over tenure</p>
            </div>

            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Weighted Avg ROI</span>
              <h3 className="text-2xl font-extrabold text-amber-400 tracking-tight mt-2">
                {averageRoi.toFixed(2)}%
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Weighted rate of interest we pay</p>
            </div>

            <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Active Loans Count</span>
              <h3 className="text-2xl font-extrabold text-emerald-400 tracking-tight mt-2">
                {activeLoans.length}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Number of active debt liabilities</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Landmark className="h-4 w-4 text-rose-500" />
                Active & Settled Loans Registry
              </h3>
              <span className="text-xs text-slate-400 font-medium font-mono">Showing {(analytics?.loans || []).length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/25">
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4">Lender / Creditor</th>
                    <th className="px-6 py-4">Principal Amount</th>
                    <th className="px-6 py-4">Rate of Interest (ROI)</th>
                    <th className="px-6 py-4">Tenure</th>
                    <th className="px-6 py-4">Estimated EMI</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(analytics?.loans || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500 text-sm">
                        No loans or debt records found. Click "Record Loan / Debt" to add one.
                      </td>
                    </tr>
                  ) : (
                    (analytics?.loans || []).map((loan) => (
                      <tr key={loan._id} className="hover:bg-slate-900/20 transition text-sm">
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {new Date(loan.startDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>
                        <td className="px-6 py-4 text-slate-200 font-semibold">
                          {loan.lender}
                        </td>
                        <td className="px-6 py-4 text-white font-bold">
                          ₹{loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {loan.roi}% p.a.
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {loan.tenure} months
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          ₹{(() => {
                            let emi = loan.monthlyEMI;
                            if (!emi) {
                              const r = (loan.roi / 12) / 100;
                              const n = loan.tenure;
                              emi = r > 0 ? (loan.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.amount / n;
                            }
                            return emi;
                          })().toLocaleString(undefined, { maximumFractionDigits: 2 })} / mo
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            loan.repaymentStatus === 'active' 
                              ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                              : loan.repaymentStatus === 'paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {loan.repaymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditLoanClick(loan)}
                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2.5 py-1 rounded transition text-xs font-semibold border border-indigo-550/20"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLoan(loan._id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ADS */}
      {pageTab === "ads" && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-500" />
              Centralized Ad Account Billing
            </h2>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl max-w-4xl mx-auto">
            {adSummary ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-extrabold text-white">Meta Ads Spend Limit</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Account ID: <span className="font-mono text-indigo-400">{adSummary.accountId}</span>
                      {adSummary.isMock && <span className="ml-3 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/30">MOCK DATA</span>}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border text-sm font-bold tracking-wider uppercase ${
                    adSummary.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  }`}>
                    {adSummary.status}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-400">Current Spend</span>
                      <div className="text-3xl font-black text-white mt-1">
                        ₹{adSummary.amountSpent.toLocaleString()} <span className="text-lg text-slate-500 font-medium">/ ₹{adSummary.spendCap.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-indigo-400">{adSummary.usagePercentage}% Used</div>
                  </div>

                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden mt-4">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        adSummary.usagePercentage >= 90 ? 'bg-rose-500' :
                        adSummary.usagePercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(adSummary.usagePercentage, 100)}%` }}
                    />
                  </div>
                  
                  {adSummary.usagePercentage >= 90 && (
                    <div className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Warning: Your ad account is nearing its spending limit. Please increase the limit in Meta Business Manager to avoid campaign pauses.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
                <p className="text-slate-400">Fetching ad account data...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Overlay / Modal for Add/Edit Loan */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">{editingLoanId ? "Modify Loan Record" : "Record Loan / Debt"}</h3>
                <p className="text-xs text-slate-400">Record a new business liability, creditor details, ROI and repayment schedule.</p>
              </div>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddLoan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lender / Creditor */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Lender / Creditor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, Creditor Name..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.lender}
                    onChange={(e) => setNewLoan({ ...newLoan, lender: e.target.value })}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Principal Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.amount || ""}
                    onChange={(e) => setNewLoan({ ...newLoan, amount: Number(e.target.value) })}
                  />
                </div>

                {/* ROI */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Rate of Interest (% p.a.)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    placeholder="e.g. 11.5"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.roi || ""}
                    onChange={(e) => setNewLoan({ ...newLoan, roi: Number(e.target.value) })}
                  />
                </div>

                {/* Tenure */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tenure (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 24"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.tenure || ""}
                    onChange={(e) => setNewLoan({ ...newLoan, tenure: Number(e.target.value) })}
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Disbursement Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
                    value={newLoan.startDate}
                    onChange={(e) => setNewLoan({ ...newLoan, startDate: e.target.value })}
                  />
                </div>

                {/* Monthly EMI */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly EMI (INR - Optional)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Auto-calculated if blank"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.monthlyEMI || ""}
                    onChange={(e) => setNewLoan({ ...newLoan, monthlyEMI: Number(e.target.value) })}
                  />
                </div>

                {/* Repayment Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Repayment Status</label>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newLoan.repaymentStatus}
                    onChange={(e) => setNewLoan({ ...newLoan, repaymentStatus: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="paid">Paid / Settled</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Record extra details, payment terms, guarantor info..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
                  value={newLoan.description}
                  onChange={(e) => setNewLoan({ ...newLoan, description: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLoan}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingLoan && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Loan Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Overlay / Modal for Add Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Record Expense</h3>
                <p className="text-xs text-slate-400">Record a new business expense or recurring invoice payment.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category Type</label>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newExp.type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewExp({ ...newExp, type: val });
                      if (val !== "Loan EMI") {
                        setSelectedLoanId("");
                      }
                    }}
                  >
                    <option value="" disabled>Select Category</option>
                    <option value="Hosting & Infrastructure">Hosting & Infrastructure</option>
                    <option value="Domain & SSL">Domain & SSL</option>
                    <option value="WhatsApp Charges">WhatsApp Charges</option>
                    <option value="AI Tools">AI Tools</option>
                    <option value="Software Subscriptions">Software Subscriptions</option>
                    <option value="Marketing & Advertising">Marketing & Advertising</option>
                    <option value="Sales & Outreach">Sales & Outreach</option>
                    <option value="Travel & Transportation">Travel & Transportation</option>
                    <option value="Internet & Telecom">Internet & Telecom</option>
                    <option value="Accounting & CA">Accounting & CA</option>
                    <option value="Payment Gateway Fees">Payment Gateway Fees</option>
                    <option value="Loan EMI">Loan EMI</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                {/* Selected Loan (Visible only if Category is Loan EMI) */}
                {newExp.type === "Loan EMI" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Active Loan</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                      value={selectedLoanId}
                      onChange={(e) => {
                        const loanId = e.target.value;
                        setSelectedLoanId(loanId);
                        const loanObj = activeLoans.find(l => l._id === loanId);
                        if (loanObj) {
                          // Calculate EMI
                          let emi = loanObj.monthlyEMI;
                          if (!emi) {
                            const r = (loanObj.roi / 12) / 100;
                            const n = loanObj.tenure;
                            emi = r > 0 ? (loanObj.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanObj.amount / n;
                          }
                          setNewExp({ ...newExp, amount: Math.round(emi * 100) / 100 });
                          if (!newExp.description) {
                            setNewExp(prev => ({
                              ...prev,
                              description: `Monthly EMI repayment for ${loanObj.lender} loan (Principal: ₹${loanObj.amount.toLocaleString()})`
                            }));
                          }
                        }
                      }}
                    >
                      <option value="">-- Choose Loan --</option>
                      {activeLoans.map(loan => {
                        let emi = loan.monthlyEMI;
                        if (!emi) {
                          const r = (loan.roi / 12) / 100;
                          const n = loan.tenure;
                          emi = r > 0 ? (loan.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.amount / n;
                        }
                        return (
                          <option key={loan._id} value={loan._id}>
                            {loan.lender} (EMI: ₹{Math.round(emi * 100) / 100})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                    value={newExp.amount || ""}
                    onChange={(e) => setNewExp({ ...newExp, amount: Number(e.target.value) })}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
                    value={newExp.date}
                    onChange={(e) => setNewExp({ ...newExp, date: e.target.value })}
                  />
                </div>

                {/* Recurring Options */}
                <div className="flex items-center justify-between md:col-span-1 pt-6 px-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      checked={newExp.isRecurring}
                      onChange={(e) => setNewExp({ ...newExp, isRecurring: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-slate-300">Is Recurring?</span>
                  </label>
                </div>

                {/* Frequency Dropdown */}
                {newExp.isRecurring && (
                  <div className="space-y-1 animate-slide-down">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequency</label>
                    <select
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                      value={newExp.frequency}
                      onChange={(e) => setNewExp({ ...newExp, frequency: e.target.value })}
                    >
                      <option value="">Select Frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide transaction details, description..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
