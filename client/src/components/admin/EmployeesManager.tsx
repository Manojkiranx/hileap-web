import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { User } from '../../types';
import {
  UserCheck,
  Plus,
  Edit,
  Shield,
  Phone,
  Mail,
  X,
  Trash2,
} from 'lucide-react';

const INITIAL_AREAS = [
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

export const EmployeesManager: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [areasList, setAreasList] = useState<string[]>(INITIAL_AREAS);
  const [loading, setLoading] = useState<boolean>(true);
  const [roleFilter, setRoleFilter] = useState<string>('');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [showAreaModal, setShowAreaModal] = useState<boolean>(false);
  const [newAreaInput, setNewAreaInput] = useState<string>('');
  const [editEmployee, setEditEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'Collection-Agent',
    assignedWorks: ['door_cable_collection'],
    assignedLocalities: ['Athippaly'],
    workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    salaryDetails: { baseSalary: 18000, allowances: 2500, deductions: 500 },
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { role: roleFilter } });
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      if (res.data.success && Array.isArray(res.data.data)) {
        const fetched = res.data.data.map((a: any) => a.name);
        const combined = Array.from(new Set([...INITIAL_AREAS, ...fetched]));
        setAreasList(combined);
      }
    } catch (err) {
      console.error('Failed to fetch areas:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAreas();
  }, [fetchEmployees]);

  const handleWorkToggle = (workKey: string) => {
    const current = formData.assignedWorks || [];
    if (current.includes(workKey)) {
      setFormData({ ...formData, assignedWorks: current.filter((w: string) => w !== workKey) });
    } else {
      setFormData({ ...formData, assignedWorks: [...current, workKey] });
    }
  };

  const handleLocalityToggle = (localityName: string) => {
    const current = formData.assignedLocalities || [];
    if (current.includes(localityName)) {
      setFormData({ ...formData, assignedLocalities: current.filter((l: string) => l !== localityName) });
    } else {
      setFormData({ ...formData, assignedLocalities: [...current, localityName] });
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaInput || !newAreaInput.trim()) {
      alert('Please enter an area name.');
      return;
    }

    try {
      const res = await api.post('/areas', { name: newAreaInput.trim() });
      if (res.data.success) {
        alert(res.data.message || `Area "${newAreaInput.trim()}" added successfully.`);
        setNewAreaInput('');
        setShowAreaModal(false);
        fetchAreas();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to add new area.');
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      alert('Please enter employee name.');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      alert('Please enter employee email.');
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert('Please enter employee phone number.');
      return;
    }

    try {
      if (editEmployee) {
        await api.put(`/employees/${editEmployee.employeeId}`, formData);
      } else {
        await api.post('/employees', formData);
      }
      setShowModal(false);
      setEditEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save employee profile.');
    }
  };

  const handleDeleteEmployee = async (employeeId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete employee "${name}" (${employeeId})?`)) {
      try {
        await api.delete(`/employees/${employeeId}`);
        fetchEmployees();
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to delete employee account.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-400" />
            Employee Role & Work Authorization Manager
          </h2>
          <p className="text-xs text-slate-400">Configure roles, collection work authorizations, assigned areas, working hours & salaries</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAreaModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>+ Add New Area</span>
          </button>

          <button
            onClick={() => {
              setEditEmployee(null);
              setFormData({
                name: '',
                phone: '',
                email: '',
                password: 'AgentPass@123',
                role: 'Collection-Agent',
                assignedWorks: ['door_cable_collection'],
                assignedLocalities: [areasList[0] || 'Athippaly'],
                workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
                salaryDetails: { baseSalary: 18000, allowances: 2500, deductions: 500 },
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Employee</span>
          </button>
        </div>
      </div>

      {/* Role Filter */}
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
        <span className="text-xs font-semibold text-slate-400">Filter by Role:</span>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Employee Roles</option>
          <option value="Admin">Admin Only</option>
          <option value="Collection-Agent">Collection Agents</option>
          <option value="Customer-Service-Agent">Customer-Service Field Techs</option>
        </select>
      </div>

      {/* Employee List Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Employee ID / Name</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Assigned Areas</th>
                <th className="px-5 py-4">Assigned Works</th>
                <th className="px-5 py-4">Salary & Allowances</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          {emp.name}
                          <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {emp.employeeId}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {emp.email}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {emp.phone}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          emp.role === 'Admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : emp.role === 'Collection-Agent'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(emp as any).assignedLocalities && (emp as any).assignedLocalities.length > 0 ? (
                          (emp as any).assignedLocalities.map((loc: string) => (
                            <span key={loc} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {loc}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">All / General</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {emp.assignedWorks && emp.assignedWorks.length > 0 ? (
                          emp.assignedWorks.map((work) => (
                            <span key={work} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {work}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No works assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs">
                      <p className="font-bold text-white">Base: ₹{(emp.salaryDetails?.baseSalary || 0).toLocaleString('en-IN')}</p>
                      {(emp.salaryDetails?.allowances || 0) > 0 && (
                        <p className="text-[11px] text-emerald-400">+ Allowances: ₹{(emp.salaryDetails?.allowances || 0).toLocaleString('en-IN')}</p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditEmployee(emp);
                            setFormData(emp);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit Employee"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteEmployee(emp.employeeId, emp.name)}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-xl w-full p-6 rounded-2xl border border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editEmployee ? `Edit Employee Permissions: ${editEmployee.employeeId}` : 'Register New Employee'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder={editEmployee ? 'Leave blank to keep current' : 'Password'}
                    value={formData.password || ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Collection-Agent">Collection Agent</option>
                    <option value="Customer-Service-Agent">Customer-Service Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.salaryDetails?.baseSalary || 18000}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryDetails: { ...formData.salaryDetails, baseSalary: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Allowances (₹) (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter allowance amount..."
                    value={formData.salaryDetails?.allowances !== undefined ? formData.salaryDetails?.allowances : ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryDetails: { ...formData.salaryDetails, allowances: Number(e.target.value || 0) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Deductions (₹) (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter deductions amount..."
                    value={formData.salaryDetails?.deductions !== undefined ? formData.salaryDetails?.deductions : ''}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryDetails: { ...formData.salaryDetails, deductions: Number(e.target.value || 0) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Assign Areas for Collection Agents */}
              {formData.role === 'Collection-Agent' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-emerald-400">
                    Assign Collection Areas / Localities (Collection Agent Access)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Check the areas assigned to this collection agent for door-to-door payment ledger access.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto">
                    {areasList.map((areaName) => (
                      <label key={areaName} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assignedLocalities?.includes(areaName)}
                          onChange={() => handleLocalityToggle(areaName)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="truncate">{areaName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Authorization Checkboxes */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  Work Authorizations
                </label>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignedWorks?.includes('door_cable_collection')}
                      onChange={() => handleWorkToggle('door_cable_collection')}
                      className="rounded border-slate-700 text-purple-500"
                    />
                    <span>Door-to-Door Cable Payment Collection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignedWorks?.includes('door_wifi_collection')}
                      onChange={() => handleWorkToggle('door_wifi_collection')}
                      className="rounded border-slate-700 text-purple-500"
                    />
                    <span>Door-to-Door Wi-Fi Payment Collection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignedWorks?.includes('customer_service')}
                      onChange={() => handleWorkToggle('customer_service')}
                      className="rounded border-slate-700 text-purple-500"
                    />
                    <span>Customer Service Field Tech Work</span>
                  </label>
                </div>
              </div>

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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md"
                >
                  Save Employee Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Add New Area / Locality (Admin)
              </h3>
              <button onClick={() => setShowAreaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Area / Locality Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Valley or Sector 5..."
                  value={newAreaInput}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => setNewAreaInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
                >
                  Create Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
