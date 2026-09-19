import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Settings, Save, CheckCircle, Lock, KeyRound, AlertCircle, Globe, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { Portal } from '../../types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    COMPANY_UPI_ID: '',
    COMPANY_UPI_QR_URL: '',
    RECHARGE_URL: '',
    PAUSE_RESUME_URL: '',
    UNSUBSCRIBE_URL: '',
    ALLOW_OVERPAYMENT: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  // Portal Management State
  const [portals, setPortals] = useState<Portal[]>([]);
  const [portalModalOpen, setPortalModalOpen] = useState<boolean>(false);
  const [editingPortal, setEditingPortal] = useState<Portal | null>(null);
  const [portalName, setPortalName] = useState<string>('');
  const [portalUrl, setPortalUrl] = useState<string>('');
  const [portalCategory, setPortalCategory] = useState<'CABLE' | 'WIFI' | 'BOTH' | 'OTHER'>('CABLE');
  const [portalActive, setPortalActive] = useState<boolean>(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Change Password state
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [pwdLoading, setPwdLoading] = useState<boolean>(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const fetchPortals = async () => {
    try {
      const res = await api.get('/portals');
      if (res.data.success) {
        setPortals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load portals:', err);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success) {
          setSettings(res.data.data);
        }
        await fetchPortals();
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update system configuration.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (!oldPassword) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation password do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });

      if (res.data.success) {
        setPwdSuccess('Your password has been changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password.';
      setPwdError(msg);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleOpenAddPortal = () => {
    setEditingPortal(null);
    setPortalName('');
    setPortalUrl('https://');
    setPortalCategory('CABLE');
    setPortalActive(true);
    setPortalError(null);
    setPortalModalOpen(true);
  };

  const handleOpenEditPortal = (p: Portal) => {
    setEditingPortal(p);
    setPortalName(p.name);
    setPortalUrl(p.url);
    setPortalCategory(p.category || 'CABLE');
    setPortalActive(p.active);
    setPortalError(null);
    setPortalModalOpen(true);
  };

  const handleSavePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError(null);

    if (!portalName.trim() || !portalUrl.trim()) {
      setPortalError('Portal Name and Portal URL are required.');
      return;
    }

    try {
      if (editingPortal) {
        await api.put(`/portals/${editingPortal._id}`, {
          name: portalName.trim(),
          url: portalUrl.trim(),
          category: portalCategory,
          active: portalActive,
        });
      } else {
        await api.post('/portals', {
          name: portalName.trim(),
          url: portalUrl.trim(),
          category: portalCategory,
          active: portalActive,
        });
      }
      setPortalModalOpen(false);
      await fetchPortals();
    } catch (err: any) {
      setPortalError(err.response?.data?.message || err.message || 'Failed to save portal.');
    }
  };

  const handleDeletePortal = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete portal "${name}"?`)) return;
    try {
      await api.delete(`/portals/${id}`);
      await fetchPortals();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete portal.');
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-slate-400">
        Loading system configuration settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" />
          System Settings & Security Management
        </h2>
        <p className="text-xs text-slate-400">
          Manage recharge portals, company payment configuration, and admin security password
        </p>
      </div>

      {/* 1. Portal Management Section (Req 1) */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Portal Management (Operator & Recharge Portals)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add and configure operator portals (e.g., TCCL, TACTV, WIFI). These dynamically power customer & user portal selections.
            </p>
          </div>
          <button
            onClick={handleOpenAddPortal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Portal</span>
          </button>
        </div>

        {/* Portals List Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-3">Portal Name</th>
                <th className="p-3">Recharge / Portal URL</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {portals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No portals configured yet. Click "Add Portal" above.
                  </td>
                </tr>
              ) : (
                portals.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 font-mono text-cyan-300 max-w-xs truncate">{p.url}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-semibold text-[10px]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditPortal(p)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                        title="Edit Portal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePortal(p._id!, p.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-red-400 transition"
                        title="Delete Portal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Portal Modal */}
      {portalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              {editingPortal ? 'Edit Portal' : 'Add New Portal'}
            </h3>

            {portalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{portalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePortal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Portal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TCCL, TACTV, WIFI, or New Portal"
                  value={portalName}
                  onChange={(e) => setPortalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Portal / Recharge URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/recharge"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={portalCategory}
                  onChange={(e) => setPortalCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="CABLE">Cable TV</option>
                  <option value="WIFI">Wi-Fi Broadband</option>
                  <option value="BOTH">Combo / Both</option>
                  <option value="OTHER">Other / General</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={portalActive}
                  onChange={(e) => setPortalActive(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500"
                />
                <span className="text-xs text-slate-200 font-semibold">Active (Available for selections)</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPortalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition"
                >
                  Save Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Security Card */}
      <form onSubmit={handleChangePassword} className="glass-panel p-6 rounded-2xl space-y-4 border border-purple-500/30">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Admin Security Password Change
        </h3>
        <p className="text-xs text-slate-400">
          Verify your current password to set a new secure password for system access.
        </p>

        {pwdSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {pwdSuccess}
          </div>
        )}

        {pwdError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {pwdError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={pwdLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-semibold text-xs shadow-md transition"
          >
            <Lock className="w-4 h-4" />
            <span>{pwdLoading ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </div>
      </form>

      {/* System Settings Form */}
      <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            System settings updated successfully!
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-sky-400">
            Company UPI Payment Gateway Settings
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company UPI ID</label>
            <input
              type="text"
              required
              value={settings.COMPANY_UPI_ID || ''}
              onChange={(e) => setSettings({ ...settings, COMPANY_UPI_ID: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company UPI QR Code Image URL</label>
            <input
              type="text"
              required
              value={settings.COMPANY_UPI_QR_URL || ''}
              onChange={(e) => setSettings({ ...settings, COMPANY_UPI_QR_URL: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={Boolean(settings.ALLOW_OVERPAYMENT)}
              onChange={(e) => setSettings({ ...settings, ALLOW_OVERPAYMENT: e.target.checked })}
              className="rounded border-slate-700 text-sky-500"
            />
            <span className="text-xs text-slate-200 font-semibold">Allow Customer Overpayment Advance Balance</span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/30 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
