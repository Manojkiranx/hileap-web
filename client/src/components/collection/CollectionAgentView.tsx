import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Search,
  QrCode,
  Phone,
  MapPin,
  X,
  AlertCircle,
} from 'lucide-react';

export const CollectionAgentView: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [settings, setSettings] = useState<any>({
    COMPANY_UPI_ID: 'hileapnetwork@upi',
    COMPANY_UPI_QR_URL: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hileapnetwork@upi&pn=HiLeap%20Network',
  });

  // UPI Payment Modal State
  const [upiModal, setUpiModal] = useState<Customer | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, settingsRes] = await Promise.all([
        api.get('/customers', { params: { search, area: areaFilter } }),
        api.get('/settings'),
      ]);

      if (custRes.data.success) setCustomers(custRes.data.data);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
    } catch (err) {
      console.error('Failed to load collection data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, areaFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenUpiModal = (customer: Customer) => {
    setUpiModal(customer);
    setAmountReceived(String(customer.pendingAmount || customer.monthlyBill || 0));
    setErrorMsg('');
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiModal) return;

    setErrorMsg('');
    const amt = Number(amountReceived);

    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Collection amount must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        customerId: upiModal.customerId,
        amount: amt,
        paymentMethod,
        billingMonth: new Date().toISOString().slice(0, 7),
        notes: `Door-to-door collection by ${user?.name} (${user?.employeeId})`,
      });

      if (res.data.success) {
        setUpiModal(null);
        setAmountReceived('');
        fetchData(); // Refresh pending balances
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment collection recording failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Door-to-Door Payment Collection Desk
          </h2>
          <p className="text-xs text-slate-400">
            Assigned Collection Agent: <strong className="text-white">{user?.name}</strong> ({user?.employeeId})
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer Name, Phone, or Customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <input
          type="text"
          placeholder="Filter locality / area name..."
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Customer Collection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-400">
            Loading subscriber customer accounts...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-400">
            No customers found matching search filters.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.customerId}
              className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{c.name}</h3>
                    <p className="text-xs font-mono text-sky-400">{c.customerId}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <p className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {c.phone}
                  </p>
                  <p className="flex items-start gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{c.address} ({c.area})</span>
                  </p>
                </div>
              </div>

              {/* Financial Pending Breakdown */}
              {(() => {
                const isOverdue2Months = (c.monthlyBill || 0) > 0 && (c.pendingAmount || 0) >= (c.monthlyBill * 2);
                return (
                  <div className={`p-3 bg-slate-900/90 rounded-xl border flex items-center justify-between ${isOverdue2Months ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800'}`}>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        Total Pending
                        {isOverdue2Months && <span className="text-[10px] font-extrabold text-red-400 font-mono">(2+ Months)</span>}
                      </p>
                      <p className={`text-lg font-extrabold ${isOverdue2Months ? 'text-red-500 animate-pulse' : (c.pendingAmount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ₹{(c.pendingAmount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Current Bill</p>
                      <p className="text-xs font-bold text-slate-200">
                        ₹{(c.currentMonthBill || c.monthlyBill).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Action: Collect Payment via UPI */}
              <button
                onClick={() => handleOpenUpiModal(c)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition glow-emerald"
              >
                <QrCode className="w-4 h-4" />
                <span>UPI / Collect Payment</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* UPI Payment Collection Modal (Section 10) */}
      {upiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4 glow-emerald my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Collect Payment - UPI QR
              </h3>
              <button onClick={() => setUpiModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Summary */}
            <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1 text-slate-300">
              <p><strong>Customer Name:</strong> {upiModal.name}</p>
              <p><strong>Customer ID:</strong> {upiModal.customerId}</p>
              <p><strong>Total Pending Balance:</strong> <strong className="text-amber-400">₹{upiModal.pendingAmount || 0}</strong></p>
            </div>

            {/* Company QR Display */}
            <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2">
              <img
                src={settings.COMPANY_UPI_QR_URL}
                alt="Company UPI QR Code"
                className="w-44 h-44 object-contain"
              />
              <p className="text-xs font-bold text-slate-900 font-mono">
                UPI ID: {settings.COMPANY_UPI_ID}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRecordCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="UPI">UPI Scan & Pay</option>
                  <option value="CASH">Cash Received</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Actually Received (₹)</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-base font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUpiModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                >
                  {submitting ? 'Recording...' : 'Record Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
