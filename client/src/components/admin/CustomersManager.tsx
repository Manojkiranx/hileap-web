import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Customer } from '../../types';
import {
  Users,
  Search,
  Plus,
  Edit,
  ExternalLink,
  Phone,
  MapPin,
  Tv,
  Wifi,
  X,
  Trash2,
  AlertTriangle,
  ToggleRight,
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

export const CustomersManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [areasList, setAreasList] = useState<string[]>(AREA_PLACES);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [externalUrlModal, setExternalUrlModal] = useState<{ open: boolean; url: string; boxId: string; title: string } | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    area: 'Athippaly',
    subscriptionType: 'BOTH',
    monthlyBill: 750,
    previousUnpaidBalance: 0,
    setTopBoxSerial: '',
    routerSerial: '',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { search, area: areaFilter, status: statusFilter },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, areaFilter, statusFilter]);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      if (res.data.success && Array.isArray(res.data.data)) {
        const fetched = res.data.data.map((a: any) => a.name);
        const combined = Array.from(new Set([...AREA_PLACES, ...fetched]));
        setAreasList(combined);
      }
    } catch (err) {
      console.error('Error loading dynamic areas:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAreas();
  }, [fetchCustomers]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      alert('Please enter customer name.');
      return;
    }
    if (!formData.area || !formData.area.trim()) {
      alert('Please select an area.');
      return;
    }

    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.customerId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      setEditCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save customer record.');
    }
  };

  const handleExternalAction = async (customerId: string, actionType: 'recharge' | 'pause_resume' | 'unsubscribe') => {
    try {
      const res = await api.post(`/customers/${customerId}/external-url`, { actionType });
      if (res.data.success) {
        setExternalUrlModal({
          open: true,
          url: res.data.url,
          boxId: res.data.boxId,
          title: `External Portal Integration (${actionType.toUpperCase()})`,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate external URL.');
    }
  };

  const handleToggleSubscription = async (customerId: string) => {
    try {
      const res = await api.patch(`/customers/${customerId}/toggle-subscription`);
      if (res.data.success) {
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to toggle subscription status.');
    }
  };

  const handleDeleteCustomer = async (customerId: string, name: string) => {
    if (
      window.confirm(
        `PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY DELETE customer "${name}" (${customerId}) from the database?\nThis action cannot be undone.`
      )
    ) {
      try {
        const res = await api.delete(`/customers/${customerId}`);
        if (res.data.success) {
          alert(res.data.message || 'Customer record permanently deleted.');
          fetchCustomers();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to delete customer.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            Subscriber Customer Database
          </h2>
          <p className="text-xs text-slate-400">Manage subscriptions, automatic balance ledgers & external integrations</p>
        </div>

        <button
          onClick={() => {
            setEditCustomer(null);
            setFormData({
              name: '',
              phone: '',
              area: areasList[0] || 'Athippaly',
              subscriptionType: 'BOTH',
              monthlyBill: 750,
              previousUnpaidBalance: 0,
              setTopBoxSerial: '',
              routerSerial: '',
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Name, Phone, Box ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">All Areas</option>
          {areasList.map((place) => (
            <option key={place} value={place}>
              {place}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">All Subscription Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
        </select>
      </div>

      {/* Customer Data Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Customer Details</th>
                <th className="px-5 py-4">Subscription</th>
                <th className="px-5 py-4">Box / Hardware ID</th>
                <th className="px-5 py-4">Monthly Bill</th>
                <th className="px-5 py-4">Pending Balance</th>
                <th className="px-5 py-4">Subscription Status & Toggle</th>
                <th className="px-5 py-4 text-right">Actions / External</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading customer data...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No customers found matching filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isOverdue2Months = (c.monthlyBill || 0) > 0 && (c.pendingAmount || 0) >= (c.monthlyBill * 2);

                  return (
                    <tr key={c.customerId} className={`hover:bg-slate-800/40 transition ${isOverdue2Months ? 'bg-red-500/5' : ''}`}>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {c.name}
                            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              {c.customerId}
                            </span>
                          </p>
                          {c.phone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {c.phone}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {c.area}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200">
                            {c.subscriptionType === 'CABLE' && <Tv className="w-3 h-3 text-amber-400" />}
                            {c.subscriptionType === 'WIFI' && <Wifi className="w-3 h-3 text-sky-400" />}
                            {c.subscriptionType === 'BOTH' && <span className="text-emerald-400">Cable + Wi-Fi</span>}
                            {c.subscriptionType}
                          </span>
                          <p className="text-xs text-slate-400">{c.planName}</p>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-300">
                        <p className="font-bold text-sky-300">Box ID: {c.boxId}</p>
                        {c.setTopBoxSerial && <p className="text-[11px] text-slate-400">STB: {c.setTopBoxSerial}</p>}
                        {c.routerSerial && <p className="text-[11px] text-slate-400">Router: {c.routerSerial}</p>}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-100">
                        ₹{(c.monthlyBill || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Pending Balance with 2+ Months Red Warning Highlight */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span
                            className={`font-extrabold text-sm flex items-center gap-1 ${
                              isOverdue2Months
                                ? 'text-red-500 animate-pulse'
                                : (c.pendingAmount || 0) > 0
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {isOverdue2Months && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                            ₹{(c.pendingAmount || 0).toLocaleString('en-IN')}
                          </span>

                          {isOverdue2Months && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                              2+ Months Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status & Subscribe/Unsubscribe Toggle Button */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleSubscription(c.customerId)}
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 border shadow-sm ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                          title="Click to toggle subscription status (Active / Unsubscribed)"
                        >
                          <ToggleRight
                            className={`w-4 h-4 ${c.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400 rotate-180'}`}
                          />
                          <span>{c.status === 'ACTIVE' ? 'Subscribed' : 'Unsubscribed'}</span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditCustomer(c);
                              setFormData(c);
                              setShowModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Permanent Hard Delete button */}
                          <button
                            onClick={() => handleDeleteCustomer(c.customerId, c.name)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition"
                            title="Permanently Delete Customer from Database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* External Recharge Redirect (Section 29) */}
                          <button
                            onClick={() => handleExternalAction(c.customerId, 'recharge')}
                            className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Recharge
                          </button>

                          {/* External Pause/Resume Redirect */}
                          <button
                            onClick={() => handleExternalAction(c.customerId, 'pause_resume')}
                            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition"
                          >
                            Pause/Resume
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editCustomer ? `Edit Customer: ${editCustomer.customerId}` : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="space-y-4">
                {/* 1. Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name..."
                    value={formData.name || ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* 2. Area Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Area / Locality *</label>
                  <select
                    required
                    value={formData.area || areasList[0]}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {areasList.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Phone (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter phone number (optional)..."
                    value={formData.phone || ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* 4. Service Choice */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Required Service(s) *</label>
                  <select
                    value={formData.subscriptionType || 'BOTH'}
                    onChange={(e) =>
                      setFormData({ ...formData, subscriptionType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="CABLE">Cable TV Service Only</option>
                    <option value="WIFI">WiFi Service Only</option>
                    <option value="BOTH">Both Cable TV & WiFi Services</option>
                  </select>
                </div>

                {/* 5. Monthly Subscription Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Subscription Rate (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="e.g. 750"
                    value={formData.monthlyBill !== undefined ? formData.monthlyBill : 750}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, monthlyBill: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* 6. Old Balance / Pending Balance (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Old Balance / Pending Balance (₹) (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter previous unpaid balance if any..."
                    value={formData.previousUnpaidBalance !== undefined ? formData.previousUnpaidBalance : ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, previousUnpaidBalance: Number(e.target.value || 0) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Setup Box Number (Conditional for Cable TV or Both) */}
                {(formData.subscriptionType === 'CABLE' || formData.subscriptionType === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-semibold text-sky-400 mb-1">Setup Box Number (Cable TV)</label>
                    <input
                      type="text"
                      placeholder="Enter setup box serial number..."
                      value={formData.setTopBoxSerial || ''}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      onChange={(e) => setFormData({ ...formData, setTopBoxSerial: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/50 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                )}

                {/* Modem/Router Number (Conditional for WiFi or Both) */}
                {(formData.subscriptionType === 'WIFI' || formData.subscriptionType === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-semibold text-purple-400 mb-1">Modem / Router Number (WiFi Service)</label>
                    <input
                      type="text"
                      placeholder="Enter modem / router serial number..."
                      value={formData.routerSerial || ''}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      onChange={(e) => setFormData({ ...formData, routerSerial: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/50 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* External Integration Redirect Modal (Section 29) */}
      {externalUrlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-sky-500/40 text-center space-y-4 glow-sky">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30">
              <ExternalLink className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">{externalUrlModal.title}</h3>
            <p className="text-xs text-slate-300">
              Constructed deep-link parameter passing Box ID <strong className="text-sky-300">{externalUrlModal.boxId}</strong> to official external portal:
            </p>
            <div className="p-3 bg-slate-900 rounded-xl text-left font-mono text-[11px] text-slate-300 border border-slate-800 break-all">
              {externalUrlModal.url}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setExternalUrlModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <a
                href={externalUrlModal.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md"
              >
                <span>Proceed to External Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
