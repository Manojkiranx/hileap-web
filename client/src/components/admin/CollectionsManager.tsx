import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Payment } from '../../types';
import {
  CreditCard,
  Download,
  Filter,
  AlertTriangle,
  History,
  X,
  Trash2,
} from 'lucide-react';

export const CollectionsManager: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Delete payment history state
  const [delStartDate, setDelStartDate] = useState<string>('');
  const [delEndDate, setDelEndDate] = useState<string>('');
  const [delLoading, setDelLoading] = useState<boolean>(false);

  // Correction Modal state
  const [correctionModal, setCorrectionModal] = useState<Payment | null>(null);
  const [newAmount, setNewAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments', {
        params: { status: statusFilter, startDate, endDate },
      });
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDeletePaymentHistory = async () => {
    if (!delStartDate || !delEndDate) {
      alert('Please select both "From Date" and "To Date" for deleting payment history.');
      return;
    }

    if (
      window.confirm(
        `PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY DELETE all payment history entries between ${delStartDate} and ${delEndDate} from MongoDB?\nThis action cannot be undone.`
      )
    ) {
      setDelLoading(true);
      try {
        const res = await api.post('/payments/delete-history', {
          startDate: delStartDate,
          endDate: delEndDate,
        });

        if (res.data.success) {
          alert(res.data.message || 'Payment history entries deleted successfully.');
          fetchPayments();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to delete payment history.');
      } finally {
        setDelLoading(false);
      }
    }
  };

  const handleExportExcel = () => {
    const queryParams = new URLSearchParams();
    if (statusFilter) queryParams.append('status', statusFilter);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    // Trigger direct file download
    window.location.href = `/api/payments/export?${queryParams.toString()}`;
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionModal) return;

    try {
      const res = await api.post(`/payments/${correctionModal.paymentId}/correct`, {
        newAmount: Number(newAmount),
        reason,
      });

      if (res.data.success) {
        setCorrectionModal(null);
        setNewAmount('');
        setReason('');
        fetchPayments();
      }
    } catch (err: any) {
      alert(err.message || 'Payment correction failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Excel Export Button (Section 13) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Payment Collections & Financial Ledger
          </h2>
          <p className="text-xs text-slate-400">Complete audit trail of door-to-door & digital customer collections</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition glow-emerald"
        >
          <Download className="w-4 h-4" />
          <span>Download Collection Details (.xlsx)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 glass-panel p-4 rounded-2xl">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">All Payment Statuses</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="CORRECTED">Corrected Entry</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          onClick={fetchPayments}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium flex items-center justify-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span>Apply Filters</span>
        </button>
      </div>

      {/* Delete Payment History Toolbar (From Date - To Date) */}
      <div className="glass-panel p-4 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete Payment History Range (Admin Database Removal)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Select date range to permanently purge payment records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">From Date *</label>
            <input
              type="date"
              value={delStartDate}
              onChange={(e) => setDelStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">To Date *</label>
            <input
              type="date"
              value={delEndDate}
              onChange={(e) => setDelEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDeletePaymentHistory}
              disabled={delLoading || !delStartDate || !delEndDate}
              className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{delLoading ? 'Deleting...' : 'Delete Payment History'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table of Collection Entries */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Payment ID / Date</th>
                <th className="px-5 py-4">Customer ID</th>
                <th className="px-5 py-4">Collection Agent ID</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Amount (₹)</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Audit & Corrections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading collection records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No payment collection transactions recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-white font-mono">{p.paymentId}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(p.paymentDate).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-sky-400 font-semibold">
                      {p.customerId}
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-300">
                      {p.collectionAgentId}
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-base text-emerald-400">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === 'SUCCESSFUL'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'CORRECTED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.correctionHistory && p.correctionHistory.length > 0 && (
                          <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                            <History className="w-3.5 h-3.5" />
                            {p.correctionHistory.length} Edits
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setCorrectionModal(p);
                            setNewAmount(String(p.amount));
                            setReason('');
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition"
                        >
                          Correct Entry
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Correction Workflow Modal (Section 11) */}
      {correctionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-amber-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Correct Mistaken Collection Entry
              </h3>
              <button onClick={() => setCorrectionModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1 text-slate-300 font-mono">
              <p><strong>Payment ID:</strong> {correctionModal.paymentId}</p>
              <p><strong>Original Collected Amount:</strong> ₹{correctionModal.amount}</p>
              <p><strong>Customer ID:</strong> {correctionModal.customerId}</p>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corrected Received Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Correction (Mandatory Audit Requirement)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this collection entry was corrected..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md"
                >
                  Save Audited Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
