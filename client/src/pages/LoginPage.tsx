import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Tv, ShieldCheck, UserCheck, Wrench, Lock, Mail, AlertCircle, User, Phone } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginCustomer } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'STAFF' | 'CUSTOMER'>('STAFF');
  const [identifier, setIdentifier] = useState<string>('sabiesh@gmail.com');
  const [password, setPassword] = useState<string>('HileapAdmin@2026');
  const [customerInput, setCustomerInput] = useState<string>('CUST-1001');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (activeTab === 'STAFF') {
        const user = await login(identifier, password);
        if (user.role === 'Admin') {
          navigate('/admin');
        } else if (user.role === 'Collection-Agent') {
          navigate('/collection');
        } else if (user.role === 'Customer-Service-Agent') {
          navigate('/service');
        } else {
          navigate('/');
        }
      } else {
        await loginCustomer(customerInput);
        navigate('/customer');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setActiveTab('STAFF');
    setIdentifier(email);
    setPassword(pass);
  };

  const handleQuickCustomer = (custId: string) => {
    setActiveTab('CUSTOMER');
    setCustomerInput(custId);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-xl glow-sky mb-2">
          <Tv className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">HiLeap Network</h1>
        <p className="text-sm text-sky-400 font-medium">Cable TV & Wi-Fi Management System</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 space-y-6 sm:px-10">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('STAFF')}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'STAFF'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin / Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMER')}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'CUSTOMER'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'STAFF' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email / Employee ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@hileap.com or EMP-101"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition duration-200"
                >
                  {loading ? 'Authenticating...' : 'Sign In as Staff / Admin'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Customer ID or Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={customerInput}
                      onChange={(e) => setCustomerInput(e.target.value)}
                      placeholder="e.g. CUST-1001 or 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-purple-500/40 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter your assigned Customer ID or registered Phone Number to access plan details & complaints.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition duration-200"
                >
                  {loading ? 'Authenticating Customer...' : 'Sign In to Customer Portal'}
                </button>
              </>
            )}
          </form>

          {/* Quick Demo Login Switcher */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Role Switcher (Dev Credentials)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@hileap.com', 'HileapAdmin@2026')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 font-medium flex items-center justify-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCustomer('CUST-1001')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-medium flex items-center justify-center gap-1.5 transition"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Customer CUST-1001</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('coll1@hileap.com', 'AgentPass@123')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-sky-300 font-medium flex items-center justify-center gap-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Collection Agent</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('svc1@hileap.com', 'AgentPass@123')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Service Tech 1</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
