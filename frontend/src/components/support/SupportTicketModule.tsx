import React, { useState, useEffect } from 'react';
import { Building2, Shield, Wrench } from 'lucide-react';
import type { UserRole, CurrentUser, SupportTicketProps } from './types';
import { api } from './api';
import { SupportTickets } from './SupportTickets';

export const SupportTicketModule: React.FC<SupportTicketProps> = ({
  role: initialRole,
  currentUser: initialUser,
  apiUrl,
  wsUrl,
  brandName = 'CSI Smart Tech Ltd',
  categories,
  systems,
  showRoleSwitcher = true,
  className = '',
  onRoleChange,
  onTicketCreated,
  onTicketClosed
}) => {
  // Read role from localStorage if available, or prop, or default to company_admin
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('support_user_role');
    if (saved === 'super_admin' || saved === 'company_admin') {
      return saved as UserRole;
    }
    return initialRole || 'company_admin';
  });

  // Sync API URL if provided
  useEffect(() => {
    if (apiUrl || wsUrl) {
      api.setUrls(
        apiUrl || 'http://localhost:8000/api',
        wsUrl || 'ws://localhost:8000/ws'
      );
    }
  }, [apiUrl, wsUrl]);

  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const currentUser: CurrentUser = {
    id: initialUser?.id || (role === 'company_admin' ? 'usr-company-1' : 'usr-super-1'),
    name: initialUser?.name || (role === 'company_admin' ? 'Arafath' : 'Alex (Super Admin)'),
    role: role,
    company_name: initialUser?.company_name || brandName,
    email: initialUser?.email
  };

  return (
    <div className={`w-full font-sans text-gray-100 ${className}`} id="support-ticket-component">
      {/* Role Switcher Banner (Easily toggled off via showRoleSwitcher=false for production) */}
      {showRoleSwitcher && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-5 bg-[#111827] border border-[#1f293d] rounded-xl shadow-md">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-400">Current Role:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              role === 'company_admin'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
            }`}>
              {role === 'company_admin' ? (
                <>
                  <Building2 size={13} />
                  Company Admin (Client / Factory Owner)
                </>
              ) : (
                <>
                  <Shield size={13} />
                  Super Admin (Solution Provider)
                </>
              )}
            </span>
            <span className="text-gray-500 hidden sm:inline">
              | User: <strong className="text-gray-300">{currentUser.name}</strong> ({currentUser.company_name})
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleToggleRole(role === 'company_admin' ? 'super_admin' : 'company_admin')}
            title="Toggle perspective to test both Company Owner and Solution Provider permissions"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 border border-[#1f293d] transition-all"
          >
            <Wrench size={13} />
            Switch to {role === 'company_admin' ? 'Super Admin' : 'Company Admin'} View
          </button>
        </div>
      )}

      {/* Main Support Tickets View */}
      <SupportTickets
        currentUser={currentUser}
        categories={categories}
        systems={systems}
        onTicketCreated={onTicketCreated}
        onTicketClosed={onTicketClosed}
      />
    </div>
  );
};
