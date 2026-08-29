import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  Wrench,
  Package,
  MapPin,
  CircleDollarSign,
  ShieldAlert,
  Settings,
  LogOut,
  Radio,
  Tv,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, locationStatus } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'Admin';
  const isCollectionAgent = user.role === 'Collection-Agent';
  const isServiceAgent = user.role === 'Customer-Service-Agent';
  const isCustomer = user.role === 'Customer';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 glass-panel flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-md glow-sky">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">HiLeap Network</h1>
            <p className="text-xs text-sky-400 font-medium">Cable & Wi-Fi Management</p>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 font-mono">{user.employeeId || (user as any).customerId}</p>
          </div>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
              isAdmin
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : isCollectionAgent
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isCustomer
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isCustomer ? 'Subscriber' : user.role.replace('-Agent', '')}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {isCustomer && (
            <>
              <p className="px-3 text-[11px] uppercase font-bold text-slate-500 tracking-wider">Subscriber Portal</p>
              <NavLink to="/customer" end className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>My Dashboard & Plan</span>
              </NavLink>
            </>
          )}
          {isAdmin && (
            <>
              <p className="px-3 text-[11px] uppercase font-bold text-slate-500 tracking-wider">Admin Portal</p>
              <NavLink to="/admin" end className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/admin/customers" className={linkClass} onClick={onClose}>
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </NavLink>

              <NavLink to="/admin/collections" className={linkClass} onClick={onClose}>
                <CreditCard className="w-4 h-4" />
                <span>Collections & Excel</span>
              </NavLink>

              <NavLink to="/admin/employees" className={linkClass} onClick={onClose}>
                <UserCheck className="w-4 h-4" />
                <span>Employees</span>
              </NavLink>

              <NavLink to="/admin/complaints" className={linkClass} onClick={onClose}>
                <Wrench className="w-4 h-4" />
                <span>Complaints</span>
              </NavLink>

              <NavLink to="/admin/inventory" className={linkClass} onClick={onClose}>
                <Package className="w-4 h-4" />
                <span>Master Inventory</span>
              </NavLink>

              <NavLink to="/admin/live-map" className={linkClass} onClick={onClose}>
                <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Live Agent Map</span>
              </NavLink>

              <NavLink to="/admin/salary" className={linkClass} onClick={onClose}>
                <CircleDollarSign className="w-4 h-4" />
                <span>Salary Management</span>
              </NavLink>

              <NavLink to="/admin/audit-logs" className={linkClass} onClick={onClose}>
                <ShieldAlert className="w-4 h-4" />
                <span>Audit Logs</span>
              </NavLink>

              <NavLink to="/admin/settings" className={linkClass} onClick={onClose}>
                <Settings className="w-4 h-4" />
                <span>System Settings</span>
              </NavLink>
            </>
          )}

          {isCollectionAgent && (
            <>
              <p className="px-3 text-[11px] uppercase font-bold text-slate-500 tracking-wider">Collection Agent</p>
              <NavLink to="/collection" end className={linkClass} onClick={onClose}>
                <CreditCard className="w-4 h-4" />
                <span>Door-to-Door Collection</span>
              </NavLink>
              <NavLink to="/collection/salary" className={linkClass} onClick={onClose}>
                <CircleDollarSign className="w-4 h-4" />
                <span>My Salary</span>
              </NavLink>
            </>
          )}

          {isServiceAgent && (
            <>
              <p className="px-3 text-[11px] uppercase font-bold text-slate-500 tracking-wider">Service Tech Agent</p>
              <NavLink to="/service" end className={linkClass} onClick={onClose}>
                <Wrench className="w-4 h-4" />
                <span>My Assigned Jobs</span>
              </NavLink>
              <NavLink to="/service/salary" className={linkClass} onClick={onClose}>
                <CircleDollarSign className="w-4 h-4" />
                <span>My Salary</span>
              </NavLink>

              {/* Geolocation status box */}
              <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className={`w-3.5 h-3.5 ${locationStatus.active ? 'text-emerald-400 animate-ping' : 'text-slate-500'}`} />
                  <span className="font-semibold text-slate-300">Live GPS Tracking</span>
                </div>
                <p className="text-[11px] text-slate-400">{locationStatus.message}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
