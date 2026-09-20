import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Users,
  CreditCard,
  UserCheck,
  Wrench,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const AdminDashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/reports/dashboard-metrics');
        if (res.data.success) {
          setMetrics(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sample data for charts
  const collectionTrendData = [
    { month: 'Mar', billing: 50000, collection: 42000 },
    { month: 'Apr', billing: 52000, collection: 48000 },
    { month: 'May', billing: 55000, collection: 53000 },
    { month: 'Jun', billing: 54000, collection: 51000 },
    { month: 'Jul', billing: 65000, collection: 62000 },
    { month: 'Aug', billing: metrics?.totalCurrentMonthBill || 70000, collection: metrics?.monthCollection || 68500 },
  ];

  const trendData = metrics?.monthlyTrendData && metrics.monthlyTrendData.length > 0
    ? metrics.monthlyTrendData
    : collectionTrendData;

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Current Month Bill */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Current Month Bill</p>
              <h3 className="text-2xl font-extrabold text-sky-400 mt-1">
                ₹{(metrics?.totalCurrentMonthBill || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2">New Issued Charges</p>
            </div>
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Collected Amounts */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collected Amounts</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">
                ₹{(metrics?.monthCollection || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                All-Time: ₹{(metrics?.totalCollection || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Yet to Collect */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Yet to Collect</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">
                ₹{(metrics?.totalPendingAmount || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Total Pending Balance</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Old Pendings */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Old Pendings</p>
              <h3 className="text-2xl font-extrabold text-red-400 mt-1">
                ₹{(metrics?.totalOldBalance || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Past Unpaid Accumulated</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Customers & Active Field Techs */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscribers</p>
              <h3 className="text-2xl font-extrabold text-purple-300 mt-1">{metrics?.activeCustomers || 0}</h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                {metrics?.totalCustomers || 0} Total Customers
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tickers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Growth Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Billing vs Collection Trend (₹)</h3>
              <p className="text-xs text-slate-400">Comparing monthly billing generated against collections</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Billing
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Collection
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorBilling" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any, name: any) => [
                    `₹${Number(val).toLocaleString('en-IN')}`,
                    name === 'billing' ? 'Monthly Billing' : 'Collection'
                  ]}
                />
                <Area type="monotone" dataKey="billing" name="billing" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorBilling)" />
                <Area type="monotone" dataKey="collection" name="collection" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollection)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints Status Widget */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Customer Complaints</h3>
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-time complaint tickets overview</p>
          </div>

          <div className="space-y-3 my-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                Open Tickets
              </span>
              <span className="text-sm font-bold text-red-400">{metrics?.complaints?.open || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Assigned / In Progress
              </span>
              <span className="text-sm font-bold text-amber-400">
                {(metrics?.complaints?.assigned || 0) + (metrics?.complaints?.inProgress || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Completed Tickets
              </span>
              <span className="text-sm font-bold text-emerald-400">{metrics?.complaints?.completed || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center justify-between">
            <span>Auto Nearest-Agent Assignment</span>
            <span className="font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

