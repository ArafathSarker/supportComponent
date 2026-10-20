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
    <header className="h-14 bg-[#0b0f19] border-b border-[#1a2336] flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 shrink-0">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button 
          type="button" 
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors md:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs truncate">
          <span className="text-gray-400 font-medium hidden sm:inline">Support</span>
          <ChevronRight size={13} className="text-gray-600 hidden sm:inline" />
          <span className="text-gray-300 font-medium truncate max-w-[120px] sm:max-w-none">{userName}</span>
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
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
              : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
          }`}
        >
          {role === 'company_admin' ? (
            <>
              <Building2 size={13} className="shrink-0" />
              <span className="hidden sm:inline">Role: </span>
              <span>Company Owner</span>
            </>
          ) : (
            <>
              <Shield size={13} className="shrink-0" />
              <span className="hidden sm:inline">Role: </span>
              <span>Super Admin</span>
            </>
          )}
          <span className="opacity-50 text-[10px] hidden sm:inline">[switch]</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative text-gray-400 hover:text-gray-200 cursor-pointer p-1">
          <Bell size={17} />
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
        </div>

        {/* Theme Toggle */}
        <div className="text-gray-400 hover:text-gray-200 cursor-pointer p-1 hidden sm:flex">
          <Moon size={17} />
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            {userName.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b0f19]" />
          </div>
        </div>
      </div>
    </header>
  );
};
