import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Salary } from '../../types';
import { CircleDollarSign } from 'lucide-react';

export const SalaryManager: React.FC = () => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salaries');
      if (res.data.success) {
        setSalaries(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  const handleMarkPaid = async (sal: Salary) => {
    try {
      await api.post('/salaries', {
        employeeId: sal.employeeId,
        month: sal.month,
        baseSalary: sal.baseSalary,
        allowances: sal.allowances,
        deductions: sal.deductions,
        bonus: sal.bonus,
        paymentStatus: 'PAID',
      });
      fetchSalaries();
    } catch (err: any) {
      alert(err.message || 'Failed to update salary status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CircleDollarSign className="w-6 h-6 text-emerald-400" />
          Employee Payroll & Salary Management
        </h2>
        <p className="text-xs text-slate-400">Section 26 & Rule 13: Salary records strictly private to employee & Admin</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Month</th>
                <th className="px-5 py-4">Base Salary</th>
                <th className="px-5 py-4">Allowances</th>
                <th className="px-5 py-4">Deductions</th>
                <th className="px-5 py-4">Bonus</th>
                <th className="px-5 py-4">Net Salary</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    Loading salary ledger...
                  </td>
                </tr>
              ) : salaries.map((s) => (
                <tr key={s.salaryId} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4">
                    <p className="font-bold text-white">{s.employeeName || s.employeeId}</p>
                    <p className="text-xs font-mono text-slate-400">{s.employeeId}</p>
                  </td>

                  <td className="px-5 py-4 font-mono text-xs">{s.month}</td>
                  <td className="px-5 py-4">₹{s.baseSalary.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-emerald-400">+₹{s.allowances}</td>
                  <td className="px-5 py-4 text-red-400">-₹{s.deductions}</td>
                  <td className="px-5 py-4 text-sky-400">+₹{s.bonus}</td>

                  <td className="px-5 py-4 font-extrabold text-white text-base">
                    ₹{s.netSalary.toLocaleString('en-IN')}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {s.paymentStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {s.paymentStatus === 'PENDING' && (
                      <button
                        onClick={() => handleMarkPaid(s)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
