import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { AuditLog } from '../../types';
import { ShieldAlert, Trash2 } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteAllAuditLogs = async () => {
    if (
      window.confirm(
        'PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY DELETE ALL security audit logs from the database?\nThis action cannot be undone.'
      )
    ) {
      try {
        const res = await api.delete('/audit-logs');
        if (res.data.success) {
          alert(res.data.message || 'All audit logs deleted successfully.');
          setLogs([]);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to delete audit logs.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-sky-400" />
            Security Audit Logs & Event Trail
          </h2>
          <p className="text-xs text-slate-400">Comprehensive audit record of sensitive financial, customer, employee & inventory operations</p>
        </div>

        <button
          onClick={handleDeleteAllAuditLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 disabled:opacity-50 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition shadow-lg"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All Audit Logs</span>
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 font-mono">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Log ID / Timestamp</th>
                <th className="px-5 py-4">Employee ID</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Entity</th>
                <th className="px-5 py-4">Changes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 text-slate-400">
                      <p className="text-white font-bold">{log.logId}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sky-400 font-bold">{log.userEmployeeId}</td>
                    <td className="px-5 py-4 text-purple-400">{log.userRole}</td>

                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-bold">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">{log.entity} ({log.entityId || 'N/A'})</td>

                    <td className="px-5 py-4 max-w-xs truncate text-[11px] text-slate-400">
                      {log.newValue ? JSON.stringify(log.newValue) : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
