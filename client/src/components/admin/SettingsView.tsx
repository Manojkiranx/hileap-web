import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Settings, Save, CheckCircle, Lock, KeyRound, AlertCircle } from 'lucide-react';

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

  // Change Password state
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [pwdLoading, setPwdLoading] = useState<boolean>(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success) {
          setSettings(res.data.data);
        }
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

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-slate-400">
        Loading system configuration settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" />
          System Settings & Security Management
        </h2>
        <p className="text-xs text-slate-400">Configure company UPI details, external subscription integrations, and admin security password</p>
      </div>

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

        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
            External Subscription Management URL Templates (Section 29)
          </h3>
          <p className="text-xs text-slate-400">
            Use placeholders <code className="text-sky-300 font-mono">{'{BOX_ID}'}</code> and <code className="text-sky-300 font-mono">{'{CUSTOMER_ID}'}</code> which will be dynamically populated upon clicking Admin buttons.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Recharge URL Template</label>
            <input
              type="text"
              required
              value={settings.RECHARGE_URL || ''}
              onChange={(e) => setSettings({ ...settings, RECHARGE_URL: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pause / Resume URL Template</label>
            <input
              type="text"
              required
              value={settings.PAUSE_RESUME_URL || ''}
              onChange={(e) => setSettings({ ...settings, PAUSE_RESUME_URL: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Unsubscribe URL Template</label>
            <input
              type="text"
              required
              value={settings.UNSUBSCRIBE_URL || ''}
              onChange={(e) => setSettings({ ...settings, UNSUBSCRIBE_URL: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
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
