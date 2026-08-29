import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Complaint, InventoryItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  MapPin,
  ExternalLink,
  PackagePlus,
  AlertCircle,
  Phone,
  Radio,
  X,
} from 'lucide-react';

export const ServiceAgentView: React.FC = () => {
  const { user, locationStatus } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dedicated Hardware Card State
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [takeQuantity, setTakeQuantity] = useState<number>(1);
  const [deviceSerial, setDeviceSerial] = useState<string>('');
  const [takeSuccessMsg, setTakeSuccessMsg] = useState<string>('');
  const [takeErrorMsg, setTakeErrorMsg] = useState<string>('');

  // Hardware Taken Modal state
  const [hardwareModal, setHardwareModal] = useState<Complaint | null>(null);
  const [hardwareType, setHardwareType] = useState<string>('SET_TOP_BOX');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [lengthMeters, setLengthMeters] = useState<string>('');
  const [hardwareList, setHardwareList] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string>('');

  // Complete Complaint Modal state
  const [completeModal, setCompleteModal] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('Service issue resolved on site.');

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch assigned complaints:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await api.get('/inventory');
      if (res.data.success && Array.isArray(res.data.data)) {
        setInventoryItems(res.data.data);
        if (res.data.data.length > 0 && !selectedItemName) {
          setSelectedItemName(res.data.data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  }, [selectedItemName]);

  useEffect(() => {
    fetchComplaints();
    fetchInventoryItems();
  }, [fetchComplaints, fetchInventoryItems]);

  const handleUpdateStatus = async (complaintId: string, status: string) => {
    try {
      await api.put(`/complaints/${complaintId}/status`, { status });
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update complaint status.');
    }
  };

  const handleTakeHardwareFromCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setTakeSuccessMsg('');
    setTakeErrorMsg('');

    if (!selectedItemName) {
      setTakeErrorMsg('Please select an item from inventory.');
      return;
    }
    if (!takeQuantity || takeQuantity <= 0) {
      setTakeErrorMsg('Please choose a valid quantity.');
      return;
    }

    const selectedItem = inventoryItems.find((i) => i.name === selectedItemName);
    const itemType = selectedItem ? selectedItem.itemType : 'OTHER';
    const isSerialRequired = ['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(itemType);

    if (isSerialRequired && (!deviceSerial || !deviceSerial.trim())) {
      setTakeErrorMsg('Setup box / Modem serial number is required for this hardware.');
      return;
    }

    try {
      const res = await api.post('/inventory/take', {
        complaintId: 'NEW_SETUP_OR_REPLACEMENT',
        items: [
          {
            itemType,
            name: selectedItemName,
            serialNumber: deviceSerial.trim() || selectedItem?.serialNumber,
            quantity: takeQuantity,
            lengthMeters: ['CABLE', 'OPTICAL_FIBER'].includes(itemType) ? takeQuantity : undefined,
          },
        ],
      });

      if (res.data.success) {
        setTakeSuccessMsg(`Successfully recorded hardware taken: ${selectedItemName} (Qty: ${takeQuantity}).`);
        setDeviceSerial('');
        setTakeQuantity(1);
        fetchInventoryItems();
      }
    } catch (err: any) {
      setTakeErrorMsg(err.response?.data?.message || err.message || 'Failed to record hardware checkout.');
    }
  };

  // Add Hardware item to queue with mandatory validation rules (Rules 6, 7, 8, 9)
  const handleAddHardwareItem = () => {
    setValidationError('');

    if (hardwareType === 'SET_TOP_BOX' && (!serialNumber || serialNumber.trim() === '')) {
      setValidationError('Set-top Box serial number is mandatory (Rule 6).');
      return;
    }

    if ((hardwareType === 'WIFI_ROUTER' || hardwareType === 'WIFI_MODEM') && (!serialNumber || serialNumber.trim() === '')) {
      setValidationError('Wi-Fi Router/Modem serial number is mandatory (Rule 7).');
      return;
    }

    if (hardwareType === 'CABLE' && (!lengthMeters || Number(lengthMeters) <= 0)) {
      setValidationError('Cable length in meters is mandatory (Rule 8).');
      return;
    }

    if (hardwareType === 'OPTICAL_FIBER' && (!lengthMeters || Number(lengthMeters) <= 0)) {
      setValidationError('Optical Fiber length in meters is mandatory (Rule 9).');
      return;
    }

    const newItem = {
      itemType: hardwareType,
      serialNumber: ['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(hardwareType) ? serialNumber.trim() : undefined,
      lengthMeters: ['CABLE', 'OPTICAL_FIBER'].includes(hardwareType) ? Number(lengthMeters) : undefined,
    };

    setHardwareList([...hardwareList, newItem]);
    setSerialNumber('');
    setLengthMeters('');
  };

  const handleSaveHardwareTaken = async () => {
    if (!hardwareModal) return;

    if (hardwareList.length === 0) {
      setValidationError('Please add at least one hardware item taken for the job.');
      return;
    }

    try {
      const res = await api.post('/inventory/take', {
        complaintId: hardwareModal.complaintId,
        customerId: hardwareModal.customerId,
        items: hardwareList,
      });

      if (res.data.success) {
        setHardwareModal(null);
        setHardwareList([]);
        fetchComplaints();
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to record hardware usage.');
    }
  };

  const handleCompleteComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModal) return;

    try {
      const res = await api.post(`/complaints/${completeModal.complaintId}/complete`, {
        resolutionNotes,
        hardwareUsed: completeModal.hardwareUsed || [],
      });

      if (res.data.success) {
        setCompleteModal(null);
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete complaint.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-400" />
            Field Service Technician Jobs Queue
          </h2>
          <p className="text-xs text-slate-400">
            Field Technician: <strong className="text-white">{user?.name}</strong> ({user?.employeeId})
          </p>
        </div>

        {/* Live Tracking Pill */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-3">
          <Radio className={`w-4 h-4 ${locationStatus.active ? 'text-emerald-400 animate-ping' : 'text-slate-500'}`} />
          <div>
            <p className="font-bold text-slate-200">
              {locationStatus.active ? 'GPS Tracking Active' : 'GPS Offline'}
            </p>
            <p className="text-[11px] text-slate-400">{locationStatus.message}</p>
          </div>
        </div>
      </div>

      {/* Permanent Hardware Checkout Card for Service Agent */}
      <div className="glass-card p-6 rounded-2xl border border-sky-500/30 bg-slate-900/90 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-sky-400" />
            Take Hardware from Inventory (New Customer Setup / Replacement)
          </h3>
          <span className="text-xs text-slate-400 font-mono bg-sky-500/10 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-500/20">
            Visible to Admin
          </span>
        </div>

        {takeSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
            {takeSuccessMsg}
          </div>
        )}

        {takeErrorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{takeErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleTakeHardwareFromCard} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Field 1: Dropdown menu showing names of items in inventory */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hardware Item Name (Inventory) *
              </label>
              <select
                required
                value={selectedItemName}
                onChange={(e) => {
                  setSelectedItemName(e.target.value);
                  setTakeErrorMsg('');
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {inventoryItems.length === 0 ? (
                  <option value="">No inventory items available</option>
                ) : (
                  Array.from(new Set(inventoryItems.map((i) => i.name))).map((name) => {
                    const itemObj = inventoryItems.find((i) => i.name === name);
                    return (
                      <option key={name} value={name}>
                        {name} {itemObj ? `(${itemObj.itemType})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Field 2: Quantity selector field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantity / Meters *
              </label>
              <input
                type="number"
                required
                min={1}
                value={takeQuantity}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                onChange={(e) => setTakeQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Setup Box Serial / Modem Serial Field for new setup or replacement */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Setup Box Serial / Modem Serial Number
              </label>
              <input
                type="text"
                placeholder="Enter STB or Router serial number..."
                value={deviceSerial}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                onChange={(e) => setDeviceSerial(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md flex items-center gap-2 transition"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Submit Hardware Usage</span>
            </button>
          </div>
        </form>
      </div>

      {/* Complaints Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400 glass-panel rounded-2xl">
            Loading assigned service complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center text-slate-400 glass-panel rounded-2xl">
            No service complaints assigned to your queue.
          </div>
        ) : (
          complaints.map((c) => (
            <div
              key={c.complaintId}
              className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-sky-500/40 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-sky-400">{c.complaintId}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      c.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    Priority: {c.priority}
                  </span>
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-white text-base">{c.customerName}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {c.customerPhone}
                  </p>
                  <p className="text-xs text-slate-400 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    {c.customerAddress}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-sky-300">Complaint Type: {c.complaintType}</p>
                  <p className="text-xs text-slate-300">{c.description}</p>
                </div>
              </div>

              {/* Hardware Used Tags */}
              {c.hardwareUsed && c.hardwareUsed.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-400 mb-1">Recorded Hardware Used:</p>
                  <div className="flex flex-wrap gap-2">
                    {c.hardwareUsed.map((hw, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-sky-300"
                      >
                        {hw.itemType} {hw.serialNumber ? `(SN: ${hw.serialNumber})` : ''}{' '}
                        {hw.lengthMeters ? `(${hw.lengthMeters}m)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
                {/* Google Maps Navigation Link (Section 24) */}
                <a
                  href={`https://www.google.com/maps?q=${c.location.latitude},${c.location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Customer Location (Google Maps)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                {c.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleUpdateStatus(c.complaintId, 'IN_PROGRESS')}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md"
                  >
                    Start Service Job
                  </button>
                )}

                {c.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={() => {
                        setHardwareModal(c);
                        setHardwareList([]);
                        setValidationError('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span>Log Hardware Taken</span>
                    </button>

                    <button
                      onClick={() => setCompleteModal(c)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                    >
                      Complete Ticket
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hardware Taken Modal (Section 19 / Rules 6, 7, 8, 9) */}
      {hardwareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-purple-500/40 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-purple-400" />
                Record Hardware Taken for Complaint {hardwareModal.complaintId}
              </h3>
              <button onClick={() => setHardwareModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Add Hardware Form Item */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hardware Item Category</label>
                <select
                  value={hardwareType}
                  onChange={(e) => {
                    setHardwareType(e.target.value);
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="SET_TOP_BOX">Set-top Box (STB Serial Required)</option>
                  <option value="WIFI_ROUTER">Wi-Fi Router (Router Serial Required)</option>
                  <option value="WIFI_MODEM">Wi-Fi Modem (Modem Serial Required)</option>
                  <option value="CABLE">Coaxial Cable (Meters Required)</option>
                  <option value="OPTICAL_FIBER">Optical Fiber (Meters Required)</option>
                </select>
              </div>

              {['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(hardwareType) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Serial Number (Mandatory Rule 6 & 7)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter device serial number..."
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Length Used in Meters (Mandatory Rule 8 & 9)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 25 meters"
                    value={lengthMeters}
                    onChange={(e) => setLengthMeters(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddHardwareItem}
                className="w-full py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold transition"
              >
                + Add Item to Job Payload
              </button>
            </div>

            {/* Added Hardware List */}
            {hardwareList.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">Items Queued for Transaction:</p>
                <div className="space-y-1.5">
                  {hardwareList.map((hw, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-200 font-mono"
                    >
                      <span>
                        {hw.itemType} {hw.serialNumber ? `(SN: ${hw.serialNumber})` : ''}{' '}
                        {hw.lengthMeters ? `(${hw.lengthMeters} meters)` : ''}
                      </span>
                      <button
                        onClick={() => setHardwareList(hardwareList.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHardwareModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHardwareTaken}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md"
              >
                Save Hardware Usage Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Ticket Modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Complete Job Ticket {completeModal.complaintId}</h3>
              <button onClick={() => setCompleteModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteComplaintSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution Work Notes</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
                >
                  Mark Ticket Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
