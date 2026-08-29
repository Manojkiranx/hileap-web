import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import {
  Tv,
  Wifi,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  FileText,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export const CustomerDashboardView: React.FC<{ user: any }> = ({ user }) => {
  const [customer, setCustomer] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Complaint Form State
  const [complaintType, setComplaintType] = useState<string>('NO_INTERNET');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch complaints history
      const compRes = await api.get('/complaints/my-complaints');
      if (compRes.data.success) {
        setComplaints(compRes.data.data);
      }

      // Fetch customer details via dedicated /customers/me endpoint
      const custRes = await api.get('/customers/me');
      if (custRes.data.success) {
        setCustomer(custRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching customer portal data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!description || !description.trim()) {
      setFormError('Please enter a brief description of the issue you are facing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/complaints/customer-raise', {
        complaintType,
        description: description.trim(),
        priority,
      });

      if (res.data.success) {
        setFormSuccess(res.data.message || 'Complaint submitted successfully!');
        setDescription('');
        fetchCustomerData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit complaint.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/20 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              SUBSCRIBER PORTAL
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-2">
              Welcome back, {customer?.name || user?.name || 'Customer'}!
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Customer ID: <span className="font-mono text-sky-300 font-bold">{customer?.customerId || user?.customerId || user?.employeeId}</span> • Area: <span className="text-slate-200">{customer?.area || user?.area || 'N/A'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Subscription Status</p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-0.5 border ${
                  (customer?.status || 'ACTIVE') === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : customer?.status === 'PAUSED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {(customer?.status || 'ACTIVE') === 'ACTIVE'
                  ? 'SUBSCRIBED (ACTIVE)'
                  : customer?.status === 'PAUSED'
                  ? 'PAUSED'
                  : 'UNSUBSCRIBED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Plan & Raise Complaint */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Plan & Hardware Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-sky-400" />
              Your Active Plan & Hardware Details
            </h2>

            {loading ? (
              <p className="text-xs text-slate-400">Loading plan specifications...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Subscription Type</p>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    {customer?.subscriptionType === 'CABLE' && <Tv className="w-4 h-4 text-amber-400" />}
                    {customer?.subscriptionType === 'WIFI' && <Wifi className="w-4 h-4 text-sky-400" />}
                    {customer?.subscriptionType === 'BOTH' && <span className="text-emerald-400 font-extrabold">Cable TV & Wi-Fi Combo</span>}
                    {customer?.subscriptionType || 'Combo Service'}
                  </p>
                  <p className="text-xs text-slate-400">{customer?.planName || 'HiLeap High-Speed Connectivity'}</p>
                </div>

                {(() => {
                  const isOverdue2Months = (customer?.monthlyBill || 0) > 0 && (customer?.pendingAmount || 0) >= (customer?.monthlyBill * 2);
                  return (
                    <div className={`p-4 rounded-xl bg-slate-900/80 border space-y-1 ${isOverdue2Months ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800'}`}>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Monthly Subscription Bill</p>
                      <p className="text-lg font-extrabold text-emerald-400">
                        ₹{(customer?.monthlyBill || 750).toLocaleString('en-IN')} / month
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        Pending Balance:
                        <span className={`font-bold ${isOverdue2Months ? 'text-red-500 animate-pulse font-extrabold flex items-center gap-1' : (customer?.pendingAmount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isOverdue2Months && <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          ₹{(customer?.pendingAmount || 0).toLocaleString('en-IN')}
                        </span>
                        {isOverdue2Months && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-extrabold border border-red-500/40">
                            2+ Months Overdue
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Setup Box / Box ID</p>
                  <p className="text-xs font-mono font-bold text-sky-300">
                    {customer?.boxId || 'BOX-SYSTEM-ASSIGNED'}
                  </p>
                  {customer?.setTopBoxSerial && (
                    <p className="text-[11px] text-slate-400">STB Serial: {customer.setTopBoxSerial}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Wi-Fi Router Serial</p>
                  <p className="text-xs font-mono font-bold text-purple-300">
                    {customer?.routerSerial || 'N/A or Cable Service Only'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Raise Complaint Form */}
          <div className="glass-card p-6 rounded-2xl border border-sky-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-sky-400" />
                  Raise Service Complaint / Issue Ticket
                </h2>
                <p className="text-xs text-slate-400">
                  Directly notify our customer service field technicians. <strong className="text-amber-400">Limit: 1 complaint / day</strong>
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                1 Complaint / Day Max
              </span>
            </div>

            {/* Error / Rate Limit Alert */}
            {formError && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200">Unable to Submit Complaint</p>
                  <p className="mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-200">Complaint Raised!</p>
                  <p className="mt-0.5">{formSuccess}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRaiseComplaint} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Category *</label>
                  <select
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="NO_INTERNET">Wi-Fi No Internet / Connection Down</option>
                    <option value="SIGNAL_ISSUE">Cable TV No Signal / Channel Distorted</option>
                    <option value="BOX_FAULT">Set-Top Box Fault / Replacement Required</option>
                    <option value="ROUTER_FAULT">Modem / Router Hardware Failure</option>
                    <option value="BILLING_DISPUTE">Billing / Payment Dispute</option>
                    <option value="OTHER">Other General Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="LOW">Low - Minor Issue</option>
                    <option value="MEDIUM">Medium - Normal Priority</option>
                    <option value="HIGH">High - Urgent (Service Offline)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description of Problem *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your issue in detail (e.g. Wi-Fi red light blinking since morning)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Complaint Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): Raised Complaints History Ledger */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                My Raised Complaints
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">({complaints.length})</span>
            </h2>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-slate-400">Loading complaints history...</p>
              ) : complaints.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No complaints raised yet. Your service status is clean!
                </p>
              ) : (
                complaints.map((c) => (
                  <div
                    key={c.complaintId}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-sky-400">{c.complaintId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'OPEN'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white">{c.complaintType}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      {c.assignedAgentId && (
                        <span className="text-purple-300 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Agent: {c.assignedAgentId}
                        </span>
                      )}
                    </div>

                    {c.resolutionNotes && (
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-300 mt-1">
                        <strong>Resolution Notes:</strong> {c.resolutionNotes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
