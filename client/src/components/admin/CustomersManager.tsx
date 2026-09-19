import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Customer, Portal } from '../../types';
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
  Globe,
  CheckCircle,
  PowerOff,
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
  const [portalsList, setPortalsList] = useState<Portal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [returnWorkflowModal, setReturnWorkflowModal] = useState<{
    open: boolean;
    customer: Customer;
    portalName: string;
    portalUrl: string;
  } | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    area: 'Athippaly',
    subscriptionType: 'BOTH',
    monthlyBill: 750,
    previousUnpaidBalance: 0,
    setTopBoxSerial: '',
    routerSerial: '',
    cablePortal: 'TCCL',
    wifiPortal: 'WIFI',
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

  const fetchPortals = async () => {
    try {
      const res = await api.get('/portals');
      if (res.data.success && Array.isArray(res.data.data)) {
        setPortalsList(res.data.data.filter((p: Portal) => p.active));
      }
    } catch (err) {
      console.error('Error loading portals:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAreas();
    fetchPortals();
  }, [fetchCustomers]);

  // Cable portals filtered from DB (category CABLE, BOTH, or standard)
  const cablePortals = portalsList.filter((p) => p.category === 'CABLE' || p.category === 'BOTH' || p.name === 'TCCL' || p.name === 'TACTV');
  const availableCablePortals = cablePortals.length > 0 ? cablePortals : [
    { name: 'TCCL', url: 'https://tccl.in/recharge' },
    { name: 'TACTV', url: 'https://tactv.in/recharge' }
  ];

  // WiFi portals filtered from DB (category WIFI, BOTH, or standard)
  const wifiPortals = portalsList.filter((p) => p.category === 'WIFI' || p.category === 'BOTH' || p.name === 'WIFI');
  const availableWifiPortals = wifiPortals.length > 0 ? wifiPortals : [
    { name: 'WIFI', url: 'https://external-recharge-portal.example.com/wifi-recharge' }
  ];

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

  // Launch Portal Navigation & Return Workflow (Req 9, 10, 11, 12, 13, 14)
  const handleOpenCustomerPortal = (customer: Customer, portalNameStr: string) => {
    // Find portal URL from database or default
    const foundPortal = portalsList.find((p) => p.name.toUpperCase() === portalNameStr.toUpperCase());
    let targetUrl = foundPortal ? foundPortal.url : 'https://external-recharge-portal.example.com/recharge';

    targetUrl = targetUrl
      .replace('{BOX_ID}', encodeURIComponent(customer.boxId || ''))
      .replace('{CUSTOMER_ID}', encodeURIComponent(customer.customerId || ''));

    // 1. Open external portal in new tab
    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    // 2. Present Return Workflow modal on Customers page for exact status updating
    setReturnWorkflowModal({
      open: true,
      customer,
      portalName: portalNameStr,
      portalUrl: targetUrl,
    });
  };

  // Post-Portal Status Action (Req 11 & 12)
  const handleSetCustomerStatus = async (customerId: string, targetStatus: 'ACTIVE' | 'UNSUBSCRIBED') => {
    try {
      const res = await api.patch(`/customers/${customerId}/status`, { status: targetStatus });
      if (res.data.success) {
        setReturnWorkflowModal(null);
        await fetchCustomers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update customer status.');
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

  const [rechargeSelectCustomer, setRechargeSelectCustomer] = useState<Customer | null>(null);

  const handleRechargeButtonClick = (customer: Customer) => {
    const hasCable = Boolean(customer.cablePortal);
    const hasWifi = Boolean(customer.wifiPortal);

    if (hasCable && hasWifi && customer.cablePortal !== customer.wifiPortal) {
      setRechargeSelectCustomer(customer);
    } else if (hasCable) {
      handleOpenCustomerPortal(customer, customer.cablePortal!);
    } else if (hasWifi) {
      handleOpenCustomerPortal(customer, customer.wifiPortal!);
    } else {
      handleOpenCustomerPortal(customer, availableCablePortals[0]?.name || 'TCCL');
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
          <p className="text-xs text-slate-400">Manage subscriptions, automatic balance ledgers & operator recharge portal navigation</p>
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
              cablePortal: availableCablePortals[0]?.name || 'TCCL',
              wifiPortal: availableWifiPortals[0]?.name || 'WIFI',
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
          <option value="UNSUBSCRIBED">Deactivate / Unsubscribed</option>
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
                <th className="px-5 py-4">Configured Portal(s)</th>
                <th className="px-5 py-4">Monthly Bill</th>
                <th className="px-5 py-4">Pending Balance</th>
                <th className="px-5 py-4">Subscription Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
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

                      {/* Display Customer's Configured Clickable Portals */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(c.subscriptionType === 'CABLE' || c.subscriptionType === 'BOTH') && c.cablePortal && (
                            <button
                              onClick={() => handleOpenCustomerPortal(c, c.cablePortal!)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-500/40 flex items-center gap-1 transition shadow-sm"
                              title={`Redirect to ${c.cablePortal} Recharge Portal`}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Recharge {c.cablePortal}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}

                          {(c.subscriptionType === 'WIFI' || c.subscriptionType === 'BOTH') && c.wifiPortal && (
                            <button
                              onClick={() => handleOpenCustomerPortal(c, c.wifiPortal!)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs border border-cyan-500/40 flex items-center gap-1 transition shadow-sm"
                              title={`Redirect to ${c.wifiPortal} Recharge Portal`}
                            >
                              <Wifi className="w-3.5 h-3.5" />
                              <span>Recharge {c.wifiPortal}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}

                          {!c.cablePortal && !c.wifiPortal && (
                            <button
                              onClick={() => handleOpenCustomerPortal(c, 'TCCL')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs border border-emerald-500/40 flex items-center gap-1 transition shadow-sm"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Recharge Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-100">
                        ₹{(c.monthlyBill || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Pending Balance */}
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

                      {/* Subscription Status Display Badge (Active / Deactivate) */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              c.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                            }`}
                          />
                          <span>{c.status === 'ACTIVE' ? 'Active' : 'Deactivate'}</span>
                        </span>
                      </td>

                      {/* Actions Column with Explicit Recharge Button */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRechargeButtonClick(c)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
                            title={`Recharge subscriber on portal (${c.cablePortal || c.wifiPortal || 'TCCL'})`}
                          >
                            <Globe className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Recharge</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                          </button>

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

                          <button
                            onClick={() => handleDeleteCustomer(c.customerId, c.name)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition"
                            title="Permanently Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter phone number..."
                    value={formData.phone || ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

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

                {/* Cable Portal Selection Radio Buttons (Req 5) */}
                {(formData.subscriptionType === 'CABLE' || formData.subscriptionType === 'BOTH') && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
                    <label className="block text-xs font-bold text-amber-400">
                      Cable Portal Selection (Radio Buttons) *
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Select exactly one Cable operator portal. (e.g., TCCL or TACTV)
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1">
                      {availableCablePortals.map((p) => (
                        <label key={p.name} className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                          <input
                            type="radio"
                            name="customerCablePortal"
                            value={p.name}
                            checked={formData.cablePortal === p.name}
                            onChange={() => setFormData({ ...formData, cablePortal: p.name })}
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* WiFi Portal Selection Radio Buttons (Req 6) */}
                {(formData.subscriptionType === 'WIFI' || formData.subscriptionType === 'BOTH') && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2">
                    <label className="block text-xs font-bold text-cyan-400">
                      WiFi Portal Selection (Radio Buttons) *
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Select WiFi operator portal. (e.g., WIFI)
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1">
                      {availableWifiPortals.map((p) => (
                        <label key={p.name} className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                          <input
                            type="radio"
                            name="customerWifiPortal"
                            value={p.name}
                            checked={formData.wifiPortal === p.name}
                            onChange={() => setFormData({ ...formData, wifiPortal: p.name })}
                            className="text-cyan-500 focus:ring-cyan-500"
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Post-Portal Redirect Activation / Deactivation Action Modal (Req 10, 11, 12, 13) */}
      {returnWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-sky-500/40 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
              <Globe className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">
              Portal Action Workflow: {returnWorkflowModal.customer.name} ({returnWorkflowModal.portalName})
            </h3>

            <p className="text-xs text-slate-300">
              External portal <strong className="text-cyan-400">{returnWorkflowModal.portalName}</strong> was launched in a new tab.
              Please select the exact result performed on the external portal to update this customer's status in MongoDB:
            </p>

            <div className="p-3 bg-slate-900/90 rounded-xl text-left font-mono text-[11px] text-slate-400 border border-slate-800 break-all">
              Redirect URL: {returnWorkflowModal.portalUrl}
            </div>

            {/* Exact Action Buttons for Active vs Deactive */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSetCustomerStatus(returnWorkflowModal.customer.customerId, 'ACTIVE')}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Active (Recharged)</span>
              </button>

              <button
                onClick={() => handleSetCustomerStatus(returnWorkflowModal.customer.customerId, 'UNSUBSCRIBED')}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
              >
                <PowerOff className="w-4 h-4" />
                <span>Mark as Deactive</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setReturnWorkflowModal(null)}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                Return to Customers List without changing status
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Recharge Portal Choice Modal for Combo Subscribers */}
      {rechargeSelectCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Globe className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">
              Select Recharge Portal for {rechargeSelectCustomer.name}
            </h3>

            <p className="text-xs text-slate-300">
              This subscriber has multiple active services. Select which operator portal you want to open:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {rechargeSelectCustomer.cablePortal && (
                <button
                  onClick={() => {
                    const c = rechargeSelectCustomer;
                    setRechargeSelectCustomer(null);
                    handleOpenCustomerPortal(c, c.cablePortal!);
                  }}
                  className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition"
                >
                  <Globe className="w-4 h-4" />
                  <span>Recharge {rechargeSelectCustomer.cablePortal}</span>
                </button>
              )}

              {rechargeSelectCustomer.wifiPortal && (
                <button
                  onClick={() => {
                    const c = rechargeSelectCustomer;
                    setRechargeSelectCustomer(null);
                    handleOpenCustomerPortal(c, c.wifiPortal!);
                  }}
                  className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Recharge {rechargeSelectCustomer.wifiPortal}</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setRechargeSelectCustomer(null)}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
