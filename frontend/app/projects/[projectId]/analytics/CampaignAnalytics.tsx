import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, Users, Target, ArrowRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CampaignAnalytics({ view = 'funnel' }: { view?: 'funnel' | 'revenue' }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [costPerMessage, setCostPerMessage] = useState(0.80);

  const metrics = useMemo(() => {
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalReplied = 0;
    let totalQualified = 0;
    let totalWon = 0;
    let totalLost = 0;
    let totalRevenue = 0;

    campaigns.forEach(c => {
      totalSent += c.stats?.totalSent || 0;
      totalDelivered += c.stats?.totalDelivered || 0;
      totalRead += c.stats?.totalOpened || 0;
      totalReplied += c.stats?.totalReplied || 0;
      totalQualified += c.stats?.totalQualified || 0;
      totalWon += c.stats?.totalWon || 0;
      totalLost += c.stats?.totalLost || 0;
      totalRevenue += c.stats?.estimatedRevenue || 0;
    });

    const totalCost = totalSent * costPerMessage;
    
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    const roas = totalCost > 0 ? totalRevenue / totalCost : 0;
    const cpa = totalWon > 0 ? totalCost / totalWon : 0;
    const conversionRate = totalDelivered > 0 ? (totalWon / totalDelivered) * 100 : 0;

    return {
      totalSent, totalDelivered, totalRead, totalReplied, totalQualified, totalWon, totalLost,
      totalCost, totalRevenue, roi, roas, cpa, conversionRate
    };
  }, [campaigns, costPerMessage]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, { date: string, spend: number, revenue: number }> = {};
    
    campaigns.forEach(c => {
      if (!c.createdAt) return;
      const date = new Date(c.createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      if (!dailyMap[date]) dailyMap[date] = { date, spend: 0, revenue: 0 };
      
      const sent = c.stats?.totalSent || 0;
      const rev = c.stats?.estimatedRevenue || 0;
      
      dailyMap[date].spend += sent * costPerMessage;
      dailyMap[date].revenue += rev;
    });

    return Object.values(dailyMap).slice(-14); // Last 14 days
  }, [campaigns, costPerMessage]);

  const leaderboard = useMemo(() => {
    return [...campaigns].map(c => {
      const sent = c.stats?.totalSent || 0;
      const rev = c.stats?.estimatedRevenue || 0;
      const cost = sent * costPerMessage;
      const roas = cost > 0 ? rev / cost : 0;
      return { ...c, cost, rev, roas };
    }).sort((a, b) => b.roas - a.roas).slice(0, 5);
  }, [campaigns, costPerMessage]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const payload = await res.json();
          const list = payload?.data?.campaigns || payload?.campaigns || [];
          setCampaigns(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to load campaigns for analytics', err);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchCampaigns();
  }, [projectId]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500 animate-pulse">Loading campaign analytics...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {view === 'funnel' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Sales Qualified</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalQualified}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Target className="w-6 h-6"/></div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Deals Won</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalWon}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Deals Lost</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalLost}</p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Users className="w-6 h-6"/></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Conversion Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><ArrowRight className="w-6 h-6"/></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Marketing to Sales Funnel</h3>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-4">
              {[
                { label: 'Messages Sent', val: metrics.totalSent, color: 'bg-blue-100 text-blue-700 border-blue-200' },
                { label: 'Delivered', val: metrics.totalDelivered, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
                { label: 'Opened/Read', val: metrics.totalRead, color: 'bg-purple-100 text-purple-700 border-purple-200' },
                { label: 'Replied/Engaged', val: metrics.totalReplied, color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
                { label: 'Qualified Leads', val: metrics.totalQualified, color: 'bg-pink-100 text-pink-700 border-pink-200' },
                { label: 'Closed Won', val: metrics.totalWon, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              ].map((step, idx, arr) => (
                <React.Fragment key={idx}>
                  <div className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 w-full md:w-40 h-32 ${step.color} transition-transform hover:scale-105`}>
                    <p className="text-2xl font-bold">{step.val}</p>
                    <p className="text-xs font-semibold text-center mt-1 uppercase tracking-wide">{step.label}</p>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight className="text-gray-300 w-8 h-8 hidden md:block" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'revenue' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Est. Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{metrics.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign className="w-6 h-6"/></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Campaign Cost</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{metrics.totalCost.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><DollarSign className="w-6 h-6"/></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Total ROI</p>
                  <p className={`text-3xl font-bold mt-2 ${metrics.roi > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {metrics.roi > 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Cost Per Acq.</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{metrics.cpa.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Target className="w-6 h-6"/></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Growth & Spend</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₹${value.toFixed(0)}`, '']}
                    />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="spend" name="Spend" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Campaigns (ROAS)</h3>
              <div className="space-y-4">
                {leaderboard.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm truncate max-w-[120px]" title={c.name}>{c.name}</p>
                        <p className="text-xs text-gray-500">ROAS: {c.roas.toFixed(2)}x</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">₹{c.rev.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-10">No campaigns found.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
