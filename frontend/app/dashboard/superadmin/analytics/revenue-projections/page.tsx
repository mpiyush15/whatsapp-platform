"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/config/api";
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Sliders,
  AlertTriangle,
  Info,
  Banknote,
} from "lucide-react";

type Scenario = "base" | "optimistic" | "conservative";
type ProjectionPoint = {
  month: number;
  projectedMrr: number;
  projectedArr: number;
  growthImpact: number;
  churnImpact: number;
  newMrrFromLeads: number;
};

type RevenuePayload = {
  scenario: Scenario;
  generatedAt: string;
  summary: {
    mrrCurrent: number;
    arrCurrent: number;
    activeSubscriptions: number;
    churnRiskAccounts: number;
  };
  renewalPipeline: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
  };
};

type FinanceAnalytics = {
  monthly: {
    label: string;
    revenue: number;
    expense: number;
    profit: number;
  }[];
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  expensesByCategory: {
    category: string;
    amount: number;
  }[];
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-3 text-sm text-slate-100 shadow-lg">
        <p className="font-bold text-base mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {`${p.name}: ${formatINR(p.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value, icon, color, tooltipText }: { title: string, value: string, icon: React.ReactNode, color: string, tooltipText: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="relative">
          <button onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} className="text-slate-500 hover:text-slate-300">
            <Info className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute bottom-full mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg z-10 right-0">
              {tooltipText}
            </div>
          )}
        </div>
      </div>
      <h3 className={`text-3xl font-extrabold ${color} tracking-tight mt-2`}>
        {value}
      </h3>
    </div>
  );
};


export default function RevenueProjectionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [baseData, setBaseData] = useState<RevenuePayload | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<FinanceAnalytics | null>(null);
  const [stageConversionRates, setStageConversionRates] = useState({
    new: 2,
    contacted: 10,
    qualified: 25,
    negotiating: 60,
  });
  const [salesCycle, setSalesCycle] = useState(4); // in months
  const [monthlyChurnRate, setMonthlyChurnRate] = useState(1.5); // in %

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token =
        localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [projRes, leadsRes, financeRes] = await Promise.all([
        fetch(
          `${API_URL}/admin/analytics/revenue-projections?scenario=base`,
          { headers }
        ),
        fetch(`${API_URL}/admin/platform-leads?limit=5000`, { headers }),
        fetch(`${API_URL}/superadmin/finance/analytics`, { headers }),
      ]);

      const projPayload = await projRes.json();
      if (!projRes.ok || !projPayload?.success) {
        throw new Error(
          projPayload?.message || "Failed to load revenue projections"
        );
      }
      setBaseData(projPayload?.data || null);

      const leadsPayload = await leadsRes.json();
      if (leadsRes.ok && leadsPayload?.success) {
        setLeads(leadsPayload.data?.leads || []);
      }
      
      const financePayload = await financeRes.json();
      if (financeRes.ok && financePayload?.success) {
        setFinanceData(financePayload.data || null);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const { projectionData, rawPipelineValue, expectedRevenueFromPipeline, actualPipelineRevenue } = useMemo(() => {
    if (!baseData) return { projectionData: [], rawPipelineValue: 0, expectedRevenueFromPipeline: 0, actualPipelineRevenue: 0 };

    const activePipelineStatuses = ['new', 'contacted', 'qualified', 'negotiating'];
    
    // 1. Calculate the total raw value of the active pipeline
    const currentRawPipelineValue = leads
      .filter(lead => activePipelineStatuses.includes(lead.status) && lead.conversionValue > 0)
      .reduce((sum, lead) => sum + lead.conversionValue, 0);

    // 2. Determine the total expected revenue from this pipeline based on the stage-gate model
    const currentExpectedRevenue = leads
      .filter(lead => activePipelineStatuses.includes(lead.status) && lead.conversionValue > 0)
      .reduce((sum, lead) => {
        const rate = stageConversionRates[lead.status as keyof typeof stageConversionRates] || 0;
        return sum + (lead.conversionValue * (rate / 100));
      }, 0);

    // Calculate actual revenue from won leads
    const actualPipelineRevenue = leads
      .filter(lead => lead.status === 'converted' && lead.conversionValue > 0)
      .reduce((sum, lead) => sum + lead.conversionValue, 0);

    // 3. Distribute this revenue over the sales cycle
    const newMrrFromLeadsPerMonth = salesCycle > 0 ? currentExpectedRevenue / salesCycle : 0;

    let projectedMrr = baseData.summary.mrrCurrent;
    const { monthlyGrowthRate } = { monthlyGrowthRate: 0.03 }; // Expansion from existing

    const projections: ProjectionPoint[] = [];

    for (let month = 1; month <= 12; month++) {
      const growthImpact = projectedMrr * monthlyGrowthRate;
      
      // Assume new MRR from the current pipeline is realized over the sales cycle
      const newMrrThisMonth = month <= salesCycle ? newMrrFromLeadsPerMonth : 0;
      
      const churnImpact = projectedMrr * (monthlyChurnRate / 100);

      projectedMrr = projectedMrr + growthImpact + newMrrThisMonth - churnImpact;

      projections.push({
        month,
        projectedMrr: Math.max(0, projectedMrr),
        projectedArr: Math.max(0, projectedMrr * 12),
        growthImpact,
        churnImpact,
        newMrrFromLeads: newMrrThisMonth,
      });
    }
    return { 
      projectionData: projections, 
      rawPipelineValue: currentRawPipelineValue, 
      expectedRevenueFromPipeline: currentExpectedRevenue,
      actualPipelineRevenue
    };
  }, [
    baseData,
    leads,
    stageConversionRates,
    salesCycle,
    monthlyChurnRate,
  ]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-slate-400">
            Loading Revenue Intelligence...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500" />
          <h2 className="text-xl font-bold">Failed to Load Data</h2>
          <p className="text-slate-400 max-w-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  const finalSixMonthMrr = projectionData[5]?.projectedMrr || 0;
  const finalTwelveMonthMrr = projectionData[11]?.projectedMrr || 0;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Revenue Intelligence & Projection
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic MRR/ARR forecast with CRM sales signals and financial data.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel: Controls & KPIs */}
          <div className="lg:col-span-1 space-y-8">
            {/* KPI Cards */}
            <div className="space-y-4">
              <KpiCard
                title="Current MRR"
                value={formatINR(baseData?.summary?.mrrCurrent || 0)}
                icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
                color="text-white"
                tooltipText="The total predictable revenue your business receives every month from active subscriptions."
              />
              <KpiCard
                title="Pipeline Revenue (Total)"
                value={formatINR(rawPipelineValue)}
                icon={<Target className="h-5 w-5 text-amber-400" />}
                color="text-amber-400"
                tooltipText="The total potential revenue of all open deals in your sales pipeline, without considering the likelihood of closing."
              />
              <KpiCard
                title="Weighted Pipeline"
                value={formatINR(expectedRevenueFromPipeline)}
                icon={<Target className="h-5 w-5 text-indigo-400" />}
                color="text-indigo-400"
                tooltipText="A more realistic revenue forecast, calculated by multiplying each deal's value by its probability of closing based on its current stage."
              />
              <KpiCard
                title="Actual Revenue from Won Leads"
                value={formatINR(actualPipelineRevenue)}
                icon={<Banknote className="h-5 w-5 text-emerald-400" />}
                color="text-emerald-400"
                tooltipText="The total revenue generated from leads that have been marked as 'won'."
              />
              <KpiCard
                title="12-Month Forecast"
                value={formatINR(finalTwelveMonthMrr)}
                icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
                color="text-violet-400"
                tooltipText="An estimation of your Monthly Recurring Revenue 12 months from now, based on current MRR, growth rates, churn rates, and sales pipeline."
              />
            </div>

            {/* Interactive Controls */}
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-500" />
                Scenario Controls
              </h3>
              {/* Sales Cycle */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-300">Sales Cycle Length</label>
                  <span className="text-sm font-bold text-indigo-400">{salesCycle} Months</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={salesCycle}
                  onChange={(e) => setSalesCycle(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              {/* Monthly Churn Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-300">Monthly Churn Rate</label>
                  <span className="text-sm font-bold text-rose-400">{monthlyChurnRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={monthlyChurnRate}
                  onChange={(e) => setMonthlyChurnRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
             <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-amber-500" />
                    Pipeline Conversion
                </h3>
                {Object.keys(stageConversionRates).map(stage => (
                    <div key={stage} className="space-y-2">
                        <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-300 capitalize">{stage}</label>
                        <span className="text-sm font-bold text-amber-400">{stageConversionRates[stage as keyof typeof stageConversionRates].toFixed(1)}%</span>
                        </div>
                        <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={stageConversionRates[stage as keyof typeof stageConversionRates]}
                        onChange={(e) => setStageConversionRates(prev => ({...prev, [stage]: Number(e.target.value)}))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>
                ))}
            </div>
          </div>

          {/* Right Panel: Charts */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-4">12-Month Revenue & Profit Projection</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionData.map(p => ({...p, month: `M+${p.month}`, projectedProfit: p.projectedMrr - (financeData?.totalExpense || 0) }))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => formatINR(val)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                    <Area type="monotone" dataKey="projectedMrr" name="Projected MRR" stroke="#818cf8" fill="url(#colorMrr)" strokeWidth={2} />
                    <Line type="monotone" dataKey="projectedProfit" name="Projected Profit" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Monthly MRR Growth Components</h3>
               <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData.map(p => ({...p, month: `M+${p.month}`}))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => formatINR(val)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                    <Bar dataKey="newMrrFromLeads" name="New from Leads" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="growthImpact" name="Expansion" stackId="a" fill="#10b981" />
                    <Bar dataKey="churnImpact" name="Churn" stackId="b" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
