import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Authenticating user session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isRoleAllowed = allowedRoles.includes(user.role);

  // Enforce Rule 1: Collection-Agent requires role + assigned collection work
  let isWorkAllowed = true;
  if (user.role === 'Collection-Agent') {
    const hasWork =
      Array.isArray(user.assignedWorks) &&
      user.assignedWorks.some((w: string) => ['door_cable_collection', 'door_wifi_collection'].includes(w));
    if (!hasWork) isWorkAllowed = false;
  }

  if (!isRoleAllowed || !isWorkAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-red-500/30 text-center space-y-4 glow-amber">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">403 Access Denied</h3>
          <p className="text-sm text-slate-300">
            Your current employee account ({user.role}) is not authorized to access this module.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/80 text-xs font-mono text-slate-400 border border-slate-800 text-left space-y-1">
            <p><strong>Employee ID:</strong> {user.employeeId}</p>
            <p><strong>Assigned Works:</strong> {user.assignedWorks?.join(', ') || 'None'}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition"
          >
            Return to Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
