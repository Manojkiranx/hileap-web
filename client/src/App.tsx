import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { CustomersManager } from './components/admin/CustomersManager';
import { CollectionsManager } from './components/admin/CollectionsManager';
import { EmployeesManager } from './components/admin/EmployeesManager';
import { MasterInventoryManager } from './components/admin/MasterInventoryManager';
import { LiveAgentMap } from './components/admin/LiveAgentMap';
import { SalaryManager } from './components/admin/SalaryManager';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { SettingsView } from './components/admin/SettingsView';

import { CollectionAgentView } from './components/collection/CollectionAgentView';
import { ServiceAgentView } from './components/service/ServiceAgentView';
import { CustomerDashboardView } from './components/customer/CustomerDashboardView';

// Customer Dashboard Wrapper
const CustomerWrapper: React.FC = () => {
  const { user } = useAuth();
  return <CustomerDashboardView user={user} />;
};

// Layout wrapper for authenticated pages
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Root index redirector
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Collection-Agent') return <Navigate to="/collection" replace />;
  if (user.role === 'Customer-Service-Agent') return <Navigate to="/service" replace />;
  if (user.role === 'Customer') return <Navigate to="/customer" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboardView />} />
              <Route path="/admin/customers" element={<CustomersManager />} />
              <Route path="/admin/collections" element={<CollectionsManager />} />
              <Route path="/admin/employees" element={<EmployeesManager />} />
              <Route path="/admin/inventory" element={<MasterInventoryManager />} />
              <Route path="/admin/live-map" element={<LiveAgentMap />} />
              <Route path="/admin/salary" element={<SalaryManager />} />
              <Route path="/admin/audit-logs" element={<AuditLogsView />} />
              <Route path="/admin/complaints" element={<ServiceAgentView />} />
              <Route path="/admin/settings" element={<SettingsView />} />
            </Route>
          </Route>

          {/* Collection Agent Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Collection-Agent']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/collection" element={<CollectionAgentView />} />
              <Route path="/collection/salary" element={<SalaryManager />} />
            </Route>
          </Route>

          {/* Service Agent Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Customer-Service-Agent']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/service" element={<ServiceAgentView />} />
              <Route path="/service/salary" element={<SalaryManager />} />
            </Route>
          </Route>

          {/* Customer Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/customer" element={<CustomerWrapper />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};
