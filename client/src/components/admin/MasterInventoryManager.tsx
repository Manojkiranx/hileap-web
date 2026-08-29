import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { InventoryItem, InventoryTransaction } from '../../types';
import { Package, Plus, Layers, X, Trash2 } from 'lucide-react';

export const MasterInventoryManager: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'items' | 'transactions'>('items');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    itemType: 'SET_TOP_BOX',
    name: 'HiLeap HD Smart Box v4',
    serialNumber: '',
    stockQuantity: 1,
    unit: 'PIECES',
  });

  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkFormData, setBulkFormData] = useState<any>({
    itemType: 'SET_TOP_BOX',
    name: '',
    serialsText: '',
    quantity: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, txRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/transactions'),
      ]);

      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory', formData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to add inventory item.');
    }
  };

  const handleSaveBulkStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFormData.name || !bulkFormData.name.trim()) {
      alert('Please enter hardware name / model.');
      return;
    }

    const serialsList = bulkFormData.serialsText
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    try {
      const res = await api.post('/inventory/bulk', {
        itemType: bulkFormData.itemType,
        name: bulkFormData.name.trim(),
        serialNumbers: serialsList,
        quantity: bulkFormData.quantity,
      });

      if (res.data.success) {
        alert(res.data.message || 'Bulk hardware stock added successfully.');
        setShowBulkModal(false);
        setBulkFormData({ itemType: 'SET_TOP_BOX', name: '', serialsText: '', quantity: 1 });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to bulk add stock.');
    }
  };

  const handleDeleteStockItem = async (itemId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete inventory item "${name}" (${itemId}) from master stock?`)) {
      try {
        await api.delete(`/inventory/${itemId}`);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to delete inventory item.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-sky-400" />
            Master Hardware Inventory & Stock Ledger
          </h2>
          <p className="text-xs text-slate-400">Strict Admin master inventory control & field technician usage tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBulkFormData({ itemType: 'SET_TOP_BOX', name: '', serialsText: '', quantity: 1 });
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Bulk Add Stock Items</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                itemType: 'SET_TOP_BOX',
                name: '',
                serialNumber: '',
                stockQuantity: 1,
                unit: 'PIECES',
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Stock Item</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'items'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Master Stock Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'transactions'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Usage & Stock Transactions ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Master Items */}
      {activeTab === 'items' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Item ID / Hardware Name</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Serial Number / Cable Length</th>
                  <th className="px-5 py-4">Quantity / Meters</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No stock items found in master inventory.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.itemId} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {item.name}
                            <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              {item.itemId}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-300">
                        {item.itemType}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-300">
                        {item.serialNumber || 'N/A (Bulk/Meters)'}
                      </td>

                      <td className="px-5 py-4 font-extrabold text-white">
                        {item.stockQuantity} {item.unit}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'USED'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteStockItem(item.itemId, item.name)}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Transaction History */}
      {activeTab === 'transactions' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Tx ID / Date</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Item Type / Serial</th>
                  <th className="px-5 py-4">Employee ID</th>
                  <th className="px-5 py-4">Complaint / Customer</th>
                  <th className="px-5 py-4">Quantity / Meters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.transactionId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs text-white font-bold">{tx.transactionId}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString('en-IN')}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 border border-slate-700 text-sky-300">
                        {tx.transactionType}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs">
                      <p className="text-slate-200">{tx.itemType}</p>
                      {tx.serialNumber && <p className="text-slate-400">SN: {tx.serialNumber}</p>}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                      {tx.employeeId}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {tx.complaintId || tx.customerId || 'General Stock In'}
                    </td>

                    <td className="px-5 py-4 font-bold text-white">
                      {tx.quantityOrLength}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Single Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Master Stock Item (Admin)</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Category</label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="SET_TOP_BOX">Set-Top Box</option>
                  <option value="WIFI_ROUTER">Wi-Fi Router</option>
                  <option value="WIFI_MODEM">Wi-Fi Modem</option>
                  <option value="CABLE">Coaxial Cable (Meters)</option>
                  <option value="OPTICAL_FIBER">Optical Fiber (Meters)</option>
                  <option value="OTHER">Other Hardware Accessories</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hardware Name / Model *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter hardware name or model (e.g. Cat6 Fiber Cable)..."
                  value={formData.name || ''}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(formData.itemType) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Serial Number (Mandatory)</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter serial number..."
                    value={formData.serialNumber || ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Quantity / Meters</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.stockQuantity || 1}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md"
                >
                  Add Master Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Stock Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-purple-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Bulk Add Hardware Stock
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Category</label>
                <select
                  value={bulkFormData.itemType}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, itemType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="SET_TOP_BOX">Set-Top Boxes (Serial Numbers Batch)</option>
                  <option value="WIFI_ROUTER">Wi-Fi Routers (Serial Numbers Batch)</option>
                  <option value="WIFI_MODEM">Wi-Fi Modems (Serial Numbers Batch)</option>
                  <option value="CABLE">Coaxial Cables (Meters Roll)</option>
                  <option value="OPTICAL_FIBER">Optical Fiber Cables (Meters Roll)</option>
                  <option value="OTHER">Other Accessories</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hardware Name / Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HiLeap HD Box v4 or 2-Core Fiber Roll..."
                  value={bulkFormData.name}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(bulkFormData.itemType) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Serial Numbers (One serial number per line)
                  </label>
                  <textarea
                    rows={5}
                    placeholder={`STB-SN-1001\nSTB-SN-1002\nSTB-SN-1003\n...`}
                    value={bulkFormData.serialsText}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, serialsText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Each serial number line will create a separate available hardware item.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Batch Quantity / Meters</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={bulkFormData.quantity}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md"
                >
                  Confirm Bulk Stock Addition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
