import React from 'react';
import { Menu, Bell, Moon, Shield, Building2, ChevronRight } from 'lucide-react';
import type { UserRole } from '../support/types';

interface NavbarProps {
  role: UserRole;
  onRoleToggle: () => void;
  onToggleMobileMenu?: () => void;
  userName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  onRoleToggle,
  onToggleMobileMenu,
  userName
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 shrink-0 shadow-xs">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button 
          type="button" 
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors md:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs truncate">
          <span className="text-slate-500 font-medium hidden sm:inline">Support</span>
          <ChevronRight size={13} className="text-slate-400 hidden sm:inline" />
          <span className="text-slate-800 font-semibold truncate max-w-[120px] sm:max-w-none">{userName}</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher, Bell, Theme, Avatar */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Responsive Role Toggle Pill */}
        <button
          type="button"
          onClick={onRoleToggle}
          title="Click to toggle perspective between Company Owner and Super Admin"
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-all ${
            role === 'company_admin'
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
          }`}
        >
          {role === 'company_admin' ? (
            <>
              <Building2 size={13} className="shrink-0 text-blue-600" />
              <span className="hidden sm:inline">Role: </span>
              <span>Company Owner</span>
            </>
          ) : (
            <>
              <Shield size={13} className="shrink-0 text-purple-600" />
              <span className="hidden sm:inline">Role: </span>
              <span>Super Admin</span>
            </>
          )}
          <span className="opacity-60 text-[10px] hidden sm:inline">[switch]</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer p-1.5 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </div>

        {/* Theme Toggle */}
        <div className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer p-1.5 hidden sm:flex transition-colors">
          <Moon size={17} />
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {userName.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
