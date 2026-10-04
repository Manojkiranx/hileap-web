import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Customer, Payment } from '../../types';
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
  Wifi,
  Tv,
  Edit,
  Banknote,
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
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'CABLE' | 'WIFI'>('ALL');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [settings, setSettings] = useState<any>({
    COMPANY_UPI_ID: 'hileapnetwork@upi',
    COMPANY_UPI_QR_URL: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hileapnetwork@upi&pn=HiLeap%20Network',
  });

  // UPI / Payment Recording Modal State
  const [upiModal, setUpiModal] = useState<Customer | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Payment Correction / Edit Modal State (For Collection Agents)
  const [editModal, setEditModal] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [editTxnId, setEditTxnId] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string>('');

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

  // Filter 1: Service Type Filtering (All, Cable, Wi-Fi)
  const filteredCustomers = customers.filter((c) => {
    if (serviceFilter === 'CABLE') return c.subscriptionType === 'CABLE' || c.subscriptionType === 'BOTH';
    if (serviceFilter === 'WIFI') return c.subscriptionType === 'WIFI' || c.subscriptionType === 'BOTH';
    return true;
  });

  // Track customers who have recorded payment receipts in paymentsHistory
  const collectedCustomerIds = new Set(paymentsHistory.map((p) => p.customerId));

  // Pending Customers: Customers with remaining pending amount > 0
  const pendingCustomers = filteredCustomers.filter((c) => (c.pendingAmount || 0) > 0);

  // Payment Collected Customers: Fully paid OR customers with payments recorded (even if partial pending balance remains)
  const collectedCustomers = filteredCustomers.filter(
    (c) => (c.pendingAmount || 0) <= 0 || collectedCustomerIds.has(c.customerId)
  );

  // Financial Breakdown Metrics
  const yetToCollectAmount = filteredCustomers.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
  
  const validPayments = paymentsHistory.filter((p) => p.status === 'SUCCESSFUL' || p.status === 'CORRECTED');
  const collectedAmount = validPayments.reduce((acc, p) => acc + p.amount, 0);
  const upiCollectedAmount = validPayments
    .filter((p) => p.paymentMethod === 'UPI')
    .reduce((acc, p) => acc + p.amount, 0);
  const cashCollectedAmount = validPayments
    .filter((p) => p.paymentMethod === 'CASH')
    .reduce((acc, p) => acc + p.amount, 0);

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
        transactionId: transactionId.trim(),
        billingMonth: new Date().toISOString().slice(0, 7),
        notes: notesStr,
      });

      if (res.data.success) {
        setUpiModal(null);
        setAmountReceived('');
        setTransactionId('');
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Payment collection recording failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (p: Payment) => {
    setEditModal(p);
    setEditAmount(String(p.amount));
    setEditMethod(p.paymentMethod);
    setEditTxnId(p.transactionId || '');
    setEditReason('');
    setEditErrorMsg('');
  };

  const handleCorrectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    setEditErrorMsg('');
    const amt = Number(editAmount);

    if (isNaN(amt) || amt <= 0) {
      setEditErrorMsg('Corrected amount must be a positive number.');
      return;
    }

    if (!editReason.trim()) {
      setEditErrorMsg('Reason for editing/correcting this payment is required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await api.post(`/payments/${editModal.paymentId}/correct`, {
        newAmount: amt,
        paymentMethod: editMethod,
        transactionId: editTxnId.trim(),
        reason: editReason.trim(),
      });

      if (res.data.success) {
        setEditModal(null);
        fetchData();
      }
    } catch (err: any) {
      setEditErrorMsg(err.response?.data?.message || err.message || 'Failed to edit payment details.');
    } finally {
      setEditSubmitting(false);
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

        {/* Service Type Selection Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setServiceFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              serviceFilter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>All Services</span>
          </button>
          <button
            onClick={() => setServiceFilter('CABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              serviceFilter === 'CABLE'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Cable Collections</span>
          </button>
          <button
            onClick={() => setServiceFilter('WIFI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              serviceFilter === 'WIFI'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi Collections</span>
          </button>
        </div>
      </div>

      {/* Minimal Collection Dashboard Stat Cards with Separate UPI & Cash Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* Total Collectable Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collectable</p>
            <h3 className="text-lg font-extrabold text-white mt-1">
              ₹{totalCollectableAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{filteredCustomers.length} Subscribers</p>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Yet to be Collected Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yet to Collect</p>
            <h3 className="text-lg font-extrabold text-amber-400 mt-1">
              ₹{yetToCollectAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{pendingCustomers.length} Unpaid / Remaining</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected Amount */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected</p>
            <h3 className="text-lg font-extrabold text-emerald-400 mt-1">
              ₹{collectedAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{validPayments.length} Total Receipts</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* UPI Collected Total */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">UPI Collected</p>
            <h3 className="text-lg font-extrabold text-sky-300 mt-1">
              ₹{upiCollectedAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Digital QR Payments</p>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        {/* Cash Received on Hand */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cash on Hand</p>
            <h3 className="text-lg font-extrabold text-emerald-300 mt-1">
              ₹{cashCollectedAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Physical Cash Received</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-5 h-5" />
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
                No pending balances remaining for subscribers in this selection.
              </p>
            </div>
          ) : (
            pendingCustomers.map((c) => {
              const isOverdue2Months = (c.monthlyBill || 0) > 0 && (c.pendingAmount || 0) >= (c.monthlyBill * 2);
              const hasPartialPayment = collectedCustomerIds.has(c.customerId);

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
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.subscriptionType === 'WIFI'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : c.subscriptionType === 'CABLE'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {c.subscriptionType}
                        </span>
                        {hasPartialPayment && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            PARTIAL PAYMENT DONE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {c.phone || 'N/A'}
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
                        Remaining Pending
                        {isOverdue2Months && <span className="text-[10px] font-extrabold text-red-400 font-mono">(2+ Months)</span>}
                      </p>
                      <p className={`text-lg font-extrabold ${isOverdue2Months ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                        ₹{(c.pendingAmount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Monthly Bill</p>
                      <p className="text-xs font-bold text-slate-200">
                        ₹{(c.currentMonthBill || c.monthlyBill).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Advance Credit Badge if customer paid excess */}
                  {c.advanceAmount && c.advanceAmount > 0 ? (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 text-center">
                      Advance Credit: ₹{c.advanceAmount.toLocaleString('en-IN')} (Auto-deducts next bill)
                    </div>
                  ) : null}

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
          {/* Section A: Customers with Completed / Logged Payments */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Payment Collected Customers ({collectedCustomers.length})
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Paid / Partial Collections Logged
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectedCustomers.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No subscribers logged with collections yet.
                </div>
              ) : (
                collectedCustomers.map((c) => {
                  const hasRemainingPending = (c.pendingAmount || 0) > 0;

                  return (
                    <div
                      key={c.customerId}
                      className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{c.name}</h4>
                          <p className="text-[11px] font-mono text-sky-400">{c.customerId}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 ${
                            hasRemainingPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {hasRemainingPending ? 'PARTIAL PAYMENT' : 'PAID / RECHARGED'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                        <p className="text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {c.phone || 'N/A'}
                        </p>
                        <p className="text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {c.area} ({c.subscriptionType})
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-400 font-semibold">Remaining Pending:</span>
                        <span className={`font-extrabold ${hasRemainingPending ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {hasRemainingPending ? `₹${c.pendingAmount}` : '₹0 (Fully Paid)'}
                        </span>
                      </div>

                      {c.advanceAmount && c.advanceAmount > 0 ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 text-center">
                          Advance Credit Balance: ₹{c.advanceAmount}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section B: Recorded Receipts Log & Agent Edit Controls */}
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
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paymentsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                        No payment receipts recorded yet.
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
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {p.transactionId || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(p.paymentDate).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'CORRECTED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold text-[11px] flex items-center gap-1 ml-auto transition"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit / Correct</span>
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

      {/* Record Payment Modal */}
      {upiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4 glow-emerald my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Collect Payment - UPI / Cash
              </h3>
              <button onClick={() => setUpiModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Summary */}
            <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1 text-slate-300">
              <p><strong>Customer Name:</strong> {upiModal.name}</p>
              <p><strong>Customer ID:</strong> {upiModal.customerId}</p>
              <p><strong>Remaining Pending Balance:</strong> <strong className="text-amber-400">₹{upiModal.pendingAmount || 0}</strong></p>
            </div>

            {/* Company QR Display */}
            {paymentMethod === 'UPI' && (
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
            )}

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
                    UPI Transaction ID / UTR Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="Enter UPI reference / UTR number (e.g. 426812345678)..."
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
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
                <p className="text-[10px] text-slate-400 mt-1">
                  If amount paid exceeds bill, excess is saved as Advance Credit for upcoming bills.
                </p>
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

      {/* Payment Correction / Edit Modal for Collection Agents */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-sky-500/40 space-y-4 glow-sky my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-sky-400" />
                Edit Received Payment Details
              </h3>
              <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1 text-slate-300 font-mono">
              <p>Receipt ID: <strong className="text-sky-400">{editModal.paymentId}</strong></p>
              <p>Customer ID: <strong>{editModal.customerId}</strong></p>
              <p>Original Amount: <strong>₹{editModal.amount}</strong> ({editModal.paymentMethod})</p>
            </div>

            {editErrorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCorrectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Corrected Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-base font-extrabold text-sky-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="UPI">UPI Scan & Pay</option>
                  <option value="CASH">Cash Received</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              {editMethod === 'UPI' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction ID / Ref No.</label>
                  <input
                    type="text"
                    placeholder="Enter UPI reference or UTR ID..."
                    value={editTxnId}
                    onChange={(e) => setEditTxnId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Correction (Mandatory)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this payment entry is being modified (e.g. Typo in amount entered)..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                >
                  {editSubmitting ? 'Saving Correction...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
