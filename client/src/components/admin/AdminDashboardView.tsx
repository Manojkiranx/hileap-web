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
    { month: 'Mar', collection: 42000 },
    { month: 'Apr', collection: 48000 },
    { month: 'May', collection: 53000 },
    { month: 'Jun', collection: 51000 },
    { month: 'Jul', collection: 62000 },
    { month: 'Aug', collection: metrics?.monthCollection || 68500 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customers</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{metrics?.totalCustomers || 0}</h3>
              <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {metrics?.activeCustomers || 0} Active Subscriptions
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Pending Balance */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Balance</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">
                ₹{(metrics?.totalPendingAmount || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Auto Calculated Ledger</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Current Month Collection */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month Collection</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">
                ₹{(metrics?.monthCollection || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Total: ₹{(metrics?.totalCollection || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Field Service Tech Agents */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Field Techs</p>
              <h3 className="text-2xl font-extrabold text-sky-300 mt-1">{metrics?.serviceAgentsCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                {metrics?.collectionAgentsCount || 0} Collection Agents
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tickers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Growth Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Collection Revenue (₹)</h3>
              <p className="text-xs text-slate-400">Payment collections across cable & Wi-Fi subscribers</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Ledger Sync
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collectionTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collection']}
                />
                <Area type="monotone" dataKey="collection" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
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
