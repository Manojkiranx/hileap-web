import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, title }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">
          {title || 'Dashboard Overview'}
        </h2>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-200">{user.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">{user.email}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sky-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      )}
    </header>
  );
};
