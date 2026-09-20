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
  CheckCircle2,
  Clock,
  Receipt,
  Calendar,
  Check,
  Building2,
} from 'lucide-react';

const AREA_PLACES = [
  'Athippaly',
  'Athippaly vayal',
  'Kaaramoola',
  'Kallingara',
  '4th mile',
  'Manjamoola',
  'Thakaramoola',
  'Madamoola',
  'Edalamoola',
  'Nambalakodu',
  'Kammathi',
  'Killur',
];

export const CollectionAgentView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'collected'>('pending');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
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
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, settingsRes, payRes] = await Promise.all([
        api.get('/customers', { params: { search, area: areaFilter } }),
        api.get('/settings'),
        api.get('/payments'),
      ]);

      if (custRes.data.success) setCustomers(custRes.data.data);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
      if (payRes.data && payRes.data.success && Array.isArray(payRes.data.data)) {
        setPaymentsHistory(payRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load collection data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, areaFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter 1: Pending Customers (Pending balance > 0)
  const pendingCustomers = customers.filter((c) => (c.pendingAmount || 0) > 0);

  // Filter 2: Payment Collected Customers (Pending balance <= 0 or zero pending)
  const collectedCustomers = customers.filter((c) => (c.pendingAmount || 0) <= 0);

  // Dashboard Financial Metrics Calculation
  const yetToCollectAmount = customers.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
  const collectedAmount = paymentsHistory.reduce(
    (acc, p) => acc + (p.status === 'SUCCESSFUL' ? p.amount : 0),
    0
  );
  const totalCollectableAmount = yetToCollectAmount + collectedAmount;

  // Available Areas Dropdown List
  const availableAreas = Array.from(
    new Set([...AREA_PLACES, ...customers.map((c) => c.area).filter(Boolean)])
  );

  const handleOpenUpiModal = (customer: Customer) => {
    setUpiModal(customer);
    setAmountReceived(String(customer.pendingAmount || customer.monthlyBill || 0));
    setTransactionId('');
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
      const notesStr = `Door-to-door collection by ${user?.name} (${user?.employeeId})${
        paymentMethod === 'UPI' && transactionId.trim() ? ` | UPI Txn ID: ${transactionId.trim()}` : ''
      }`;

      const res = await api.post('/payments', {
        customerId: upiModal.customerId,
        amount: amt,
        paymentMethod,
        billingMonth: new Date().toISOString().slice(0, 7),
        notes: notesStr,
      });

      if (res.data.success) {
        setUpiModal(null);
        setAmountReceived('');
        setTransactionId('');
        fetchData(); // Refresh pending balances and payment history
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

      {/* Minimal Collection Dashboard Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Collectable Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Collectable Amount</p>
            <h3 className="text-xl font-extrabold text-white mt-1">
              ₹{totalCollectableAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{customers.length} Assigned Subscribers</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Yet to be Collected Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Yet to be Collected</p>
            <h3 className="text-xl font-extrabold text-amber-400 mt-1">
              ₹{yetToCollectAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{pendingCustomers.length} Unpaid Subscribers</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Collected Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Collected Amount</p>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-1">
              ₹{collectedAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{collectedCustomers.length} Paid / Recharged</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Navigation & Search Controls */}
      <div className="glass-panel p-4 rounded-2xl space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Collections</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold font-mono">
              {pendingCustomers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('collected')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'collected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Payment Collected Customers</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold font-mono">
              {collectedCustomers.length}
            </span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Areas / Localities</option>
              {availableAreas.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: PENDING COLLECTIONS SECTION */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-8 text-center text-slate-400">
              Loading pending subscriber accounts...
            </div>
          ) : pendingCustomers.length === 0 ? (
            <div className="col-span-full p-8 text-center glass-panel rounded-2xl border border-emerald-500/30 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-white">All Collections Completed!</h3>
              <p className="text-xs text-slate-400">
                No pending balances remaining for customers in this selection.
              </p>
            </div>
          ) : (
            pendingCustomers.map((c) => {
              const isOverdue2Months = (c.monthlyBill || 0) > 0 && (c.pendingAmount || 0) >= (c.monthlyBill * 2);

              return (
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
                  <div className={`p-3 bg-slate-900/90 rounded-xl border flex items-center justify-between ${isOverdue2Months ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800'}`}>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        Total Pending
                        {isOverdue2Months && <span className="text-[10px] font-extrabold text-red-400 font-mono">(2+ Months)</span>}
                      </p>
                      <p className={`text-lg font-extrabold ${isOverdue2Months ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
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

                  {/* Action: Collect Payment via UPI */}
                  <button
                    onClick={() => handleOpenUpiModal(c)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition glow-emerald"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / Collect Payment</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT COLLECTED CUSTOMERS SECTION */}
      {activeTab === 'collected' && (
        <div className="space-y-6">
          {/* Section A: Customers with Completed Payments */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Payment Collected Customers ({collectedCustomers.length})
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero Pending Balance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectedCustomers.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No fully paid subscribers logged yet.
                </div>
              ) : (
                collectedCustomers.map((c) => (
                  <div
                    key={c.customerId}
                    className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{c.name}</h4>
                        <p className="text-[11px] font-mono text-sky-400">{c.customerId}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        PAID / RECHARGED
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                      <p className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {c.phone || 'N/A'}
                      </p>
                      <p className="text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {c.area}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs mt-2">
                      <span className="text-slate-300 font-semibold">Pending Balance:</span>
                      <span className="font-extrabold text-emerald-400">₹0 (Fully Paid)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B: Recorded Receipts Log */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Receipt className="w-5 h-5 text-sky-400" />
              Recorded Collections Ledger ({paymentsHistory.length} Receipts)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Receipt ID</th>
                    <th className="px-4 py-3">Customer ID</th>
                    <th className="px-4 py-3">Amount Collected</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paymentsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No payment receipts recorded by you yet today.
                      </td>
                    </tr>
                  ) : (
                    paymentsHistory.map((p) => (
                      <tr key={p.paymentId} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-sky-400">{p.paymentId}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{p.customerId}</td>
                        <td className="px-4 py-3 font-bold text-emerald-400">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-cyan-300">{p.paymentMethod}</td>
                        <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(p.paymentDate).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {p.status}
                          </span>
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
            <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2 border border-slate-200 shadow-sm">
              <img
                src={`https://quickchart.io/qr?text=${encodeURIComponent(
                  `upi://pay?pa=${encodeURIComponent(settings.COMPANY_UPI_ID || 'hileapnetwork@upi')}&pn=${encodeURIComponent('HiLeap Network')}&am=${amountReceived || upiModal.pendingAmount || ''}&cu=INR`
                )}&size=300`}
                alt="Company UPI QR Code"
                className="w-48 h-48 object-contain rounded-lg shadow-inner"
                onError={(e) => {
                  const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `upi://pay?pa=${encodeURIComponent(settings.COMPANY_UPI_ID || 'hileapnetwork@upi')}&pn=${encodeURIComponent('HiLeap Network')}&cu=INR`
                  )}`;
                  (e.target as HTMLImageElement).src = fallbackUrl;
                }}
              />
              <p className="text-xs font-bold text-slate-900 font-mono">
                UPI ID: {settings.COMPANY_UPI_ID || 'hileapnetwork@upi'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Scan using PhonePe / Google Pay / Paytm</p>
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

              {paymentMethod === 'UPI' && (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30 space-y-1">
                  <label className="block text-xs font-bold text-emerald-400">
                    UPI Transaction ID / UTR Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter UPI reference / UTR number (e.g. 426812345678)..."
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    Enter the 12-digit UTR or Transaction Ref ID for payment verification.
                  </p>
                </div>
              )}

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
